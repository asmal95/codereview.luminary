// Saves options to chrome.storage
const saveOptions = () => {
    const openai_apikey = document.getElementById('openai_apikey').value;
    const api_base_url = document.getElementById('api_base_url').value.trim();
    const model = document.getElementById('model').value.trim();
  
    chrome.storage.sync.set(
      { 
        openai_apikey: openai_apikey,
        api_base_url: api_base_url || undefined, // Store undefined if empty to use default
        model: model || undefined // Store undefined if empty to use default
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
      { openai_apikey: '', api_base_url: '', model: '' },
      (items) => {
        document.getElementById('openai_apikey').value = items.openai_apikey;
        document.getElementById('api_base_url').value = items.api_base_url || '';
        document.getElementById('model').value = items.model || '';
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);