import { App, Notice, TFile } from 'obsidian';
import { DriveClient } from './drive-client';
import { Scanner } from './scanner';
import { calculateMD5 } from './md5';

export interface SyncMetadataStore {
  lastSyncTime: number;
  files: Record<string, {
    fileId: string;
    md5: string;
    mtime: number;
  }>;
}

export class SyncEngine {
  private app: App;
  private driveClient: DriveClient;
  private scanner: Scanner;
  private metadataFile = '.gdrive-sync-metadata.json';
  
  constructor(app: App, driveClient: DriveClient, scanner: Scanner) {
    this.app = app;
    this.driveClient = driveClient;
    this.scanner = scanner;
  }

  private async loadMetadata(): Promise<SyncMetadataStore> {
    const file = this.app.vault.getAbstractFileByPath(this.metadataFile);
    if (file instanceof TFile) {
      const content = await this.app.vault.read(file);
      try {
        return JSON.parse(content) as SyncMetadataStore;
      } catch (e) {
        return { lastSyncTime: 0, files: {} };
      }
    }
    return { lastSyncTime: 0, files: {} };
  }

  private async saveMetadata(metadata: SyncMetadataStore) {
    const file = this.app.vault.getAbstractFileByPath(this.metadataFile);
    const content = JSON.stringify(metadata, null, 2);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      await this.app.vault.create(this.metadataFile, content);
    }
  }

  private async getOrCreateDriveFolder(folderName: string, parentId?: string): Promise<string> {
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) query += ` and '${parentId}' in parents`;
    
    const existing = await this.driveClient.listFiles(query);
    if (existing.length > 0) {
      return existing[0].id;
    }
    const created = await this.driveClient.createFolder(folderName, parentId);
    return created.id;
  }
  
  private async ensureRemotePath(rootFolderId: string, filePath: string): Promise<string> {
    const parts = filePath.split('/');
    if (parts.length === 1) return rootFolderId;
    
    let currentParentId = rootFolderId;
    for (let i = 0; i < parts.length - 1; i++) {
        currentParentId = await this.getOrCreateDriveFolder(parts[i], currentParentId);
    }
    return currentParentId;
  }

  public async runSync(syncFolderName: string, excludePattern: string = '') {
    new Notice('Starting Google Drive Sync...');
    try {
      const driveFolderId = await this.getOrCreateDriveFolder(syncFolderName);
      
      const localFiles = await this.scanner.scanLocalVault(excludePattern);
      const remoteFiles = await this.scanner.scanDriveFolder(driveFolderId);
      const metadata = await this.loadMetadata();
      
      const newMetadata: SyncMetadataStore = {
        lastSyncTime: Date.now(),
        files: {}
      };

      const allPaths = new Set([...Object.keys(localFiles), ...Object.keys(remoteFiles), ...Object.keys(metadata.files)]);
      allPaths.delete(this.metadataFile);

      for (const path of allPaths) {
        const local = localFiles[path];
        const remote = remoteFiles[path];
        const lastSync = metadata.files[path];

        const localModified = local && (!lastSync || local.md5 !== lastSync.md5);
        const remoteModified = remote && (!lastSync || remote.md5Checksum !== lastSync.md5);
        
        // 1. Conflict: Both modified
        if (localModified && remoteModified && local.md5 !== remote.md5Checksum) {
           console.log(`[Sync] Conflict on ${path}. Handling conflict...`);
           const conflictContent = await this.driveClient.downloadFile(remote.id);
           const conflictExtIdx = path.lastIndexOf('.');
           const ext = conflictExtIdx > -1 ? path.substring(conflictExtIdx) : '';
           const base = conflictExtIdx > -1 ? path.substring(0, conflictExtIdx) : path;
           const conflictPath = `${base}_(Conflict_${Date.now()})${ext}`;
           
           await this.app.vault.createBinary(conflictPath, conflictContent);
           
           const localContent = await this.app.vault.readBinary(this.app.vault.getAbstractFileByPath(path) as TFile);
           const updatedRemote = await this.driveClient.updateFile(remote.id, localContent);
           
           newMetadata.files[path] = { fileId: updatedRemote.id, md5: local.md5, mtime: local.mtime };
           continue;
        }

        // 2. Local Modified (Upload)
        if (localModified && !remoteModified) {
          console.log(`[Sync] Uploading local changes for ${path}`);
          const fileObj = this.app.vault.getAbstractFileByPath(path) as TFile;
          const localContent = await this.app.vault.readBinary(fileObj);
          
          if (remote) {
            const updatedRemote = await this.driveClient.updateFile(remote.id, localContent);
            newMetadata.files[path] = { fileId: updatedRemote.id, md5: local.md5, mtime: local.mtime };
          } else {
            const parentId = await this.ensureRemotePath(driveFolderId, path);
            const fileName = path.split('/').pop() || path;
            const newRemote = await this.driveClient.uploadFile(fileName, parentId, localContent);
            newMetadata.files[path] = { fileId: newRemote.id, md5: local.md5, mtime: local.mtime };
          }
          continue;
        }

        // 3. Remote Modified (Download)
        if (remoteModified && !localModified) {
           console.log(`[Sync] Downloading remote changes for ${path}`);
           const remoteContent = await this.driveClient.downloadFile(remote.id);
           
           // Ensure local folders exist
           const parts = path.split('/');
           if (parts.length > 1) {
               const folderPath = parts.slice(0, -1).join('/');
               if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                   await this.app.vault.createFolder(folderPath);
               }
           }

           let fileObj = this.app.vault.getAbstractFileByPath(path);
           if (fileObj instanceof TFile) {
             await this.app.vault.modifyBinary(fileObj, remoteContent);
           } else {
             fileObj = await this.app.vault.createBinary(path, remoteContent);
           }
           
           newMetadata.files[path] = { fileId: remote.id, md5: remote.md5Checksum || calculateMD5(remoteContent), mtime: (fileObj as TFile).stat.mtime };
           continue;
        }

        // 4. Local Deleted
        if (!local && lastSync && !remoteModified) {
           console.log(`[Sync] Local deleted. Deleting remote for ${path}`);
           if (remote) {
             await this.driveClient.deleteFile(remote.id);
           }
           continue;
        }

        // 5. Remote Deleted
        if (!remote && lastSync && !localModified) {
           console.log(`[Sync] Remote deleted. Deleting local for ${path}`);
           if (local) {
             const fileObj = this.app.vault.getAbstractFileByPath(path);
             if (fileObj) await this.app.vault.trash(fileObj, true);
           }
           continue;
        }

        // 6. Both Identical / No Changes
        if (local && remote && !localModified && !remoteModified) {
           newMetadata.files[path] = lastSync;
        }
      }

      await this.saveMetadata(newMetadata);
      new Notice('Google Drive Sync Completed Successfully!');
    } catch (error: any) {
      console.error('[Sync Engine Error]', error);
      new Notice(`Sync failed: ${error.message}`);
    }
  }
}
