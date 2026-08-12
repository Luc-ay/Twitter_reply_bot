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

        const prompt = `Reply to this X post in strictly 2-5 words.

Post: "${request.tweet}"
${authorContext}

CRITICAL LANGUAGE & CATEGORY RULES:
- DEFAULT LANGUAGE (STANDARD ENGLISH): For most posts (tech, products, advice, news, questions, general thoughts), reply in natural STANDARD ENGLISH.
- PIDGIN ONLY FOR HUMOR & JOKES: Use Nigerian Pidgin English ONLY if the post is explicitly a funny joke, meme, or sarcastic post (e.g., "this one funny bad!", "caps lock dey fear person", "no lie at all!"). Do NOT use Pidgin for tech, advice, or product posts!
- PRODUCTS & PROJECTS: If sharing a product, app, tool, or project, react in Standard English (e.g., "nice work, checking this out", "looks clean, will try it"). NEVER say "joining in".
- ADVICE & INSIGHTS: If giving advice, insights, or tips, reply in Standard English (e.g., "solid point, thanks for sharing", "100% agree with this"). NEVER say "joining in".
- CALLS TO ACTION: For posts inviting people to join an event, stream, or group, reply with "let's join in guys!" or "guys join in!".
- GREETINGS & BLESSINGS: Reply with "GM AuthorName!" or "Amen AuthorName".

RULES & FORMATTING:
- NO EMOJIS AT ALL.
- STRICT LENGTH: 2 TO 5 WORDS PER REPLY. Never 1 word, never more than 5 words.
- TONE: Natural, engaging, human, conversational.
- EXCLAMATION MARKS ALLOWED: Feel free to use exclamation marks when appropriate.
- NO CHEAP TITLES: Avoid words like "bro", "boss", "dude", "sir", "ma", "fam". Terms like "guys" are allowed.
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
              temperature: 0.85,
              topK: 40,
              maxOutputTokens: 60
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          sendResponse({ error: data.error.message });
          return;
        }

        const candidate = data.candidates && data.candidates[0];
        if (!candidate) {
          sendResponse({ error: 'No response candidate returned from Gemini.' });
          return;
        }

        if (candidate.finishReason === 'SAFETY') {
          sendResponse({ error: 'Response was flagged by Gemini safety filters.' });
          return;
        }

        const textPart = candidate.content && candidate.content.parts && candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          let replyText = textPart.text;
          // Clean up formatting if Gemini added extra quotes
          replyText = replyText.replace(/^["']|["']$/g, '').trim();
          // Enforce rule: strip emojis only (allow exclamation marks for energy!)
          replyText = replyText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F800}-\u{1F8FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
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
          const reason = candidate.finishReason ? ` (Reason: ${candidate.finishReason})` : '';
          sendResponse({ error: `Empty response from Gemini API${reason}.` });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    });
    
    return true; // Indicates we wish to send a response asynchronously
  }
});
