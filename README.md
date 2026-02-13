# codereview.gpt

<p align="center">
  <img src="https://raw.githubusercontent.com/sturdy-dev/codereview.gpt/main/public/icons/icon_128.png">
</p>
<p align='center'>
    Review GitHub Pull Requests or GitLab Merge Requests using <a href="https://chat.openai.com" target="_blank">ChatGPT</a>.
</p>
<p align='center'>
    <a href="https://github.com/sturdy-dev/codereview.gpt/blob/main/LICENSE.txt">
        <img alt="GitHub"
        src="https://img.shields.io/github/license/sturdy-dev/codereview.gpt">
    </a>
    <a href="https://chrome.google.com/webstore/detail/codereviewgpt/amdfidcajdihmbhmmgohhkoaijpkocdn">
      <img alt="Chrome Web Store"
      src="https://img.shields.io/chrome-web-store/v/amdfidcajdihmbhmmgohhkoaijpkocdn">
    </a>
</p>
<p align="center">
  <a href="#overview">🔍 Overview</a> •
  <a href="#usage">💻 Usage</a> •
  <a href="#faq">📖 FAQ</a> •
  <a href="#installation">🔧 Installation</a>
</p>

## Overview

This is a Chrome extension which reviews Pull Requests for you using [ChatGPT](https://chat.openai.com/).

Here's an example output for [this](https://github.com/sturdy-dev/semantic-code-search/pull/17) Pull Request:

https://user-images.githubusercontent.com/4030927/207372123-46d7ee8c-bd3e-4272-8ccb-4639f9f71458.mp4

![example screenshot](https://raw.githubusercontent.com/sturdy-dev/codereview.gpt/main/docs/codereview_gpt_screenshot_1.png)

## Usage

### Code Review Mode

- Navigate to a GitHub Pull Request or GitLab Merge Request that you want a review for.
- Fill in your [OpenAI API token](https://platform.openai.com/account/api-keys) in the Settings of the Chrome Extension
- Click the extension icon
- You get code review comments from ChatGPT in the popup window

**NB:** Running the review multiple times often produces different feedback, so if you are dealing with a larger PR, it might be a good idea to do that to get the most out of it.

### 🆕 Explain Mode (NEW!)

You can now ask AI to explain any text on any webpage:

- **Select text** on any webpage (code, documentation, error messages, etc.)
- **Right-click** and choose **"Объяснить с помощью AI"** ("Explain with AI")
- A floating window appears with the selected text
- **Optionally add your question** (e.g., "What does this function do?", "Explain in simple terms")
- Click **"Объяснить"** ("Explain") or press **Ctrl+Enter**
- Get real-time AI explanation with streaming response

**Examples:**
- Explain complex code snippets
- Understand error messages
- Get simple explanations of technical docs
- Analyze and get suggestions for improvements

📖 See [EXPLAIN_FEATURE.md](EXPLAIN_FEATURE.md) for detailed documentation.

### 🎨 Custom Prompts (NEW!)

You can now customize AI prompts for both code review and text explanation:

- **System Prompt** - Define AI's role and behavior
- **Review Prompts** - Customize code review instructions
- **Explain Prompt** - Control how AI explains selected text

**How to customize:**
1. Right-click extension icon → **Options**
2. Scroll to prompt sections
3. Edit prompts with your preferences
4. Use variables: `{title}`, `{text}`, `{question}`
5. Click **Save**

📚 See [CUSTOM_PROMPTS.md](CUSTOM_PROMPTS.md) for detailed guide and examples.

## FAQ

###

**Q:** Are the reviews 100% trustworthy?

**A:** No. This tool can help you spot bugs, but as with anything, use your judgement. Sometimes it hallucinates things that sound plausible but are false — in this case, re-run the review.

###

**Q:** What aspects of the Pull Request or Merge Request are considered during the review?

**A:** The model gets the code changes and the commit messages in a [patch](https://git-scm.com/docs/git-format-patch) format. Additionally it pulls in the description of the MR/PR.

###

**Q:** Does the extension post comments on the Pull Request page?

**A:** No. If you want any of the feedback as PR comments, you can copy paste the output.

###

**Q:** Is this a GPT wrapper?

**A:** Yes, [but](https://twitter.com/creatine_cycle/status/1600331160776998913)

###

**Q:** Why would you want this?

**A:** Plenty of reasons! You can:

    - pretend to work while playing games instead
    - appear smart to your colleagues
    - enable a future skynet
    - actually catch some bugs you missed
    - learn a thing or 2 on best practices

## Installation

You can install `codereview.gpt` from the [Chrome Web Store](https://chrome.google.com/webstore/detail/codereviewgpt/amdfidcajdihmbhmmgohhkoaijpkocdn) or build it from source locally.

### From the Chrome Web Store (recommended)

Go to the [extension page](https://chrome.google.com) at the Chrome Web Store and add `codereview.gpt`.

### From source

- Clone this repository `git clone foo && cd foo`
- Install the dependencies `npm install`
- Run the build script `npm run build`
- Navigate to `chrome://extensions`
- Enable Developer Mode
- Click the 'Load unpacked' button and navigate to the `build` directory in the project

## Supported browsers

only Chrome is supported

## Permissions

This is a list of permissions the extension uses with the respective reason.

- `activeTab` is used to get the URL or the active tab. This is needed to fetch the get the Pull Request details
- `storage` is used to cache the responses from OpenAI
- `scripting` is used to fetch html content from the Merge Request / Pull Request
- `contextMenus` is used to add "Explain with AI" option to the right-click menu

## Credits

This project is inspired by [clmnin/summarize.site](https://github.com/clmnin/summarize.site)

## License

codereview.gpt is distributed under the [MIT](LICENSE.txt) license.
