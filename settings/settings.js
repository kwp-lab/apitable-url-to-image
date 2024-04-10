// Saves options to chrome.storage
const saveOptions = () => {
    const apiToken = document.getElementById('inputTokenField').value;
    let apiHost = document.getElementById('inputHostField').value;

    if(apiHost.length > 0){
      const lastChar = apiHost.charAt(apiHost.length - 1);
      if(lastChar == '/'){
        apiHost = apiHost.slice(0, -1);
      }
    }
  
    chrome.storage.sync.set(
      { apiToken: apiToken, apiHost: apiHost || 'https://aitable.ai' },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('statusMsg');
        status.textContent = '✅ settings saved.';
        status.style.display = 'block';
        setTimeout(() => {
          status.textContent = '';
          status.style.display = 'none';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { apiToken: '', apiHost: 'https://aitable.ai' },
      (items) => {
        document.getElementById('inputTokenField').value = items.apiToken;
        document.getElementById('inputHostField').value = items.apiHost;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('btnSave').addEventListener('click', saveOptions);