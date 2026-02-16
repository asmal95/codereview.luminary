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
    this.isProcessing = false; // Track if request is in progress
    this.createWindow(600, 600);
    this.loadState();
  }

  createWindowContent() {
    return `
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
  }

  attachEventListeners() {
    super.attachEventListeners();

    const submitBtn = this.window.querySelector('#explain-submit-btn');
    const questionInput = this.window.querySelector('#explain-question-input');

    // Submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.explainText();
      });
    }
    
    // Enter key in textarea (Ctrl+Enter to submit)
    if (questionInput) {
      questionInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          this.explainText();
        }
      });
    }
  }

  setStatus(icon) {
    const statusIcon = this.window.querySelector('#explain-status-icon');
    if (statusIcon) {
      statusIcon.innerHTML = icon;
    }
  }

  show(text) {
    // Always save current question input value before any manipulation
    // This prevents losing user input in any scenario
    const questionInput = this.window.querySelector('#explain-question-input');
    let savedQuestion = '';
    if (questionInput) {
      savedQuestion = questionInput.value;
    }
    
    this.selectedText = text;
    
    // Update UI with selected text
    const selectedTextDiv = this.window.querySelector('#explain-selected-text');
    if (selectedTextDiv) {
      selectedTextDiv.textContent = text;
    }
    
    // Only reset form if not processing and no saved question
    // This prevents losing user input when window is shown again
    if (questionInput && !this.isProcessing && !savedQuestion) {
      questionInput.value = '';
    } else if (questionInput && savedQuestion) {
      // Always restore saved question if it exists (even during processing)
      // This ensures user's input is never lost
      questionInput.value = savedQuestion;
    }
    
    // Only hide result section if not processing
    const resultSection = this.window.querySelector('#explain-result-section');
    if (resultSection && !this.isProcessing) {
      resultSection.style.display = 'none';
    }
    
    const resultDiv = this.window.querySelector('#explain-result');
    if (resultDiv && !this.isProcessing) {
      resultDiv.innerHTML = '';
    }
    
    // Ensure button is enabled if not processing
    const submitBtn = this.window.querySelector('#explain-submit-btn');
    if (submitBtn && !this.isProcessing) {
      submitBtn.disabled = false;
      this.resetSubmitButton(submitBtn);
    }
    
    // Show window using base class logic
    super.show();
    
    // Focus on question input after window is shown (only if not processing)
    if (questionInput && !this.isProcessing) {
      setTimeout(() => {
        questionInput.focus();
      }, 100);
    }
  }

  async explainText() {
    // Prevent multiple simultaneous requests
    if (this.isProcessing) {
      return;
    }
    
    const questionInput = this.window.querySelector('#explain-question-input');
    const resultSection = this.window.querySelector('#explain-result-section');
    const resultDiv = this.window.querySelector('#explain-result');
    const submitBtn = this.window.querySelector('#explain-submit-btn');
    
    // Save question value before any DOM manipulation
    const additionalQuestion = questionInput?.value.trim() || '';
    
    // Mark as processing
    this.isProcessing = true;
    
    // Show result section
    if (resultSection) {
      resultSection.style.display = 'block';
    }
    if (resultDiv) {
      resultDiv.innerHTML = '';
    }
    
    // Set loading state
    this.setStatus(spinner);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Думаю...';
    }
    
    // Get config with custom prompt
    let config;
    try {
      config = await getConfig();
    } catch (e) {
      console.error('[CS] Failed to get config for explain:', e);
      if (resultDiv) {
        resultDiv.innerHTML = 'Ошибка: не удалось загрузить конфигурацию. Проверьте настройки расширения.';
      }
      this.setStatus(xcircle);
      this.isProcessing = false;
      this.resetSubmitButton(submitBtn);
      return;
    }
    
    // Build prompt using custom template with variable substitution
    const userPrompt = config.explainPrompt
      .replace(/{text}/g, this.selectedText)
      .replace(/{question}/g, additionalQuestion ? `Дополнительный вопрос: ${additionalQuestion}` : '');
    
    const messages = [
      { role: 'user', content: userPrompt }
    ];
    
    try {
      await ApiClient.streamRequest(
        config,
        messages,
        (answer) => {
          if (resultDiv) {
            resultDiv.innerHTML = converter.makeHtml(answer);
          }
        },
        () => {
          this.setStatus(checkmark);
          this.isProcessing = false;
          this.resetSubmitButton(submitBtn);
        },
        (error) => {
          if (resultDiv) {
            resultDiv.innerHTML = `Ошибка: ${error}`;
          }
          this.setStatus(xcircle);
          this.isProcessing = false;
          this.resetSubmitButton(submitBtn);
        }
      );
    } catch (error) {
      // Ensure we always reset processing state even if streamRequest throws
      console.error('[CS] Unexpected error in explainText:', error);
      if (resultDiv) {
        resultDiv.innerHTML = `Ошибка: ${error.message || error}`;
      }
      this.setStatus(xcircle);
      this.isProcessing = false;
      this.resetSubmitButton(submitBtn);
    }
  }

  resetSubmitButton(submitBtn) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
        Объяснить
      `;
    }
  }
}
