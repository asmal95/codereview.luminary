'use strict';

console.log('[BG] Background script loaded');

// Pending resolve callbacks waiting for contentScriptReady from a specific tab.
// Keyed by tabId; set up before executeScript so the signal is never missed.
const readyCallbacks = new Map();

/**
 * Send a message to a tab's content script.
 * If the content script isn't loaded yet, inject it and wait for its
 * contentScriptReady signal before sending (1 s fallback timeout).
 */
async function sendToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
    console.log('[BG] Message sent to tab', tabId);
    return;
  } catch (_) {
    console.log('[BG] Content script not ready in tab', tabId, '— injecting...');
  }

  // Register the ready callback BEFORE injecting to avoid a race where the
  // content script fires contentScriptReady before we start awaiting.
  const readyPromise = new Promise((resolve) => {
    const fallback = setTimeout(resolve, 1000);
    readyCallbacks.set(tabId, () => { clearTimeout(fallback); resolve(); });
  });

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await readyPromise;
    await chrome.tabs.sendMessage(tabId, payload);
    console.log('[BG] Message sent after injection to tab', tabId);
  } catch (err) {
    readyCallbacks.delete(tabId);
    console.error('[BG] Failed to inject/send to tab', tabId, err);
  }
}

// Create context menu for text selection
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'explainText',
    title: 'Объяснить с помощью AI',
    contexts: ['selection']
  });
  console.log('[BG] Context menu created');
});

// Debounce: avoid sending explainText twice (e.g. double context menu fire) so window doesn't reopen after close
let lastExplainSentAt = 0;
const EXPLAIN_DEBOUNCE_MS = 1500;

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[BG] ========== CONTEXT MENU CLICKED ==========');
  console.log('[BG] menuItemId:', info.menuItemId);
  console.log('[BG] Selected text:', info.selectionText?.substring(0, 50) + (info.selectionText?.length > 50 ? '...' : ''));
  
  if (info.menuItemId !== 'explainText' || !info.selectionText) return;

  const now = Date.now();
  const timeSinceLastExplain = now - lastExplainSentAt;
  console.log('[BG] Time since last explain:', timeSinceLastExplain, 'ms (threshold:', EXPLAIN_DEBOUNCE_MS, 'ms)');
  
  if (now - lastExplainSentAt < EXPLAIN_DEBOUNCE_MS) {
    console.log('[BG] ❌ Explain DEBOUNCED (ignoring duplicate)');
    return;
  }
  lastExplainSentAt = now;

  const payload = { action: 'explainText', text: info.selectionText, timestamp: now };
  console.log('[BG] ✅ Sending explainText message, timestamp:', now);

  await sendToTab(tab.id, payload);
});

// Handle clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[BG] Extension icon clicked, tab:', tab.id);
  
  const payload = { action: 'toggleFloatingWindow', timestamp: Date.now() };
  await sendToTab(tab.id, payload);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  readyCallbacks.delete(tabId);
});

// When the user navigates to a new URL in the same tab, any pending ready
// callback for that tab is no longer valid (the old content script is gone).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    readyCallbacks.delete(tabId);
  }
});

// Handle storage operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptReady') {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      console.log('[BG] contentScriptReady from tab', tabId);
      readyCallbacks.get(tabId)?.();
      readyCallbacks.delete(tabId);
    }
    return false;
  }

  if (request.action === 'getApiKey') {
    chrome.storage.sync.get([
      'openai_apikey', 
      'api_base_url', 
      'model',
      'api_timeout',
      'max_tokens',
      'temperature',
      'system_prompt',
      'review_prompt',
      'final_prompt',
      'explain_prompt'
    ], (items) => {
      sendResponse(items);
    });
    return true;
  }
  
  if (request.action === 'getCache') {
    chrome.storage.session.get([request.key], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'setCache') {
    chrome.storage.session.set({ [request.key]: request.value }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'removeCache') {
    chrome.storage.session.remove([request.key], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'fetchPatch') {
    console.log('[BG] Fetching patch from:', request.url);
    fetch(request.url)
      .then(response => {
        console.log('[BG] Patch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        console.log('[BG] Patch fetched successfully, length:', text.length);
        sendResponse({ success: true, data: text });
      })
      .catch(error => {
        console.error('[BG] Patch fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Handle streaming API requests via port
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'streaming-api') return;
  
  console.log('[BG] Port connected for streaming API');

  let activeAbortController = null;
  let pendingUserAbort = false;
  
  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'abortStream') {
      pendingUserAbort = true;
      activeAbortController?.abort();
      return;
    }

    if (msg.action !== 'streamRequest') return;
    
    const { url, method, headers, body } = msg;
    console.log('[BG] Starting streaming request to:', url);
    console.log('[BG] Request body length:', body?.length);

    const ac = new AbortController();
    activeAbortController = ac;
    if (pendingUserAbort) {
      pendingUserAbort = false;
      ac.abort();
    }

    let reader = null;
    let abortNotified = false;

    const finishAbort = () => {
      if (abortNotified) return;
      abortNotified = true;
      pendingUserAbort = false;
      port.postMessage({ type: 'aborted' });
    };

    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: headers || {},
        body: body || undefined,
        signal: ac.signal
      });
      
      console.log('[BG] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('[BG] Error response:', errorText);
        port.postMessage({
          type: 'error',
          error: `HTTP ${response.status}: ${response.statusText}`
        });
        return;
      }
      
      console.log('[BG] Starting to read stream...');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let rawLineCount = 0;
      
      while (true) {
        // Check abort signal before attempting next read (handles buffered-data race)
        if (ac.signal.aborted) {
          console.log('[BG] Abort signal detected before read, stopping');
          finishAbort();
          return;
        }

        let readResult;
        try {
          readResult = await reader.read();
        } catch (readErr) {
          if (ac.signal.aborted || readErr.name === 'AbortError') {
            console.log('[BG] Stream read aborted');
            finishAbort();
            return;
          }
          throw readErr;
        }
        const { done, value } = readResult;
        
        if (done) {
          console.log('[BG] Stream read completed, total chunks sent:', chunkCount);
          if (chunkCount === 0) {
            console.warn('[BG] WARNING: No chunks were sent! Buffer remaining:', buffer.slice(0, 200));
          }
          pendingUserAbort = false;
          port.postMessage({ type: 'done' });
          break;
        }
        
        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;
        
        // Log first raw data received
        if (rawLineCount === 0) {
          console.log('[BG] First raw data received (first 200 chars):', decoded.slice(0, 200));
        }
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          // Check abort inside line loop so buffered chunks don't drain after abort
          if (ac.signal.aborted) {
            console.log('[BG] Abort signal detected inside line loop, stopping');
            finishAbort();
            return;
          }

          rawLineCount++;
          
          // Log first few lines to understand format
          if (rawLineCount <= 3) {
            console.log(`[BG] Raw line ${rawLineCount}:`, line.slice(0, 150));
          }
          
          if (!line.trim()) continue;
          
          // Try SSE format (data: ...)
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log('[BG] [DONE] marker received, chunks sent:', chunkCount);
              pendingUserAbort = false;
              port.postMessage({ type: 'done' });
              return;
            }
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || '';
              const finishReason = json.choices?.[0]?.finish_reason;
              
              // Log finish reason when stream ends
              if (finishReason) {
                console.log('[BG] Stream finished with reason:', finishReason);
                console.log('[BG] Full chunk data:', JSON.stringify(json, null, 2));
              }
              
              if (content) {
                chunkCount++;
                port.postMessage({ type: 'chunk', content });
                
                if (chunkCount === 1) {
                  console.log('[BG] First chunk sent, content length:', content.length);
                }
                if (chunkCount % 50 === 0) {
                  console.log('[BG] Chunks sent:', chunkCount);
                }
              }
            } catch (e) {
              console.warn('[BG] Failed to parse SSE JSON:', data.slice(0, 100), 'Error:', e.message);
            }
          } else {
            // Try plain JSON format (Ollama might send without "data: " prefix)
            try {
              const json = JSON.parse(line);
              const content = json.choices?.[0]?.delta?.content || 
                             json.message?.content || 
                             json.response || '';
              
              if (content) {
                chunkCount++;
                port.postMessage({ type: 'chunk', content });
                
                if (chunkCount === 1) {
                  console.log('[BG] First chunk sent (plain JSON), content length:', content.length);
                }
                if (chunkCount % 50 === 0) {
                  console.log('[BG] Chunks sent:', chunkCount);
                }
              }
            } catch (e) {
              // Not JSON, skip silently (might be empty lines, etc)
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError' || ac.signal.aborted) {
        console.log('[BG] Stream aborted (fetch or signal)');
        finishAbort();
        return;
      }
      console.error('[BG] Stream error:', error);
      console.error('[BG] Error stack:', error.stack);
      port.postMessage({
        type: 'error',
        error: error.message || 'Connection error'
      });
    } finally {
      activeAbortController = null;
      if (reader) {
        try {
          await reader.cancel();
        } catch (_) {
          /* ignore */
        }
      }
    }
  });
  
  port.onDisconnect.addListener(() => {
    console.log('[BG] Port disconnected');
    if (chrome.runtime.lastError) {
      console.error('[BG] Port disconnect error:', chrome.runtime.lastError);
    }
  });
});
