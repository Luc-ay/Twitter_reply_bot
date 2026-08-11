chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateReply') {
    chrome.storage.local.get(['geminiApiKey'], async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        sendResponse({ error: 'Please set your Gemini API key in the extension popup.' });
        return;
      }

      try {
        const authorContext = request.authorName ? `Author Name: "${request.authorName}"` : 'Author Name: Unknown';

        const prompt = `Reply to this X post in 1-6 words.

Post: "${request.tweet}"
${authorContext}

RULES:
- NO EMOJIS AT ALL.
- NO EXCLAMATION MARKS (!).
- NO SLANG/GENDERED WORDS (bro, boss, man, guy, dude, sir, ma, fam).
- GREETINGS: For morning/afternoon/evening/night greetings (GM, GN, Good morning, etc.), greet back and include Author Name if known (e.g. "GM AuthorName" or "Good afternoon AuthorName").
- BLESSINGS/PRAYERS: For prayer or blessing posts ("blessed day", "stay blessed", prayers), reply with "Amen" or "Amen AuthorName" or a short blessing including Author Name.
- CALLS TO ACTION: For join/participate posts, reply with short confirmation like "joining in AuthorName" or "on it".
- ULTRA SHORT: 1-6 words maximum.
- Output ONLY the final brief reply text.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.5,
              topK: 40,
              maxOutputTokens: 20
            }
          })
        });

        const data = await response.json();
        
        if (data.error) {
          sendResponse({ error: data.error.message });
        } else if (data.candidates && data.candidates[0].content.parts[0].text) {
          let replyText = data.candidates[0].content.parts[0].text;
          // Clean up formatting if Gemini added extra quotes
          replyText = replyText.replace(/^["']|["']$/g, '').trim();
          // Enforce strict rules: strip exclamation marks and emojis
          replyText = replyText.replace(/!/g, '');
          replyText = replyText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
          replyText = replyText.trim();
          
          // Track usage count
          const today = new Date().toISOString().split('T')[0];
          chrome.storage.local.get(['usageCount', 'usageDate'], (stats) => {
            let count = stats.usageCount || 0;
            if (stats.usageDate !== today) {
              count = 0; // Reset count for a new day
            }
            count++;
            chrome.storage.local.set({ usageCount: count, usageDate: today });
          });

          sendResponse({ reply: replyText });
        } else {
          sendResponse({ error: 'Unexpected response from Gemini API.' });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    });
    
    return true; // Indicates we wish to send a response asynchronously
  }
});
