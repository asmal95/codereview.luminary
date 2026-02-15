/**
 * API Client for streaming requests via Chrome Runtime Ports
 */
export class ApiClient {
  /**
   * Call ChatGPT API with streaming support
   * @param {Object} config - API configuration (apiKey, baseUrl, model, apiTimeout)
   * @param {Array} messages - Array of message objects with role and content
   * @param {Function} onChunk - Callback for each chunk (receives accumulated response)
   * @param {Function} onDone - Callback when done
   * @param {Function} onError - Callback on error
   */
  static async streamRequest(config, messages, onChunk, onDone, onError) {
    const requestBody = {
      model: config.model,
      messages: messages,
      stream: true
    };

    const url = `${config.baseUrl}/chat/completions`;
    const timeoutMs = config.apiTimeout || 300000; // Default 5 minutes
    console.log('[CS] Starting streaming request to:', url, `timeout: ${timeoutMs}ms`);

    const port = chrome.runtime.connect({ name: 'streaming-api' });
    let fullResponse = '';
    let chunkCount = 0;
    let isCompleted = false;
    
    // Timeout handler
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error(`[CS] Streaming timeout after ${timeoutMs}ms`);
        port.disconnect();
        const errorMsg = fullResponse || 'Error: Request timeout. The API took too long to respond.';
        if (onError) onError(errorMsg);
      }
    }, timeoutMs);

    console.log('[CS] Sending request with', messages.length, 'messages');
    
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
        if (onChunk) onChunk(fullResponse);
        
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
        if (onDone) onDone();
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
        
        if (onError) onError(errorMessage);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[CS] Port disconnected, completed:', isCompleted, 'chunks:', chunkCount);
      
      if (!isCompleted) {
        console.warn('[CS] Port disconnected before completion!');
        clearTimeout(timeout);
        
        const errorMsg = fullResponse 
          ? fullResponse + '\n\n[Warning: Connection lost, showing partial response]'
          : 'Error: Connection lost before receiving any data. Check background script console.';
        
        if (onError) onError(errorMsg);
      }
    });
  }
}
