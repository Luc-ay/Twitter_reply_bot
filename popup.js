document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const replyCountSpan = document.getElementById('replyCount');
  const botLimitInput = document.getElementById('botLimit');
  const toggleBotBtn = document.getElementById('toggleBotBtn');
  const botStatusDiv = document.getElementById('botStatus');

  // Load existing API key, saved limit, and stats
  chrome.storage.local.get(['geminiApiKey', 'usageCount', 'usageDate', 'botLimit'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
    if (result.botLimit) {
      botLimitInput.value = result.botLimit;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (result.usageDate === today && result.usageCount) {
      replyCountSpan.textContent = result.usageCount;
    } else {
      replyCountSpan.textContent = '0';
    }
  });

  // Save botLimit when user changes input value
  botLimitInput.addEventListener('change', () => {
    const val = parseInt(botLimitInput.value) || 10;
    chrome.storage.local.set({ botLimit: val });
  });

  function updateBotUI(isActive, sessionCount, sessionLimit) {
    if (isActive) {
      toggleBotBtn.textContent = 'Stop Auto Bot';
      toggleBotBtn.style.backgroundColor = '#f4212e';
      if (sessionCount !== undefined && sessionLimit !== undefined) {
        botStatusDiv.textContent = `Bot running... (${sessionCount}/${sessionLimit})`;
      } else {
        botStatusDiv.textContent = 'Bot is currently running...';
      }
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
          updateBotUI(response.isActive, response.sessionCount, response.sessionLimit);
        }
      });
    }
  });

  // Toggle Bot
  toggleBotBtn.addEventListener('click', () => {
    const limit = parseInt(botLimitInput.value) || 10;
    chrome.storage.local.set({ botLimit: limit });
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleBot', limit: limit}, (response) => {
          if (chrome.runtime.lastError) {
            alert('Could not connect to the page. Please refresh your X (Twitter) tab and try again!');
          } else if (response) {
            updateBotUI(response.isActive, response.sessionCount, response.sessionLimit);
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
