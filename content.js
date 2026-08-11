// --- Existing Manual Button Code ---
function injectButton() {
  const toolbars = document.querySelectorAll('[data-testid="toolBar"]');
  toolbars.forEach(toolbar => {
    if (toolbar.querySelector('.gemini-reply-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'gemini-reply-btn';
    btn.innerText = '✨ Auto Reply';
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.innerText = '⏳ Thinking...';
      btn.disabled = true;

      try {
        let tweetText = '';
        let authorName = '';
        const modal = document.querySelector('[aria-labelledby="modal-header"]');
        if (modal) {
          const tweetElement = modal.querySelector('[data-testid="tweetText"]');
          if (tweetElement) tweetText = tweetElement.innerText;
          const userElement = modal.querySelector('[data-testid="User-Name"]');
          if (userElement) {
            const nameSpan = userElement.querySelector('span');
            if (nameSpan) authorName = nameSpan.innerText.trim();
          }
        }

        if (!tweetText) {
          const articles = document.querySelectorAll('article');
          for (let article of articles) {
            const textEl = article.querySelector('[data-testid="tweetText"]');
            if (textEl) {
              tweetText = textEl.innerText;
              const userElement = article.querySelector('[data-testid="User-Name"]');
              if (userElement) {
                const nameSpan = userElement.querySelector('span');
                if (nameSpan) authorName = nameSpan.innerText.trim();
              }
              break;
            }
          }
        }

        if (!tweetText) {
          alert('Could not find the tweet text to reply to.');
          btn.innerText = '✨ Auto Reply';
          btn.disabled = false;
          return;
        }

        chrome.runtime.sendMessage({ action: 'generateReply', tweet: tweetText, authorName: authorName }, (response) => {
          if (response && response.reply) {
            const inputBox = document.querySelector('[data-testid="tweetTextarea_0"]');
            if (inputBox) {
              inputBox.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, response.reply);
            }
          } else if (response && response.error) {
            alert('Error generating reply: ' + response.error);
          }
          btn.innerText = '✨ Auto Reply';
          btn.disabled = false;
        });

      } catch (error) {
        console.error(error);
        alert('An error occurred.');
        btn.innerText = '✨ Auto Reply';
        btn.disabled = false;
      }
    });

    toolbar.appendChild(btn);
  });
}

const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });
injectButton();


// --- Auto Bot Code ---
let botActive = false;
let processedTweets = new Set(); // Tracks text of tweets we replied to
let generatedReplies = new Set(); // Tracks our own generated text
let sessionReplyCount = 0;
let sessionReplyLimit = 10;
let lastProcessedY = 0; // Tracks the physical Y coordinate to prevent scrolling up

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBotStatus') {
    sendResponse({ isActive: botActive });
  } else if (request.action === 'toggleBot') {
    botActive = !botActive;
    if (botActive) {
      sessionReplyCount = 0;
      sessionReplyLimit = request.limit || 10;
      processedTweets = new Set();
      generatedReplies = new Set();
      lastProcessedY = window.scrollY; // Start from current scroll position
      runBotLoop();
    }
    sendResponse({ isActive: botActive });
  }
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBotLoop() {
  while (botActive) {
    const articles = document.querySelectorAll('article');
    let targetArticle = null;
    let targetTweetText = '';
    let targetAuthorName = '';
    let targetY = 0;
    
    // Find next unprocessed tweet by checking its text AND absolute physical position
    for (let article of articles) {
      const rect = article.getBoundingClientRect();
      const absoluteY = window.scrollY + rect.top;

      // MATHEMATICAL BLOCK: If this post is physically higher on the page than our last post, ignore it.
      if (absoluteY <= lastProcessedY + 50) {
        continue; 
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      if (!textEl) continue; // Skip if no text
      
      const text = textEl.innerText.trim();
      
      // Skip if we already replied to this tweet OR if the tweet IS our own reply!
      if (!processedTweets.has(text) && !generatedReplies.has(text)) {
        targetArticle = article;
        targetTweetText = text;
        
        const userEl = article.querySelector('[data-testid="User-Name"]');
        if (userEl) {
          const nameSpan = userEl.querySelector('span');
          if (nameSpan) targetAuthorName = nameSpan.innerText.trim();
        }

        targetY = absoluteY;
        break;
      }
    }
    
    if (!targetArticle) {
      // Scroll down to load more tweets
      window.scrollBy(0, 1500);
      await sleep(3000);
      continue;
    }
    
    // Mark as processed immediately so we don't pick it up again
    processedTweets.add(targetTweetText);
    lastProcessedY = targetY; // Save the absolute Y coordinate

    
    // Scroll tweet into view
    targetArticle.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(2000);
    if (!botActive) break;

    // Like the tweet
    const likeBtn = targetArticle.querySelector('[data-testid="like"]');
    if (likeBtn) {
      likeBtn.click();
      await sleep(1000);
    }
    if (!botActive) break;

    // Request AI reply
    const response = await new Promise(resolve => {
       chrome.runtime.sendMessage({ action: 'generateReply', tweet: targetTweetText, authorName: targetAuthorName }, resolve);
    });

    if (response && response.reply) {
       // Track our own generated reply so the bot never accidentally replies to itself
       generatedReplies.add(response.reply.trim());

       // Click Reply icon to open modal
       const replyIcon = targetArticle.querySelector('[data-testid="reply"]');
       if (replyIcon) {
         replyIcon.click();
         await sleep(2000); // Wait for modal to open
         
         if (!botActive) break;
         
         const inputBox = document.querySelector('[data-testid="tweetTextarea_0"]');
         const replyButton = document.querySelector('[data-testid="tweetButton"]');
         
         if (inputBox && replyButton) {
           inputBox.focus();
           document.execCommand('insertText', false, response.reply);
           await sleep(1500);
           
           if (!botActive) break;
           
           // Post the reply
           replyButton.click();
           await sleep(3000); // Wait for post to send
           
           sessionReplyCount++;
           if (sessionReplyCount >= sessionReplyLimit) {
             console.log(`Auto Bot reached the limit of ${sessionReplyLimit} comments. Stopping automatically.`);
             botActive = false;
             break;
           }
         } else {
           // Close modal if something went wrong
           const closeBtn = document.querySelector('[aria-label="Close"]');
           if (closeBtn) closeBtn.click();
         }
       }
    }
    
    if (!botActive) break;

    // Wait 7 seconds before next post
    const waitTime = 7000;
    console.log(`Bot sleeping for 7 seconds... (${sessionReplyCount}/${sessionReplyLimit} completed)`);
    
    // Check botActive periodically during sleep so it stops instantly if disabled
    for (let i = 0; i < waitTime; i += 1000) {
      if (!botActive) break;
      await sleep(1000);
    }
  }
}
