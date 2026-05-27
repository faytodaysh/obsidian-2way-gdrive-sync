import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import GDriveSyncPlugin from './main';

export class GDriveSyncSettingTab extends PluginSettingTab {
  plugin: GDriveSyncPlugin;

  constructor(app: App, plugin: GDriveSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Google Drive 2-Way Sync Settings' });

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
  }
}
