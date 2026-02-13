'use strict';

import './styles.css';
import { parse } from 'node-html-parser';

var parsediff = require('parse-diff');

const showdown = require('showdown');
const converter = new showdown.Converter();

const spinner = `
  <svg aria-hidden="true" class="w-4 h-4 text-gray-200 animate-spin dark:text-slate-200 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
  </svg>
`;
const checkmark = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-600">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
`;
const xcircle = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-red-600">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
`;

class FloatingReviewWindow {
  constructor() {
    this.window = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.windowStartX = 0;
    this.windowStartY = 0;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.isMinimized = false;
    
    this.createWindow();
    this.loadState();
    this.attachEventListeners();
  }

  createWindow() {
    // Create floating window container
    const windowDiv = document.createElement('div');
    windowDiv.id = 'codereview-floating-window';
    windowDiv.className = 'codereview-floating-window';
    
    // Set initial size
    const initialWidth = Math.min(768, window.innerWidth * 0.9);
    const initialHeight = Math.min(768, window.innerHeight * 0.9);
    windowDiv.style.width = `${initialWidth}px`;
    windowDiv.style.height = `${initialHeight}px`;
    
    windowDiv.innerHTML = `
      <div class="codereview-window-header">
        <div class="codereview-window-title">codereview.luminary</div>
        <div class="codereview-window-controls">
          <button class="codereview-control-btn codereview-center-btn" title="Center window">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-minimize-btn" title="Minimize">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-close-btn" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="codereview-window-body">
        <div class="codereview-content">
          <div class="codereview-header-info">
            <div class="codereview-header-row">
              <div class="codereview-title-row">
                <span id="codeball-link" class="codereview-link" style="display: none;">(by <a href="https://javazen.ru"
                    target="_blank">javazen.ru</a>)</span>
              </div>
              <div id="rerun-btn" class="codereview-rerun-btn" style="display: none;">
                run again
              </div>
            </div>
            <div class="codereview-status-row">
              <span id="status-icon"></span>
              <span id="pr-url" class="codereview-pr-url"></span>
            </div>
          </div>
          <hr class="codereview-divider"/>
          <div class="codereview-result-container">
            <div id="result"></div>
          </div>
        </div>
      </div>
      <div class="codereview-resize-handle"></div>
    `;
    
    document.body.appendChild(windowDiv);
    this.window = windowDiv;
  }

  attachEventListeners() {
    const header = this.window.querySelector('.codereview-window-header');
    const closeBtn = this.window.querySelector('.codereview-close-btn');
    const minimizeBtn = this.window.querySelector('.codereview-minimize-btn');
    const centerBtn = this.window.querySelector('.codereview-center-btn');
    const resizeHandle = this.window.querySelector('.codereview-resize-handle');

    // Drag functionality
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.codereview-window-controls')) return;
      this.startDragging(e);
    });

    // Close button
    closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // Minimize button
    minimizeBtn.addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    // Center button
    centerBtn.addEventListener('click', () => {
      this.centerWindow();
      this.saveState();
    });

    // Resize functionality
    resizeHandle.addEventListener('mousedown', (e) => {
      this.startResizing(e);
    });

    // Global mouse move and up listeners
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.drag(e);
      } else if (this.isResizing) {
        this.resize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.stopDragging();
      } else if (this.isResizing) {
        this.stopResizing();
      }
    });

    // Run again button - force new review by clearing cache first
    const rerunBtn = this.window.querySelector('#rerun-btn');
    rerunBtn.addEventListener('click', async () => {
      // Clear cache and force new review
      const prUrl = window.location.href;
      let diffPath;
      const tokens = prUrl.split('/');
      
      if (tokens[2] === 'github.com' && tokens[5] === 'pull') {
        diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.patch`;
      } else if (prUrl.includes('/-/merge_requests/')) {
        diffPath = prUrl + '.patch';
      }
      
      if (diffPath) {
        // Clear cache
        try {
          await chrome.storage.session.remove([diffPath]);
        } catch (e) {
          await chrome.runtime.sendMessage({ action: 'removeCache', key: diffPath }).catch(() => {});
        }
      }
      
      this.runReview();
    });
  }

  startDragging(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;
    this.window.style.cursor = 'grabbing';
  }

  drag(e) {
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    let newX = this.windowStartX + deltaX;
    let newY = this.windowStartY + deltaY;
    
    // Get window dimensions
    const rect = this.window.getBoundingClientRect();
    const minVisible = 100; // Keep at least 100px visible
    
    // Constrain horizontal movement
    const maxLeft = window.innerWidth - minVisible;
    const minLeft = -rect.width + minVisible;
    newX = Math.max(minLeft, Math.min(newX, maxLeft));
    
    // Constrain vertical movement
    const maxTop = window.innerHeight - 60; // At least header visible
    const minTop = 0;
    newY = Math.max(minTop, Math.min(newY, maxTop));
    
    this.window.style.left = `${newX}px`;
    this.window.style.top = `${newY}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  stopDragging() {
    this.isDragging = false;
    this.window.style.cursor = '';
    this.saveState();
  }

  startResizing(e) {
    e.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
  }

  resize(e) {
    const deltaX = e.clientX - this.resizeStartX;
    const deltaY = e.clientY - this.resizeStartY;
    const newWidth = Math.max(400, this.resizeStartWidth + deltaX);
    const newHeight = Math.max(300, this.resizeStartHeight + deltaY);
    
    this.window.style.width = `${newWidth}px`;
    this.window.style.height = `${newHeight}px`;
  }

  stopResizing() {
    this.isResizing = false;
    this.saveState();
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.window.classList.add('codereview-minimized');
    } else {
      this.window.classList.remove('codereview-minimized');
    }
    this.saveState();
  }

  show() {
    // Always verify window position before showing
    const currentLeft = parseFloat(this.window.style.left) || 0;
    const currentTop = parseFloat(this.window.style.top) || 0;
    const currentWidth = parseFloat(this.window.style.width) || 768;
    const currentHeight = parseFloat(this.window.style.height) || 768;
    
    // Check if position is valid
    if (currentLeft === 0 && currentTop === 0) {
      // Never positioned, center it
      this.centerWindow();
    } else {
      // Verify window is still in bounds
      const safe = this.ensureWindowInBounds({
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        height: currentHeight
      });
      
      this.window.style.left = `${safe.left}px`;
      this.window.style.top = `${safe.top}px`;
      this.window.style.width = `${safe.width}px`;
      this.window.style.height = `${safe.height}px`;
    }
    
    this.window.style.display = 'flex';
    this.runReview();
  }

  hide() {
    this.window.style.display = 'none';
    this.saveState();
  }

  toggle() {
    if (this.window.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  saveState() {
    const rect = this.window.getBoundingClientRect();
    const state = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      isMinimized: this.isMinimized,
      isVisible: this.window.style.display !== 'none'
    };
    localStorage.setItem('codereview-window-state', JSON.stringify(state));
  }

  loadState() {
    const stateStr = localStorage.getItem('codereview-window-state');
    let hasValidState = false;
    
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        
        // Validate state has required properties
        if (state.left !== undefined && state.top !== undefined && 
            state.width !== undefined && state.height !== undefined) {
          
          // Ensure window is within viewport bounds
          const safeState = this.ensureWindowInBounds({
            left: state.left,
            top: state.top,
            width: state.width,
            height: state.height
          });
          
          this.window.style.left = `${safeState.left}px`;
          this.window.style.top = `${safeState.top}px`;
          this.window.style.width = `${safeState.width}px`;
          this.window.style.height = `${safeState.height}px`;
          
          hasValidState = true;
          
          if (state.isMinimized) {
            this.isMinimized = true;
            this.window.classList.add('codereview-minimized');
          }
        }
      } catch (e) {
        console.error('Failed to load window state:', e);
      }
    }
    
    // If no valid state, center the window
    if (!hasValidState) {
      this.centerWindow();
    }
    
    // Always start hidden
    this.window.style.display = 'none';
  }
  
  ensureWindowInBounds(rect) {
    const margin = 20; // Minimum margin from edges
    const minWidth = 400;
    const minHeight = 300;
    
    // Constrain size to viewport
    let width = Math.max(minWidth, Math.min(rect.width, window.innerWidth - margin * 2));
    let height = Math.max(minHeight, Math.min(rect.height, window.innerHeight - margin * 2));
    
    // Constrain position
    let left = rect.left;
    let top = rect.top;
    
    // Don't let window go beyond left edge
    left = Math.max(margin, left);
    
    // Don't let window go beyond top edge  
    top = Math.max(margin, top);
    
    // Don't let window go beyond right edge
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    
    // Don't let window go beyond bottom edge
    if (top + height > window.innerHeight - margin) {
      top = window.innerHeight - height - margin;
    }
    
    // Final safety check
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    
    return { left, top, width, height };
  }
  
  centerWindow() {
    const width = Math.min(768, window.innerWidth - 40); // 48rem = 768px
    const height = Math.min(768, window.innerHeight - 40);
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    this.window.style.width = `${width}px`;
    this.window.style.height = `${height}px`;
    this.window.style.left = `${left}px`;
    this.window.style.top = `${top}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  // Review logic from popup.js
  inProgress(ongoing, failed = false, rerun = true) {
    const statusIcon = this.window.querySelector('#status-icon');
    const rerunBtn = this.window.querySelector('#rerun-btn');
    const codeballLink = this.window.querySelector('#codeball-link');
    
    if (ongoing) {
      statusIcon.innerHTML = spinner;
      rerunBtn.style.display = 'none';
      codeballLink.style.display = 'none';
    } else {
      if (failed) {
        statusIcon.innerHTML = xcircle;
      } else {
        statusIcon.innerHTML = checkmark;
      }
      if (rerun) {
        rerunBtn.style.display = 'block';
        codeballLink.style.display = 'inline';
      }
    }
  }

  async getConfig() {
    let options;
    
    try {
      options = await new Promise((resolve) => {
        chrome.storage.sync.get([
          'openai_apikey', 
          'api_base_url', 
          'model',
          'system_prompt',
          'review_prompt',
          'final_prompt'
        ], resolve);
      });
    } catch (e) {
      options = await chrome.runtime.sendMessage({ action: 'getApiKey' });
    }
    
    const isLocalhost = options.api_base_url?.includes('localhost') || 
                       options.api_base_url?.includes('127.0.0.1');
    
    const apiKey = isLocalhost ? 'ollama' : options.openai_apikey;
    const baseUrl = options.api_base_url || 'https://api.openai.com/v1';
    const model = options.model || 'gpt-3.5-turbo';
    
    // Get custom prompts or use defaults
    const systemPrompt = options.system_prompt || 'You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.';
    const reviewPrompt = options.review_prompt || `The change has the following title: {title}.

Your task is:
- Review the code changes and provide feedback.
- If there are any bugs, highlight them.
- Provide details on missed use of best-practices.
- Does the code do what it says in the commit messages?
- Do not highlight minor issues and nitpicks.
- Use bullet points if you have multiple comments.
- Provide security recommendations if there are any.

You are provided with the code changes (diffs) in a unidiff format.
Do not provide feedback yet. I will follow-up with a description of the change in a new message.`;
    const finalPrompt = options.final_prompt || 'All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Provide response in Russian language.';
    
    if (!isLocalhost && !apiKey) {
      throw new Error('UNAUTHORIZED');
    }
    
    console.log('[CS] Config:', {
      apiKey: isLocalhost ? 'dummy' : `***${apiKey.slice(-4)}`,
      baseUrl,
      model
    });
    
    return { apiKey, baseUrl, model, systemPrompt, reviewPrompt, finalPrompt };
  }

  async callChatGPT(messages, callback, onDone) {
    let config;
    try {
      config = await this.getConfig();
    } catch (e) {
      console.error('[CS] Failed to get config:', e);
      callback('Please add your API key in extension settings (right-click extension icon → Options)');
      onDone();
      return;
    }

    const systemMessage = {
      role: 'system',
      content: config.systemPrompt
    };

    const apiMessages = [systemMessage, ...messages.map(msg => ({
      role: 'user',
      content: msg
    }))];

    const requestBody = {
      model: config.model,
      messages: apiMessages,
      stream: true
    };

    const url = `${config.baseUrl}/chat/completions`;
    console.log('[CS] Starting streaming request to:', url);

    const port = chrome.runtime.connect({ name: 'streaming-api' });
    let fullResponse = '';
    let chunkCount = 0;
    let isCompleted = false;
    
    // Timeout для случая зависания (5 минут)
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error('[CS] Streaming timeout after 5 minutes');
        port.disconnect();
        callback(fullResponse || 'Error: Request timeout. The API took too long to respond.');
        onDone();
      }
    }, 5 * 60 * 1000);

    console.log('[CS] Sending request with', apiMessages.length, 'messages');
    
    port.postMessage({
      action: 'streamRequest',
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    port.onMessage.addListener((msg) => {
      console.log('[CS] Received message type:', msg.type);
      
      if (msg.type === 'chunk') {
        chunkCount++;
        fullResponse += msg.content;
        callback(fullResponse);
        
        if (chunkCount === 1) {
          console.log('[CS] First chunk received, streaming started');
        }
        if (chunkCount % 10 === 0) {
          console.log(`[CS] Received ${chunkCount} chunks, length: ${fullResponse.length}`);
        }
      } else if (msg.type === 'done') {
        console.log(`[CS] Stream completed, total chunks: ${chunkCount}, response length: ${fullResponse.length}`);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        onDone();
      } else if (msg.type === 'error') {
        console.error('[CS] Stream error:', msg.error);
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        
        let errorMessage = `Error: ${msg.error}`;
        errorMessage += '\n\nTroubleshooting:\n';
        errorMessage += '- Check browser console (F12) for details\n';
        errorMessage += '- Verify your API key and settings\n';
        errorMessage += `- API URL: ${config.baseUrl}\n`;
        
        callback(errorMessage);
        onDone();
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[CS] Port disconnected, completed:', isCompleted, 'chunks:', chunkCount);
      
      if (!isCompleted) {
        console.warn('[CS] Port disconnected before completion!');
        clearTimeout(timeout);
        
        if (fullResponse) {
          console.log('[CS] Showing partial response, length:', fullResponse.length);
          callback(fullResponse + '\n\n[Warning: Connection lost, showing partial response]');
        } else {
          callback('Error: Connection lost before receiving any data. Check background script console.');
        }
        onDone();
      }
    });
  }

  async reviewPR(diffPath, context, title) {
    this.inProgress(true);
    const resultDiv = this.window.querySelector('#result');
    resultDiv.innerHTML = '';
    
    try {
      await chrome.storage.session.remove([diffPath]);
    } catch (e) {
      await chrome.runtime.sendMessage({ action: 'removeCache', key: diffPath }).catch(() => {});
    }

    // Get config for custom prompts
    let config;
    try {
      config = await this.getConfig();
    } catch (e) {
      console.error('[CS] Failed to get config for prompts:', e);
      resultDiv.innerHTML = 'Error: Failed to load configuration. Please check extension settings.';
      this.inProgress(false, true, false);
      return;
    }

    let promptArray = [];
    let patch;
    
    // Fetch patch via background script to avoid CORS issues
    try {
      console.log('[CS] Fetching patch from:', diffPath);
      const patchResponse = await chrome.runtime.sendMessage({ 
        action: 'fetchPatch', 
        url: diffPath 
      });
      
      if (!patchResponse || !patchResponse.success) {
        const errorMsg = patchResponse?.error || 'Unknown error';
        console.error('[CS] Failed to fetch patch:', errorMsg);
        resultDiv.innerHTML = `Error: Failed to fetch patch file.<br><br>${errorMsg}<br><br>Please check if the URL is correct: ${diffPath}`;
        this.inProgress(false, true, false);
        return;
      }
      
      patch = patchResponse.data;
      console.log('[CS] Patch fetched successfully, length:', patch.length);
    } catch (error) {
      console.error('[CS] Exception while fetching patch:', error);
      resultDiv.innerHTML = `Error: Failed to fetch patch file.<br><br>${error.message}<br><br>Please check if the URL is correct: ${diffPath}`;
      this.inProgress(false, true, false);
      return;
    }
    
    let warning = '';
    let patchParts = [];

    // Use custom review prompt with variable substitution
    const reviewPromptWithVars = config.reviewPrompt
      .replace(/{title}/g, title);
    promptArray.push(reviewPromptWithVars);

    // Add context description
    promptArray.push(`A description was given to help you assist in understand why these changes were made.
    The description was provided in a markdown format. Do not provide feedback yet. I will follow-up with the code changes in diff format in a new message.

    ${context}`);

    const regex = /GIT\sbinary\spatch(.*)literal\s0/mgis;
    patch = patch.replace(regex, '');

    var files = parsediff(patch);

    files.forEach(function(file) {
      if (file.from.includes('lock.json')) {
        return;
      }

      var patchPartArray = [];

      patchPartArray.push('```diff');
      if ('from' in file && 'to' in file) {
        patchPartArray.push('diff --git a' + file.from + ' b'+ file.to);
      }
      if ('new' in file && file.new === true && 'newMode' in file) {
        patchPartArray.push('new file mode ' + file.newMode);
      }
      if ('from' in file) {
        patchPartArray.push('--- ' + file.from);
      }
      if ('to' in file) {
        patchPartArray.push('+++ ' + file.to);
      }
      if ('chunks' in file) {
        patchPartArray.push(file.chunks.map(c => c.changes.map(t => t.content).join('\n')));
      }
      patchPartArray.push('```');
      patchPartArray.push('\nDo not provide feedback yet. I will confirm once all code changes were submitted.');

      var patchPart = patchPartArray.join('\n');
      if (patchPart.length >= 15384) {
        patchPart = patchPart.slice(0, 15384);
        warning = 'Some parts of your patch were truncated as it was larger than 4096 tokens or 15384 characters. The review might not be as complete.';
      }
      patchParts.push(patchPart);
    });

    patchParts.forEach(part => {
      promptArray.push(part);
    });

    // Use custom final prompt
    promptArray.push(config.finalPrompt);

    this.callChatGPT(
      promptArray,
      (answer) => {
        resultDiv.innerHTML = converter.makeHtml(answer + ' \n\n' + warning);
      },
      () => {
        chrome.storage.session.set({ [diffPath]: resultDiv.innerHTML })
          .catch(() => chrome.runtime.sendMessage({ 
            action: 'setCache', 
            key: diffPath, 
            value: resultDiv.innerHTML 
          }))
          .catch(() => {});
        
        this.inProgress(false);
      }
    );
  }

  async runReview() {
    const prUrl = this.window.querySelector('#pr-url');
    prUrl.textContent = window.location.href;

    let diffPath;
    let provider = '';
    let error = null;
    let tokens = window.location.href.split('/');
    let context = '';
    let title = document.title;

    // Detect provider
    const isGitLabMeta = document.querySelectorAll('meta[content="GitLab"]').length;

    if (tokens[2] === 'github.com') {
      provider = 'GitHub';
    } else if (isGitLabMeta === 1) {
      provider = 'GitLab';
    }

    if (provider === 'GitHub' && tokens[5] === 'pull') {
      diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.patch`;
      
      const element = document.querySelector('.markdown-body');
      if (element) {
        context = element.textContent;
      }
    } else if (provider === 'GitLab' && window.location.href.includes('/-/merge_requests/')) {
      diffPath = window.location.href + '.patch';
      
      const element = document.querySelector('.description textarea');
      if (element) {
        context = element.getAttribute('data-value') || '';
      }
    } else {
      if (provider) {
        error = 'Please open a specific Pull Request or Merge Request on ' + provider;
      } else {
        error = 'Only GitHub or GitLab (SaaS & self-hosted) are supported.';
      }
    }

    const resultDiv = this.window.querySelector('#result');
    
    if (error != null) {
      resultDiv.innerHTML = error;
      this.inProgress(false, true, false);
      return;
    }

    this.inProgress(true);

    chrome.storage.session.get([diffPath])
      .then((result) => {
        if (result[diffPath]) {
          resultDiv.innerHTML = result[diffPath];
          this.inProgress(false);
        } else {
          this.reviewPR(diffPath, context, title);
        }
      })
      .catch(() => chrome.runtime.sendMessage({ action: 'getCache', key: diffPath }))
      .then((result) => {
        if (result?.[diffPath]) {
          resultDiv.innerHTML = result[diffPath];
          this.inProgress(false);
        } else {
          this.reviewPR(diffPath, context, title);
        }
      })
      .catch(() => {
        this.reviewPR(diffPath, context, title);
      });
  }
}

class FloatingExplainWindow {
  constructor() {
    this.window = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.windowStartX = 0;
    this.windowStartY = 0;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.isMinimized = false;
    this.selectedText = '';
    
    this.createWindow();
    this.attachEventListeners();
  }

  createWindow() {
    const windowDiv = document.createElement('div');
    windowDiv.id = 'codereview-explain-window';
    windowDiv.className = 'codereview-floating-window codereview-explain-window';
    
    const initialWidth = Math.min(600, window.innerWidth * 0.9);
    const initialHeight = Math.min(600, window.innerHeight * 0.9);
    windowDiv.style.width = `${initialWidth}px`;
    windowDiv.style.height = `${initialHeight}px`;
    
    windowDiv.innerHTML = `
      <div class="codereview-window-header">
        <div class="codereview-window-title">🤖 AI Объяснение</div>
        <div class="codereview-window-controls">
          <button class="codereview-control-btn codereview-center-btn" title="Center window">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-minimize-btn" title="Minimize">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <button class="codereview-control-btn codereview-close-btn" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="codereview-window-body">
        <div class="codereview-explain-content">
          <div class="codereview-explain-section">
            <label class="codereview-explain-label">Выделенный текст:</label>
            <div class="codereview-explain-selected-text" id="explain-selected-text"></div>
          </div>
          
          <div class="codereview-explain-section">
            <label class="codereview-explain-label">Ваш вопрос (необязательно):</label>
            <textarea 
              class="codereview-explain-input" 
              id="explain-question-input" 
              placeholder="Например: 'Что делает эта функция?' или 'Объясни простыми словами'"
              rows="3"
            ></textarea>
          </div>
          
          <div class="codereview-explain-actions">
            <button class="codereview-explain-btn" id="explain-submit-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Объяснить
            </button>
          </div>
          
          <div class="codereview-explain-section" id="explain-result-section" style="display: none;">
            <label class="codereview-explain-label">
              <span id="explain-status-icon"></span>
              Ответ AI:
            </label>
            <div class="codereview-explain-result" id="explain-result"></div>
          </div>
        </div>
      </div>
      <div class="codereview-resize-handle"></div>
    `;
    
    document.body.appendChild(windowDiv);
    this.window = windowDiv;
  }

  attachEventListeners() {
    const header = this.window.querySelector('.codereview-window-header');
    const closeBtn = this.window.querySelector('.codereview-close-btn');
    const minimizeBtn = this.window.querySelector('.codereview-minimize-btn');
    const centerBtn = this.window.querySelector('.codereview-center-btn');
    const resizeHandle = this.window.querySelector('.codereview-resize-handle');
    const submitBtn = this.window.querySelector('#explain-submit-btn');
    const questionInput = this.window.querySelector('#explain-question-input');

    // Drag functionality
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.codereview-window-controls')) return;
      this.startDragging(e);
    });

    closeBtn.addEventListener('click', () => this.hide());
    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    centerBtn.addEventListener('click', () => {
      this.centerWindow();
      this.saveState();
    });

    // Resize functionality
    resizeHandle.addEventListener('mousedown', (e) => {
      this.startResizing(e);
    });

    // Global mouse listeners
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.drag(e);
      } else if (this.isResizing) {
        this.resize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.stopDragging();
      } else if (this.isResizing) {
        this.stopResizing();
      }
    });

    // Submit button
    submitBtn.addEventListener('click', () => {
      this.explainText();
    });
    
    // Enter key in textarea (Ctrl+Enter to submit)
    questionInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.explainText();
      }
    });
  }

  startDragging(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.windowStartX = rect.left;
    this.windowStartY = rect.top;
    this.window.style.cursor = 'grabbing';
  }

  drag(e) {
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    let newX = this.windowStartX + deltaX;
    let newY = this.windowStartY + deltaY;
    
    const rect = this.window.getBoundingClientRect();
    const minVisible = 100;
    
    const maxLeft = window.innerWidth - minVisible;
    const minLeft = -rect.width + minVisible;
    newX = Math.max(minLeft, Math.min(newX, maxLeft));
    
    const maxTop = window.innerHeight - 60;
    const minTop = 0;
    newY = Math.max(minTop, Math.min(newY, maxTop));
    
    this.window.style.left = `${newX}px`;
    this.window.style.top = `${newY}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  stopDragging() {
    this.isDragging = false;
    this.window.style.cursor = '';
    this.saveState();
  }

  startResizing(e) {
    e.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    const rect = this.window.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
  }

  resize(e) {
    const deltaX = e.clientX - this.resizeStartX;
    const deltaY = e.clientY - this.resizeStartY;
    const newWidth = Math.max(400, this.resizeStartWidth + deltaX);
    const newHeight = Math.max(300, this.resizeStartHeight + deltaY);
    
    this.window.style.width = `${newWidth}px`;
    this.window.style.height = `${newHeight}px`;
  }

  stopResizing() {
    this.isResizing = false;
    this.saveState();
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.window.classList.add('codereview-minimized');
    } else {
      this.window.classList.remove('codereview-minimized');
    }
    this.saveState();
  }

  centerWindow() {
    const width = Math.min(600, window.innerWidth - 40);
    const height = Math.min(600, window.innerHeight - 40);
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    this.window.style.width = `${width}px`;
    this.window.style.height = `${height}px`;
    this.window.style.left = `${left}px`;
    this.window.style.top = `${top}px`;
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  saveState() {
    const rect = this.window.getBoundingClientRect();
    const state = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      isMinimized: this.isMinimized
    };
    localStorage.setItem('codereview-explain-window-state', JSON.stringify(state));
  }

  loadState() {
    const stateStr = localStorage.getItem('codereview-explain-window-state');
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        if (state.left !== undefined && state.top !== undefined) {
          this.window.style.left = `${state.left}px`;
          this.window.style.top = `${state.top}px`;
          this.window.style.width = `${state.width}px`;
          this.window.style.height = `${state.height}px`;
          
          if (state.isMinimized) {
            this.isMinimized = true;
            this.window.classList.add('codereview-minimized');
          }
        }
      } catch (e) {
        console.error('[CS] Failed to load explain window state:', e);
      }
    }
  }

  show(text) {
    this.selectedText = text;
    const selectedTextDiv = this.window.querySelector('#explain-selected-text');
    selectedTextDiv.textContent = text;
    
    // Reset question and result
    const questionInput = this.window.querySelector('#explain-question-input');
    questionInput.value = '';
    
    const resultSection = this.window.querySelector('#explain-result-section');
    resultSection.style.display = 'none';
    
    const resultDiv = this.window.querySelector('#explain-result');
    resultDiv.innerHTML = '';
    
    // Center on first show or load state
    if (!this.window.style.left || this.window.style.left === '0px') {
      this.centerWindow();
    } else {
      this.loadState();
    }
    
    this.window.style.display = 'flex';
    
    // Focus on question input
    setTimeout(() => {
      questionInput.focus();
    }, 100);
  }

  hide() {
    this.window.style.display = 'none';
    this.saveState();
  }

  setStatus(icon) {
    const statusIcon = this.window.querySelector('#explain-status-icon');
    statusIcon.innerHTML = icon;
  }

  async getConfig() {
    let options;
    
    try {
      options = await new Promise((resolve) => {
        chrome.storage.sync.get([
          'openai_apikey', 
          'api_base_url', 
          'model',
          'system_prompt',
          'explain_prompt'
        ], resolve);
      });
    } catch (e) {
      options = await chrome.runtime.sendMessage({ action: 'getApiKey' });
    }
    
    const isLocalhost = options.api_base_url?.includes('localhost') || 
                       options.api_base_url?.includes('127.0.0.1');
    
    const apiKey = isLocalhost ? 'ollama' : options.openai_apikey;
    const baseUrl = options.api_base_url || 'https://api.openai.com/v1';
    const model = options.model || 'gpt-3.5-turbo';
    const systemPrompt = options.system_prompt || 'You are a helpful AI assistant.';
    const explainPrompt = options.explain_prompt || `Ты полезный AI ассистент. Твоя задача - объяснить выделенный текст понятно и на русском языке.

Выделенный текст:
{text}

{question}

Требования к ответу:
- Объясняй понятно и структурировано
- Используй примеры, где это уместно
- Если это код, объясни что он делает и как работает
- Если есть потенциальные проблемы или улучшения, укажи на них
- Отвечай на русском языке
- Будь кратким, но информативным`;
    
    if (!isLocalhost && !apiKey) {
      throw new Error('UNAUTHORIZED');
    }
    
    return { apiKey, baseUrl, model, systemPrompt, explainPrompt };
  }

  async callChatGPT(messages, callback, onDone) {
    let config;
    try {
      config = await this.getConfig();
    } catch (e) {
      console.error('[CS] Failed to get config:', e);
      callback('Пожалуйста, добавьте API ключ в настройках расширения');
      onDone();
      return;
    }

    const systemMessage = {
      role: 'system',
      content: 'Ты полезный AI ассистент. Объясняй понятно и на русском языке.'
    };

    const apiMessages = [systemMessage, ...messages];

    const requestBody = {
      model: config.model,
      messages: apiMessages,
      stream: true
    };

    const url = `${config.baseUrl}/chat/completions`;
    console.log('[CS] Starting explain request to:', url);

    const port = chrome.runtime.connect({ name: 'streaming-api' });
    let fullResponse = '';
    let isCompleted = false;
    
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error('[CS] Explain timeout');
        port.disconnect();
        callback(fullResponse || 'Ошибка: превышено время ожидания ответа.');
        onDone();
      }
    }, 5 * 60 * 1000);
    
    port.postMessage({
      action: 'streamRequest',
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    port.onMessage.addListener((msg) => {
      if (msg.type === 'chunk') {
        fullResponse += msg.content;
        callback(fullResponse);
      } else if (msg.type === 'done') {
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        onDone();
      } else if (msg.type === 'error') {
        isCompleted = true;
        clearTimeout(timeout);
        port.disconnect();
        callback(`Ошибка: ${msg.error}`);
        onDone();
      }
    });

    port.onDisconnect.addListener(() => {
      if (!isCompleted) {
        clearTimeout(timeout);
        if (fullResponse) {
          callback(fullResponse + '\n\n[Предупреждение: соединение потеряно]');
        } else {
          callback('Ошибка: соединение потеряно.');
        }
        onDone();
      }
    });
  }

  async explainText() {
    const questionInput = this.window.querySelector('#explain-question-input');
    const resultSection = this.window.querySelector('#explain-result-section');
    const resultDiv = this.window.querySelector('#explain-result');
    const submitBtn = this.window.querySelector('#explain-submit-btn');
    
    const additionalQuestion = questionInput.value.trim();
    
    // Show result section
    resultSection.style.display = 'block';
    resultDiv.innerHTML = '';
    
    // Set loading state
    this.setStatus(spinner);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Думаю...';
    
    // Get config with custom prompt
    let config;
    try {
      config = await this.getConfig();
    } catch (e) {
      console.error('[CS] Failed to get config for explain:', e);
      resultDiv.innerHTML = 'Ошибка: не удалось загрузить конфигурацию. Проверьте настройки расширения.';
      this.setStatus(xcircle);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
        Объяснить
      `;
      return;
    }
    
    // Build prompt using custom template with variable substitution
    let userPrompt = config.explainPrompt
      .replace(/{text}/g, this.selectedText)
      .replace(/{question}/g, additionalQuestion ? `Дополнительный вопрос: ${additionalQuestion}` : '');
    
    const messages = [
      { role: 'user', content: userPrompt }
    ];
    
    await this.callChatGPT(
      messages,
      (answer) => {
        resultDiv.innerHTML = converter.makeHtml(answer);
      },
      () => {
        this.setStatus(checkmark);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          Объяснить
        `;
      }
    );
  }
}

// Initialize floating window
let floatingWindow = null;
let explainWindow = null;

console.log('[CS] Content script loaded on:', window.location.href);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'toggleFloatingWindow') {
    console.log('[CS] Toggling floating window');
    if (!floatingWindow) {
      floatingWindow = new FloatingReviewWindow();
    }
    floatingWindow.toggle();
  } else if (request.action === 'explainText') {
    console.log('[CS] Explain text requested, text length:', request.text?.length);
    if (!explainWindow) {
      explainWindow = new FloatingExplainWindow();
    }
    explainWindow.show(request.text);
  }
  return true;
});

// Handle window resize
window.addEventListener('resize', () => {
  if (floatingWindow && floatingWindow.window.style.display !== 'none') {
    const rect = floatingWindow.window.getBoundingClientRect();
    const safe = floatingWindow.ensureWindowInBounds(rect);
    Object.assign(floatingWindow.window.style, {
      left: `${safe.left}px`,
      top: `${safe.top}px`,
      width: `${safe.width}px`,
      height: `${safe.height}px`
    });
  }
});
