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

## 🛡️ Refined Conflict Resolution Strategies (✨ Exclusive Feature)

Most file synchronization tools handle editing conflicts crudely—either by generating dozens of cluttered `_(Conflict_Timestamp).md` duplicate files that litter your directories, or by silently overwriting changes, causing potential data loss.

This plugin introduces **highly granular, user-selectable conflict resolution strategies**, highlighting our two premium, recommended options (switchable anytime in settings):

### 1. Smart Auto-Merge ⭐️ ⭐️ ⭐️ (Highly Recommended)
*   **The Experience**: **100% clean workspaces with zero duplicate junk files!**
*   **How it works**: Uses a Git-style line-based three-way merge algorithm. If you edit line A locally and line B is edited on Google Drive, the plugin automatically **fuses them into one note** with zero user intervention.
*   **Overlapping Conflicts**: If the exact same line was modified on both sides, the plugin **does not** create a new file. Instead, it embeds standard **Git conflict markers** directly inside your note:
    ```markdown
    <<<<<<< 本地修改 (Local)
    Your local modifications...
    =======
    Remote changes synced from Google Drive...
    >>>>>>> 云端修改 (Remote)
    ```
    Simply clean up the markers and the unwanted version in your standard editor whenever you open the note.

### 2. Interactive Visual Diff Modal ⭐️ ⭐️
*   **The Experience**: **Total precision and visual control.**
*   **How it works**: When a conflict is detected, the plugin pauses sync for that specific file and opens a **gorgeous, side-by-side comparative UI** inside Obsidian.
*   *   **Left Column** shows your local device version.
*   *   **Right Column** shows the Google Drive cloud version.
*   *   **Center-Bottom Merge Editor** is preloaded with the auto-merged text, enabling direct manual edits.
*   *   Action buttons `[Keep Local]`, `[Keep Remote]`, and `[Submit Merged Changes]` resolve the conflict in a single click.

*(Note: We also provide standard strategies such as **Latest Wins**, **Keep Both (creates conflicted copy)**, **Local Wins (force upload)**, and **Remote Wins (force download)** to suit any workflow!)*

## Setup Instructions (Read Carefully)

Because this plugin connects directly to Google Drive without any middleman servers, you need to provide your own Google Client ID and Secret. The process involves navigating Google Cloud Console, which can seem complex but takes only about 5 minutes.

### 1. Create a Google Cloud Project & Enable API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** at the top left, then click **New Project**. Name it something like "Obsidian Sync" and create it.
3. In the top search bar, search for **Google Drive API**. Click it and click **Enable**.

### 2. Configure Google Auth Platform (OAuth Consent)
1. Click the hamburger menu at the top left, go to **APIs & Services > OAuth consent screen** (or **Google Auth Platform**).
2. If prompted, click **Get Started**. Fill in the **App Name**, **User support email**, and **Developer contact information**.
3. Under **Audience/User Type**, make sure to select **External**.
4. **CRITICAL STEP**: On the Audience/Overview page, find the **Publishing status**. It will say "Testing". You MUST click **Publish App** (or Push to production) to change it to "In production". If you skip this, you will get an "Access Denied / App is in testing" error, or your token will expire every 7 days.

### 3. Generate Credentials (The Keys)
1. In the left menu, click **Clients** (or **Credentials**).
2. Click **+ Create Credentials > OAuth client ID** at the top.
3. Set the Application type to **Desktop app**.
4. Click Create. A window will pop up containing your **Client ID** and **Client Secret**. (If you close it, you can always click the pencil icon next to the client name to see them again).

### 4. Authenticate in Obsidian
1. Open Obsidian Settings > Obsidian 2-Way Google Drive Sync.
2. Paste your **Client ID** and **Client Secret**.
3. Click **Authorize**. A browser window will open asking you to log into your Google Account.
4. **Safety Warning**: Because you just created this app yourself and didn't pay for an external security audit, Google will show a scary warning: *"Google hasn't verified this app"*. This is completely normal! Click **Advanced**, and then click **Go to [Your App Name] (unsafe)**.
5. Grant the permissions. The browser will then redirect to a broken `127.0.0.1` page (Site can't be reached). **This is also normal**.
6. Look at the URL in your browser's address bar. Find the part that says `code=` and copy the long string of characters immediately after it (stop before `&scope=`).
7. Paste this code into the **Manual Auth Code** box in Obsidian's plugin settings and click away to save.
8. The status will change to **Authenticated ✓**. You are now synced!

## Development
```bash
npm install
npm run dev
npm run build
```

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

You are free to use, modify, and redistribute this software for personal and non-commercial purposes, provided that you give appropriate credit and distribute your modifications under the same license. **Commercial use is strictly prohibited.**
