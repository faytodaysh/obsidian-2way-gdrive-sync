import { Plugin, debounce } from 'obsidian';
import { GDriveSyncSettingTab } from './settings';
import { OAuthClient, OAuthTokens } from './oauth';
import { DriveClient } from './drive-client';
import { Scanner } from './scanner';
import { SyncEngine } from './sync-engine';
import { Logger } from './logger';

export interface GDriveSyncSettings {
  clientId: string;
  clientSecret: string;
  syncFolder: string;
  syncInterval: number;
  tokens: OAuthTokens | null;
}

const DEFAULT_SETTINGS: GDriveSyncSettings = {
  clientId: '',
  clientSecret: '',
  syncFolder: 'ObsidianVault',
  syncInterval: 15,
  tokens: null
};

export default class GDriveSyncPlugin extends Plugin {
  settings: GDriveSyncSettings;
  oauthClient: OAuthClient;
  driveClient: DriveClient;
  scanner: Scanner;
  syncEngine: SyncEngine;
  statusBarItemEl: HTMLElement;
  logger: Logger;

  async onload() {
    await this.loadSettings();

    this.logger = new Logger(this);
    this.oauthClient = new OAuthClient(this.settings.clientId, this.settings.clientSecret, this.settings.tokens || undefined);
    this.driveClient = new DriveClient(this.oauthClient);
    this.scanner = new Scanner(this.app, this.driveClient);
    this.syncEngine = new SyncEngine(this.app, this.driveClient, this.scanner, this.logger);
    
    this.logger.info('GDrive Sync Plugin loaded.');

    const ribbonIconEl = this.addRibbonIcon('refresh-cw', 'Sync with Google Drive', async (evt: MouseEvent) => {
      this.updateStatusBar('Syncing...');
      await this.runSync();
    });
    ribbonIconEl.addClass('gdrive-sync-ribbon-class');

    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar('Ready');

    this.addSettingTab(new GDriveSyncSettingTab(this.app, this));

    // Debounced sync function (waits 15 seconds after last change)
    const requestAutoSync = debounce(async () => {
      if (this.settings.syncInterval > 0) {
        this.updateStatusBar('Auto-Syncing...');
        await this.runSync();
      }
    }, 15000, true);

    this.registerEvent(this.app.vault.on('modify', requestAutoSync));
    this.registerEvent(this.app.vault.on('create', requestAutoSync));
    this.registerEvent(this.app.vault.on('delete', requestAutoSync));
    this.registerEvent(this.app.vault.on('rename', requestAutoSync));
  }

  updateStatusBar(text: string) {
    this.statusBarItemEl.setText(`GDrive Sync: ${text}`);
  }

  async runSync() {
    if (!this.settings.tokens) {
      this.updateStatusBar('Not Authenticated');
      return;
    }
    try {
      await this.syncEngine.runSync(this.settings.syncFolder, '\\.obsidian|\\.trash');
      this.updateStatusBar(`Last sync: ${new Date().toLocaleTimeString()}`);
    } catch (e: any) {
      this.logger.error('Sync failed in runSync', e);
      this.updateStatusBar('Sync Failed');
    }
  }

  onunload() {
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // update oauth client if secrets change
    this.oauthClient = new OAuthClient(this.settings.clientId, this.settings.clientSecret, this.settings.tokens || undefined);
    this.driveClient = new DriveClient(this.oauthClient);
    this.scanner = new Scanner(this.app, this.driveClient);
    this.syncEngine = new SyncEngine(this.app, this.driveClient, this.scanner, this.logger);
  }
}
