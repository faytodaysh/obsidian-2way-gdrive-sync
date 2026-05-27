import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import GDriveSyncPlugin from './main';
import { LogModal } from './log-modal';

export class GDriveSyncSettingTab extends PluginSettingTab {
  plugin: GDriveSyncPlugin;

  constructor(app: App, plugin: GDriveSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Google Drive 2-Way Sync' });
    
    const version = this.plugin.manifest.version;
    const aboutDiv = containerEl.createDiv('gdrive-sync-about');
    aboutDiv.style.marginBottom = '20px';
    aboutDiv.style.padding = '10px';
    aboutDiv.style.backgroundColor = 'var(--background-secondary)';
    aboutDiv.style.borderRadius = '5px';
    
    aboutDiv.createEl('h3', { text: `Version: v${version}` });
    const changelog = aboutDiv.createEl('ul');
    changelog.style.marginTop = '0';
    changelog.createEl('li', { text: 'v1.0.4: Fixed empty textarea bug on Visual Diff modal.' });
    changelog.createEl('li', { text: 'v1.0.3: Added Conflict Resolution Strategy setting.' });
    changelog.createEl('li', { text: 'v1.0.2: Fixed empty JSON bug on file deletion.' });
    changelog.createEl('li', { text: 'v1.0.1: Added UI Logging, fixed cache bugs.' });
    changelog.createEl('li', { text: 'v1.0.0: Initial Release.' });

    containerEl.createEl('h3', { text: 'Settings' });

    new Setting(containerEl)
      .setName('Google Client ID')
      .setDesc('Your custom Google OAuth Client ID.')
      .addText(text => text
        .setPlaceholder('Enter your client ID')
        .setValue(this.plugin.settings.clientId)
        .onChange(async (value) => {
          this.plugin.settings.clientId = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Google Client Secret')
      .setDesc('Your custom Google OAuth Client Secret. This stays local on your device.')
      .addText(text => text
        .setPlaceholder('Enter your client secret')
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async (value) => {
          this.plugin.settings.clientSecret = value;
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Authentication')
      .setDesc(this.plugin.settings.tokens ? 'Status: Authenticated ✅' : 'Status: Not Authenticated ❌')
      .addButton(btn => btn
        .setButtonText(this.plugin.settings.tokens ? 'Re-Authenticate' : 'Authorize')
        .setCta()
        .onClick(() => {
          if (!this.plugin.settings.clientId || !this.plugin.settings.clientSecret) {
            new Notice('Please enter Client ID and Client Secret first.');
            return;
          }
          const authUrl = this.plugin.oauthClient.getAuthUrl();
          window.open(authUrl);
          new Notice('Please copy the code from the browser and paste it below.');
        }));

    new Setting(containerEl)
      .setName('Manual Auth Code')
      .setDesc('Paste the code from the browser here after authorizing.')
      .addText(text => text
        .setPlaceholder('4/0AeaY...')
        .onChange(async (value) => {
          if (value && value.length > 10) {
            try {
              const tokens = await this.plugin.oauthClient.exchangeCode(value);
              this.plugin.settings.tokens = tokens;
              await this.plugin.saveSettings();
              new Notice('Successfully authenticated!');
              this.display(); // Refresh UI
            } catch (e) {
              new Notice('Failed to exchange code. See console for details.');
            }
          }
        }));

    new Setting(containerEl)
      .setName('Sync Folder')
      .setDesc('The folder in your Google Drive where the vault will be synced.')
      .addText(text => text
        .setPlaceholder('ObsidianVault')
        .setValue(this.plugin.settings.syncFolder)
        .onChange(async (value) => {
          this.plugin.settings.syncFolder = value;
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Sync Interval')
      .setDesc('Auto-sync interval in minutes (set to 0 to disable).')
      .addText(text => text
        .setPlaceholder('15')
        .setValue(String(this.plugin.settings.syncInterval))
        .onChange(async (value) => {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) {
            this.plugin.settings.syncInterval = parsed;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('Conflict Resolution Strategy')
      .setDesc('How to handle sync conflicts when a file is modified on both sides since last sync.')
      .addDropdown(dropdown => dropdown
        .addOption('auto-merge', 'Auto-Merge (智能自动合并 + 冲突标记 - 推荐)')
        .addOption('visual-diff', 'Visual Diff Modal (可视化对比弹窗)')
        .addOption('keep-both', 'Keep Both Versions (保留双方 - 备份文件)')
        .addOption('local-wins', 'Local Wins (本地优先)')
        .addOption('remote-wins', 'Remote Wins (云端优先)')
        .addOption('latest-wins', 'Latest Edit Wins (最新修改优先)')
        .setValue(this.plugin.settings.conflictStrategy || 'auto-merge')
        .onChange(async (value) => {
          this.plugin.settings.conflictStrategy = value as any;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h2', { text: 'Troubleshooting' });

    new Setting(containerEl)
      .setName('Sync Logs')
      .setDesc('View, copy, or clear the sync logs to troubleshoot issues.')
      .addButton(btn => btn
        .setButtonText('View Logs')
        .onClick(() => {
          new LogModal(this.app, this.plugin.logger).open();
        }));
  }
}
