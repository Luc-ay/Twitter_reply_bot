# X Reply Generator (Twitter AI Reply Bot)

A lightweight, powerful Chrome Extension (Manifest V3) that leverages Google's **Gemini AI API** (`gemini-3.1-flash-lite`) to automatically generate natural, concise, and context-aware replies directly on X (formerly Twitter).

---

## ✨ Features

- **⚡ Manual One-Click Reply**: Injects a `✨ Auto Reply` button into every tweet toolbar on X/Twitter.
- **🤖 Autonomous Auto-Bot**: Automatically scrolls through your feed, likes tweets, generates replies, and posts them with configurable session limits.
- **🎯 Ultra-Short & Natural**: Generates realistic 1–6 word replies, preventing AI fluff and saving API tokens.
- **👤 Display Name Personalization**: Smartly extracts the post author's display name for greetings (`GM AuthorName`), prayers/blessings (`Amen AuthorName`), and calls to action (`joining in AuthorName`).
- **🚫 Clean Output Rules**:
  - Zero emojis.
  - Zero exclamation marks (`!`).
  - No slang or gendered titles (`bro`, `boss`, `dude`, `man`, `sir`, `fam`).
- **📊 Daily Usage Tracking**: Keeps count of replies generated today right in the extension popup.
- **🔐 Secure Storage**: Uses `chrome.storage.local` to safely save your Gemini API Key locally on your browser.

---

## 📁 Repository Structure

```
Twitter_reply_bot/
├── manifest.json     # Chrome Extension Manifest (v3)
├── background.js     # Background service worker (Gemini API calls, prompt rules, post-processing)
├── content.js        # Content script (X DOM manipulation, button injection, auto-bot loop)
├── popup.html        # Extension popup interface
├── popup.js          # Popup interactivity, settings, & stats management
├── styles.css        # Styles for injected buttons
└── README.md         # Documentation
```

---

## 🚀 Installation

1. **Download or Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Twitter_reply_bot.git
   ```
2. **Open Chrome Extensions Page**:
   - In Google Chrome, go to `chrome://extensions`.
3. **Enable Developer Mode**:
   - Toggle **Developer mode** in the top-right corner.
4. **Load Unpacked Extension**:
   - Click **Load unpacked** in the top-left corner.
   - Select the `Twitter_reply_bot` project folder.

---

## ⚙️ Configuration

1. Get a free API Key from [Google AI Studio](https://aistudio.google.com/).
2. Click the **X Reply Generator** icon in your Chrome toolbar.
3. Paste your Gemini API key into the **Gemini API Key** field.
4. Click **Save**.

---

## 💻 Usage

### 1. Manual Reply Mode
1. Navigate to [x.com](https://x.com) or [twitter.com](https://twitter.com).
2. On any tweet toolbar or reply modal, click the **`✨ Auto Reply`** button.
3. The extension will generate a response, clear any existing text, and insert the AI reply into the text box.

### 2. Auto Bot Mode
1. Click the extension icon to open the popup.
2. Set your desired **Auto Bot Limit** (e.g., `10`).
3. Click **Start Auto Bot**.
4. The bot will automatically:
   - Scroll down your timeline.
   - Like target tweets.
   - Generate AI replies using the author's display name where appropriate.
   - Send replies sequentially until the limit is reached.
5. Click **Stop Auto Bot** at any time to pause execution.

---

## 🛠️ Configuration Details

- **Model Used**: `gemini-3.1-flash-lite` via `v1beta/models/generateContent`.
- **Token Cap**: `maxOutputTokens: 20` to prevent token depletion and enforce brief human responses.

---

## 📄 License

This project is licensed under the MIT License.
