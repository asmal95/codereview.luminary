// Configuration management
export async function getConfig() {
  let options;
  
  try {
    options = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'openai_apikey', 
        'api_base_url', 
        'model',
        'api_timeout',
        'system_prompt',
        'review_prompt',
        'final_prompt',
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
  const apiTimeout = (options.api_timeout || 300) * 1000; // Convert seconds to milliseconds
  
  // Default prompts
  const systemPrompt = options.system_prompt || 
    'You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.';
  
  const reviewPrompt = options.review_prompt || 
    `The change has the following title: {title}.

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
  
  const finalPrompt = options.final_prompt || 
    'All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Provide response in Russian language.';
  
  const explainPrompt = options.explain_prompt || 
    `Ты полезный AI ассистент. Твоя задача - объяснить выделенный текст понятно и на русском языке.

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
  
  console.log('[CS] Config loaded:', {
    apiKey: isLocalhost ? 'dummy' : `***${apiKey.slice(-4)}`,
    baseUrl,
    model,
    apiTimeout: `${apiTimeout}ms`
  });
  
  return { apiKey, baseUrl, model, apiTimeout, systemPrompt, reviewPrompt, finalPrompt, explainPrompt };
}
