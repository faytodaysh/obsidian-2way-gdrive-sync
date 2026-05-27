import { SyncEngine } from './sync-engine';
import { DriveClient } from './drive-client';
import { Scanner } from './scanner';
import { App, TFile } from 'obsidian';
import { OAuthClient } from './oauth';

jest.mock('obsidian');

describe('SyncEngine (Three-Way Reconciliation)', () => {
  let app: App;
  let driveClient: jest.Mocked<DriveClient>;
  let scanner: jest.Mocked<Scanner>;
  let syncEngine: SyncEngine;

  beforeEach(() => {
    app = new App();
    const oauth = new OAuthClient('', '');
    driveClient = new DriveClient(oauth) as jest.Mocked<DriveClient>;
    scanner = new Scanner(app, driveClient) as jest.Mocked<Scanner>;
    syncEngine = new SyncEngine(app, driveClient, scanner);

    driveClient.listFiles = jest.fn().mockResolvedValue([{ id: 'folderId', name: 'ObsidianVault' }]);
    driveClient.downloadFile = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    driveClient.updateFile = jest.fn().mockResolvedValue({ id: 'updatedId' });
    driveClient.uploadFile = jest.fn().mockResolvedValue({ id: 'newId' });
    driveClient.deleteFile = jest.fn().mockResolvedValue(undefined);

    scanner.scanLocalVault = jest.fn().mockResolvedValue({});
    scanner.scanDriveFolder = jest.fn().mockResolvedValue({});
    
    app.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);
  });

  it('1. Upload Local Modified File', async () => {
    scanner.scanLocalVault.mockResolvedValue({
      'test.md': { path: 'test.md', name: 'test.md', md5: 'local_hash', mtime: 1000 }
    });
    scanner.scanDriveFolder.mockResolvedValue({});
    app.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

    await syncEngine.runSync('ObsidianVault');

    expect(driveClient.uploadFile).toHaveBeenCalledWith('test.md', 'folderId', undefined);
    expect(app.vault.create).toHaveBeenCalledWith(
      '.gdrive-sync-metadata.json',
      expect.stringContaining('"fileId": "newId"')
    );
  });

  it('2. Handle Edit Conflict (Rename Remote & Upload Local)', async () => {
    scanner.scanLocalVault.mockResolvedValue({
      'conflict.md': { path: 'conflict.md', name: 'conflict.md', md5: 'hash_A', mtime: 1000 }
    });
    scanner.scanDriveFolder.mockResolvedValue({
      'conflict.md': { id: 'remote1', name: 'conflict.md', mimeType: 'text/markdown', md5Checksum: 'hash_B' }
    });
    
    const mockTFile = new TFile();
    app.vault.getAbstractFileByPath = jest.fn().mockReturnValue(mockTFile);
    app.vault.read = jest.fn().mockResolvedValue(JSON.stringify({
      lastSyncTime: 900,
      files: {
        'conflict.md': { fileId: 'remote1', md5: 'hash_C', mtime: 900 }
      }
    }));

    await syncEngine.runSync('ObsidianVault');

    expect(driveClient.downloadFile).toHaveBeenCalledWith('remote1');
    expect(app.vault.createBinary).toHaveBeenCalledWith(expect.stringContaining('_(Conflict_'), expect.anything());
    expect(driveClient.updateFile).toHaveBeenCalledWith('remote1', undefined);
  });
});
