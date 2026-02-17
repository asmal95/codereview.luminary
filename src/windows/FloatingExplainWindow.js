import { BaseFloatingWindow } from './BaseFloatingWindow.js';
import { ApiClient } from '../api/ApiClient.js';
import { getConfig } from '../utils/config.js';
import { spinner, checkmark, xcircle } from '../utils/constants.js';

const showdown = require('showdown');
const converter = new showdown.Converter();

export class FloatingExplainWindow extends BaseFloatingWindow {
  constructor() {
    super('codereview-explain-window', 'codereview-explain-window');
    this.selectedText = '';
    this.messages = []; // Chat history: [{role: 'user'|'assistant', content: string}]
    this.state = 'IDLE'; // IDLE | LOADING | STREAMING | COMPLETED | ERROR
    this.lastResult = '';
    this.streamRequestId = 0;
    this.lastHideTime = 0; // Track when window was closed
    this.wasHidden = true; // Track if window was hidden (should clear history on show)
    this.createWindow(600, 600);
    this.loadState();
  }

  createWindowContent() {
    return `
      <div class="codereview-window-header">
        <div class="codereview-window-title">💬 AI Чат</div>
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
        <!-- Context panel (collapsible) -->
        <div class="codereview-context-section" id="context-section">
          <div class="codereview-context-header" id="context-header">
            <span>📋 Контекст кода</span>
            <span class="codereview-toggle-icon">▼</span>
          </div>
          <div class="codereview-context-content" id="explain-context"></div>
        </div>
        
        <!-- Chat messages (scrollable) -->
        <div class="codereview-chat-messages" id="explain-messages"></div>
        
        <!-- Fixed input area at bottom -->
        <div class="codereview-chat-input-area">
          <textarea 
            id="explain-question-input"
            placeholder="Задайте вопрос о коде (можно оставить пустым для общего объяснения)..."
            rows="2"
          ></textarea>
          <button class="codereview-explain-btn" id="explain-submit-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Отправить
          </button>
        </div>
      </div>
      <div class="codereview-resize-handle"></div>
    `;
  }

  attachEventListeners() {
    super.attachEventListeners();

    const submitBtn = this.window.querySelector('#explain-submit-btn');
    const questionInput = this.window.querySelector('#explain-question-input');
    const contextHeader = this.window.querySelector('#context-header');

    // Submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.explainText();
      });
    }
    
    // Enter key in textarea (Enter to submit, Shift+Enter for new line)
    if (questionInput) {
      questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.explainText();
        }
      });
    }
    
    // Toggle context panel
    if (contextHeader) {
      contextHeader.addEventListener('click', () => {
        this.toggleContext();
      });
    }
  }

  // Clear chat history
  clearChat() {
    this.messages = [];
    const messagesContainer = this.window?.querySelector('#explain-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }

  // Render a single message and return the DOM element
  renderMessage(role, content, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `codereview-message codereview-message-${role}`;
    
    if (role === 'assistant') {
      // For assistant messages, render markdown
      messageDiv.innerHTML = content ? converter.makeHtml(content) : '';
      if (isStreaming) {
        messageDiv.classList.add('streaming');
      }
    } else {
      // For user messages, render as plain text
      messageDiv.textContent = content;
    }
    
    return messageDiv;
  }

  // Add message to history and render it
  addMessage(role, content) {
    this.messages.push({ role, content });
    
    const messagesContainer = this.window?.querySelector('#explain-messages');
    if (messagesContainer) {
      const messageElement = this.renderMessage(role, content);
      messagesContainer.appendChild(messageElement);
      this.scrollToBottom();
    }
  }

  // Scroll chat messages to bottom
  scrollToBottom() {
    const messagesContainer = this.window?.querySelector('#explain-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Toggle context panel collapsed state
  toggleContext() {
    const contextSection = this.window?.querySelector('#context-section');
    const toggleIcon = this.window?.querySelector('.codereview-toggle-icon');
    
    if (contextSection) {
      contextSection.classList.toggle('collapsed');
      if (toggleIcon) {
        toggleIcon.textContent = contextSection.classList.contains('collapsed') ? '▶' : '▼';
      }
    }
  }

  // Collapse context panel
  collapseContext() {
    const contextSection = this.window?.querySelector('#context-section');
    const toggleIcon = this.window?.querySelector('.codereview-toggle-icon');
    
    if (contextSection && !contextSection.classList.contains('collapsed')) {
      contextSection.classList.add('collapsed');
      if (toggleIcon) {
        toggleIcon.textContent = '▶';
      }
    }
  }

  // Expand context panel
  expandContext() {
    const contextSection = this.window?.querySelector('#context-section');
    const toggleIcon = this.window?.querySelector('.codereview-toggle-icon');
    
    if (contextSection && contextSection.classList.contains('collapsed')) {
      contextSection.classList.remove('collapsed');
      if (toggleIcon) {
        toggleIcon.textContent = '▼';
      }
    }
  }

  // Update context panel with selected text
  updateContextDisplay() {
    const contextDiv = this.window?.querySelector('#explain-context');
    if (contextDiv) {
      contextDiv.textContent = this.selectedText;
    }
  }

  setStatus(icon) {
    const statusIcon = this.window.querySelector('#explain-status-icon');
    if (statusIcon) {
      statusIcon.innerHTML = icon;
    }
  }

  show(text) {
    console.log('[FloatingExplain] ========== show() CALLED ==========');
    console.log('[FloatingExplain] Current state:', this.state);
    console.log('[FloatingExplain] Current selectedText:', this.selectedText?.substring(0, 50) + (this.selectedText?.length > 50 ? '...' : ''));
    console.log('[FloatingExplain] New text:', text?.substring(0, 50) + (text?.length > 50 ? '...' : ''));
    
    if (!this.window) return;
    
    // Prevent reopening if window was just closed with same text (cooldown period)
    const timeSinceHide = Date.now() - this.lastHideTime;
    const sameText = this.selectedText === text;
    console.log('[FloatingExplain] Time since hide:', timeSinceHide, 'ms, same text:', sameText);
    
    if (timeSinceHide < 2000 && sameText) {
      console.log('[FloatingExplain] ❌ IGNORING show() - cooldown period (window just closed with same text)');
      return;
    }
    
    // Don't update anything if streaming - just make window visible
    if (this.state === 'STREAMING') {
      console.log('[FloatingExplain] State is STREAMING, just making visible');
      this.wasHidden = false;
      super.show();
      return;
    }
    
    // Clear chat history if text changed OR window was previously hidden
    const textChanged = !sameText;
    console.log('[FloatingExplain] Opening window - text changed:', textChanged, 'wasHidden:', this.wasHidden);
    
    if ((textChanged || this.wasHidden) && this.state !== 'LOADING') {
      console.log('[FloatingExplain] Clearing chat history for fresh start');
      this.state = 'IDLE';
      this.clearChat();
      // Expand context when opening window
      this.expandContext();
    }
    
    this.selectedText = text;
    this.updateContextDisplay();
    this.wasHidden = false; // Reset flag after showing
    
    console.log('[FloatingExplain] Calling super.show()');
    super.show();
  }
  
  hide() {
    this.lastHideTime = Date.now();
    this.wasHidden = true; // Mark that window was hidden
    console.log('[FloatingExplain] hide() called at:', this.lastHideTime);
    super.hide();
  }

  async explainText() {
    // Prevent multiple simultaneous requests
    if (this.state === 'LOADING' || this.state === 'STREAMING') {
      console.log('[CS] Request already in progress, ignoring duplicate call');
      return;
    }
    
    if (!this.window) {
      console.error('[CS] Window not found');
      return;
    }

    const questionInput = this.window.querySelector('#explain-question-input');
    const submitBtn = this.window.querySelector('#explain-submit-btn');
    const userQuestion = questionInput?.value.trim() || '';
    
    // Allow empty question for first request (acts as "explain this code")
    const isFirstRequest = this.messages.length === 0;
    
    // Add user message to chat only if there's a question
    // For first request with empty input, don't add user message
    if (userQuestion) {
      this.addMessage('user', userQuestion);
    }
    
    // Always collapse context when sending request to give more space for chat
    this.collapseContext();
    
    // Clear input
    if (questionInput) {
      questionInput.value = '';
    }
    
    // Disable button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Думаю...';
    }
    
    // Start new request
    this.state = 'LOADING';
    this.streamRequestId = (this.streamRequestId || 0) + 1;
    const currentRequestId = this.streamRequestId;
    
    // Get config
    let config;
    try {
      config = await getConfig();
      console.log('[CS] Config loaded, explainPrompt preview:', config.explainPrompt.substring(0, 150));
    } catch (e) {
      console.error('[CS] Failed to get config for explain:', e);
      this.state = 'ERROR';
      const errorMsg = 'Ошибка: не удалось загрузить конфигурацию. Проверьте настройки расширения.';
      
      const messagesContainer = this.window.querySelector('#explain-messages');
      if (messagesContainer) {
        const errorElement = this.renderMessage('assistant', errorMsg);
        errorElement.classList.add('error');
        messagesContainer.appendChild(errorElement);
        this.scrollToBottom();
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        this.resetSubmitButton(submitBtn);
      }
      return;
    }
    
    // Build prompt using explainPrompt template with variable substitution
    let systemPrompt;
    
    if (isFirstRequest) {
      // First request: use explainPrompt template from config
      const questionText = userQuestion ? `Дополнительный вопрос: ${userQuestion}` : '';
      systemPrompt = config.explainPrompt
        .replace(/{text}/g, this.selectedText)
        .replace(/{question}/g, questionText);
      
      console.log('[CS] First request - using explainPrompt');
      console.log('[CS] Selected text length:', this.selectedText.length);
      console.log('[CS] Selected text preview:', this.selectedText.substring(0, 100));
      console.log('[CS] Question:', userQuestion || '(empty)');
    } else {
      // Follow-up requests: use simple context reminder
      systemPrompt = `Контекст кода:\n\n${this.selectedText}\n\nОтветь на вопрос пользователя о коде выше.`;
      console.log('[CS] Follow-up request - using simple prompt');
    }
    
    console.log('[CS] System prompt length:', systemPrompt.length);
    console.log('[CS] System prompt preview:', systemPrompt.substring(0, 200));
    
    // Build API messages
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...this.messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    console.log('[CS] Total API messages:', apiMessages.length);
    console.log('[CS] API messages:', apiMessages.map(m => ({ role: m.role, length: m.content.length })));
    console.log('[CS] Full API messages for debugging:', JSON.stringify(apiMessages, null, 2));
    
    // Create empty assistant message for streaming
    const messagesContainer = this.window.querySelector('#explain-messages');
    let assistantElement = null;
    
    if (messagesContainer) {
      assistantElement = this.renderMessage('assistant', '', true);
      messagesContainer.appendChild(assistantElement);
      this.scrollToBottom();
    }
    
    let fullResponse = '';
    
    try {
      this.state = 'STREAMING';
      
      await ApiClient.streamRequest(
        config,
        apiMessages,
        // onChunk - receives full accumulated response, not just the new chunk
        (accumulatedResponse) => {
          if (currentRequestId !== this.streamRequestId) return;
          if (!this.window || !assistantElement) return;
          
          fullResponse = accumulatedResponse;  // Just assign, don't concatenate!
          assistantElement.innerHTML = converter.makeHtml(fullResponse);
          this.scrollToBottom();
        },
        // onDone
        () => {
          if (currentRequestId !== this.streamRequestId) return;
          if (!this.window) return;
          
          this.state = 'COMPLETED';
          
          // Add assistant message to history
          this.messages.push({ role: 'assistant', content: fullResponse });
          
          // Remove streaming class
          if (assistantElement) {
            assistantElement.classList.remove('streaming');
          }
          
          // Re-enable button
          if (submitBtn) {
            submitBtn.disabled = false;
            this.resetSubmitButton(submitBtn);
          }
        },
        // onError
        (error) => {
          if (currentRequestId !== this.streamRequestId) return;
          if (!this.window || !assistantElement) return;
          
          this.state = 'ERROR';
          
          const errorText = `Ошибка: ${error}`;
          
          if (fullResponse) {
            // If we have partial response, add error below it
            assistantElement.innerHTML = converter.makeHtml(fullResponse + '\n\n---\n\n' + errorText);
          } else {
            // Otherwise just show error
            assistantElement.textContent = errorText;
          }
          
          assistantElement.classList.add('error');
          assistantElement.classList.remove('streaming');
          this.scrollToBottom();
          
          // Re-enable button
          if (submitBtn) {
            submitBtn.disabled = false;
            this.resetSubmitButton(submitBtn);
          }
        }
      );
    } catch (error) {
      console.error('[CS] Unexpected error in explainText:', error);
      this.state = 'ERROR';
      
      if (assistantElement) {
        assistantElement.textContent = `Ошибка: ${error.message || error}`;
        assistantElement.classList.add('error');
        assistantElement.classList.remove('streaming');
        this.scrollToBottom();
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        this.resetSubmitButton(submitBtn);
      }
    }
  }

  resetSubmitButton(submitBtn) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        Отправить
      `;
    }
  }
}
