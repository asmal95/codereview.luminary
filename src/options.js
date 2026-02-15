// Default prompts
const DEFAULT_SYSTEM_PROMPT = `You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.`;

const DEFAULT_REVIEW_PROMPT = `The change has the following title: {title}.

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

const DEFAULT_FINAL_PROMPT = `All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Provide response in Russian language.`;

const DEFAULT_EXPLAIN_PROMPT = `Ты полезный AI ассистент. Твоя задача - объяснить выделенный текст понятно и на русском языке.

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

// Saves options to chrome.storage
const saveOptions = () => {
    const openai_apikey = document.getElementById('openai_apikey').value;
    const api_base_url = document.getElementById('api_base_url').value.trim();
    const model = document.getElementById('model').value.trim();
    const api_timeout = document.getElementById('api_timeout').value.trim();
    const system_prompt = document.getElementById('system_prompt').value.trim();
    const review_prompt = document.getElementById('review_prompt').value.trim();
    const final_prompt = document.getElementById('final_prompt').value.trim();
    const explain_prompt = document.getElementById('explain_prompt').value.trim();
  
    // Save to chrome.storage.sync
    chrome.storage.sync.set(
      { 
        openai_apikey: openai_apikey,
        api_base_url: api_base_url || undefined,
        model: model || undefined,
        api_timeout: api_timeout ? parseInt(api_timeout) : undefined,
        system_prompt: system_prompt || undefined,
        review_prompt: review_prompt || undefined,
        final_prompt: final_prompt || undefined,
        explain_prompt: explain_prompt || undefined
      },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { 
        openai_apikey: '', 
        api_base_url: '', 
        model: '',
        api_timeout: 300,
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        review_prompt: DEFAULT_REVIEW_PROMPT,
        final_prompt: DEFAULT_FINAL_PROMPT,
        explain_prompt: DEFAULT_EXPLAIN_PROMPT
      },
      (items) => {
        document.getElementById('openai_apikey').value = items.openai_apikey;
        document.getElementById('api_base_url').value = items.api_base_url || '';
        document.getElementById('model').value = items.model || '';
        document.getElementById('api_timeout').value = items.api_timeout || 300;
        document.getElementById('system_prompt').value = items.system_prompt || DEFAULT_SYSTEM_PROMPT;
        document.getElementById('review_prompt').value = items.review_prompt || DEFAULT_REVIEW_PROMPT;
        document.getElementById('final_prompt').value = items.final_prompt || DEFAULT_FINAL_PROMPT;
        document.getElementById('explain_prompt').value = items.explain_prompt || DEFAULT_EXPLAIN_PROMPT;
      }
    );
  };

  // Reset prompts to default values
  const resetPrompts = () => {
    document.getElementById('system_prompt').value = DEFAULT_SYSTEM_PROMPT;
    document.getElementById('review_prompt').value = DEFAULT_REVIEW_PROMPT;
    document.getElementById('final_prompt').value = DEFAULT_FINAL_PROMPT;
    document.getElementById('explain_prompt').value = DEFAULT_EXPLAIN_PROMPT;
    
    const status = document.getElementById('status');
    status.textContent = 'Prompts reset to default. Click Save to apply.';
    status.style.color = 'orange';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = 'green';
    }, 2000);
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('reset').addEventListener('click', resetPrompts);