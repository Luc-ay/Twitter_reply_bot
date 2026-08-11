document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const replyCountSpan = document.getElementById('replyCount');

  // Load existing API key and stats
  chrome.storage.local.get(['geminiApiKey', 'usageCount', 'usageDate'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (result.usageDate === today && result.usageCount) {
      replyCountSpan.textContent = result.usageCount;
    } else {
      replyCountSpan.textContent = '0';
    }
  });

  const toggleBotBtn = document.getElementById('toggleBotBtn');
  const botStatusDiv = document.getElementById('botStatus');

  function updateBotUI(isActive) {
    if (isActive) {
      toggleBotBtn.textContent = 'Stop Auto Bot';
      toggleBotBtn.style.backgroundColor = '#f4212e';
      botStatusDiv.textContent = 'Bot is currently running...';
    } else {
      toggleBotBtn.textContent = 'Start Auto Bot';
      toggleBotBtn.style.backgroundColor = '#1DA1F2';
      botStatusDiv.textContent = 'Bot is currently stopped.';
    }
  }

  // Ask content script for status
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getBotStatus'}, (response) => {
        if (!chrome.runtime.lastError && response) {
          updateBotUI(response.isActive);
        }
      });
    }
  });

  // Toggle Bot
  toggleBotBtn.addEventListener('click', () => {
    const limit = parseInt(document.getElementById('botLimit').value) || 10;
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleBot', limit: limit}, (response) => {
          if (chrome.runtime.lastError) {
            alert('Could not connect to the page. Please refresh your X (Twitter) tab and try again!');
          } else if (response) {
            updateBotUI(response.isActive);
          }
        });
      }
    });
  });

  // Save API key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      statusDiv.textContent = 'API Key saved!';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});
