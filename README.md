# Obsidian 2-Way Google Drive Sync

[🇨🇳 简体中文 (Simplified Chinese)](./README_zh-CN.md)

A seamless, secure, and direct 2-way sync plugin for Obsidian and Google Drive. This plugin allows you to sync your Obsidian Vault directly with a dedicated Google Drive folder across desktop and mobile devices, without relying on any third-party centralized servers.

## Why I Built This
I developed this plugin because existing Google Drive sync solutions often require paid subscriptions, and the free alternatives available in the community typically only support one-way synchronization (backup only). I wanted to create a completely free, true two-way sync experience that puts you in full control of your data.

## Features
- **True 2-Way Sync**: Smart Three-Way Reconciliation engine safely handles uploads, downloads, and conflict resolution.
- **Privacy First**: Uses your own Google Cloud API credentials. No third-party servers are involved. Your data goes straight from your device to Google.
- **Mobile Compatible**: Works flawlessly on Obsidian for iOS and Android using cross-platform hashing and native requests.
- **Auto-Sync**: Automatically detects when you stop typing and syncs your changes silently in the background.

## Setup Instructions

To use this plugin, you need to provide your own Google Client ID and Secret. This takes about 5 minutes to set up and ensures you have your own dedicated, free API quota.

### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Obsidian Sync").
3. Navigate to **APIs & Services > Library** and search for **Google Drive API**. Click **Enable**.

### 2. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** and click Create.
3. Fill in the required fields (App name, User support email, Developer contact information).
4. **Important**: Under **Publishing status**, make sure to click **Publish App** to push it to "In production". If you keep it in "Testing", your token will expire every 7 days.

### 3. Generate Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Set Application type to **Desktop app** (or Web application with redirect URI `http://127.0.0.1:53134`).
4. You will get a **Client ID** and **Client Secret**.

### 4. Authenticate in Obsidian
1. Open Obsidian Settings > Obsidian 2-Way Google Drive Sync.
2. Paste your **Client ID** and **Client Secret**.
3. Click **Authorize**. A browser window will open asking you to log into your Google Account.
4. If the browser redirects to a broken `127.0.0.1` page, look at the URL in your browser's address bar. Copy the value after `code=` and paste it into the **Manual Auth Code** box in Obsidian.
5. You are now synced!

## Development
```bash
npm install
npm run dev
npm run build
```

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

You are free to use, modify, and redistribute this software for personal and non-commercial purposes, provided that you give appropriate credit and distribute your modifications under the same license. **Commercial use is strictly prohibited.**
