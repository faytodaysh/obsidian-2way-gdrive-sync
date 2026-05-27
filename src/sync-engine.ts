import { App, Notice, TFile } from 'obsidian';
import { DriveClient } from './drive-client';
import { Scanner } from './scanner';
import { calculateMD5 } from './md5';
import { Logger } from './logger';

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
  private logger: Logger;
  private metadataFile = '.gdrive-sync-metadata.json';
  
  constructor(app: App, driveClient: DriveClient, scanner: Scanner, logger: Logger) {
    this.app = app;
    this.driveClient = driveClient;
    this.scanner = scanner;
    this.logger = logger;
  }

  private async loadMetadata(): Promise<SyncMetadataStore> {
    try {
      if (await this.app.vault.adapter.exists(this.metadataFile)) {
        const content = await this.app.vault.adapter.read(this.metadataFile);
        return JSON.parse(content) as SyncMetadataStore;
      }
    } catch (e) {
      this.logger.error('Failed to load metadata', e);
    }
    return { lastSyncTime: 0, files: {} };
  }

  private async saveMetadata(metadata: SyncMetadataStore) {
    const content = JSON.stringify(metadata, null, 2);
    await this.app.vault.adapter.write(this.metadataFile, content);
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
    this.logger.info('Starting Google Drive Sync...');
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
           this.logger.warn(`[Sync] Conflict on ${path}. Handling conflict...`);
           const conflictContent = await this.driveClient.downloadFile(remote.id);
           const conflictExtIdx = path.lastIndexOf('.');
           const ext = conflictExtIdx > -1 ? path.substring(conflictExtIdx) : '';
           const base = conflictExtIdx > -1 ? path.substring(0, conflictExtIdx) : path;
           const conflictPath = `${base}_(Conflict_${Date.now()})${ext}`;
           
           try {
             await this.app.vault.createBinary(conflictPath, conflictContent);
           } catch (e: any) {
             if (e.message && e.message.includes('already exists')) {
               const existing = this.app.vault.getAbstractFileByPath(conflictPath);
               if (existing instanceof TFile) {
                 await this.app.vault.modifyBinary(existing, conflictContent);
               } else {
                 await this.app.vault.adapter.writeBinary(conflictPath, conflictContent);
               }
             } else {
               throw e;
             }
           }
           
           const localContent = await this.app.vault.adapter.readBinary(path);
           const updatedRemote = await this.driveClient.updateFile(remote.id, localContent);
           
           newMetadata.files[path] = { fileId: updatedRemote.id, md5: local.md5, mtime: local.mtime };
           continue;
        }

        // 2. Local Modified (Upload)
        if (localModified && !remoteModified) {
          this.logger.info(`[Sync] Uploading local changes for ${path}`);
          const localContent = await this.app.vault.adapter.readBinary(path);
          
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
           this.logger.info(`[Sync] Downloading remote changes for ${path}`);
           const remoteContent = await this.driveClient.downloadFile(remote.id);
           
           // Ensure local folders exist (recursively)
           const parts = path.split('/');
           if (parts.length > 1) {
               let currentPath = '';
               for (let i = 0; i < parts.length - 1; i++) {
                   currentPath = currentPath === '' ? parts[i] : currentPath + '/' + parts[i];
                   if (!this.app.vault.getAbstractFileByPath(currentPath)) {
                       try {
                           await this.app.vault.createFolder(currentPath);
                       } catch (e: any) {
                           if (!e.message || !e.message.includes('already exists')) {
                               throw e;
                           }
                       }
                   }
               }
           }

           let fileObj = this.app.vault.getAbstractFileByPath(path);
           if (fileObj instanceof TFile) {
             await this.app.vault.modifyBinary(fileObj, remoteContent);
           } else {
             try {
               fileObj = await this.app.vault.createBinary(path, remoteContent);
             } catch (e: any) {
               if (e.message && e.message.includes('already exists')) {
                 // Fallback to modify if Obsidian cache was stale
                 // We must read it from disk or just try to get it again.
                 // Obsidian API doesn't have a direct raw write if getAbstractFileByPath fails, 
                 // but we can try to find it again or force update.
                 const staleFile = this.app.vault.getAbstractFileByPath(path);
                 if (staleFile instanceof TFile) {
                    await this.app.vault.modifyBinary(staleFile, remoteContent);
                    fileObj = staleFile;
                 } else {
                    // Worst case: use adapter to write directly bypassing cache
                    await this.app.vault.adapter.writeBinary(path, remoteContent);
                    // Still need a TFile for metadata, we might get null, so mtime will be Date.now()
                 }
               } else {
                 throw e;
               }
             }
           }
           
           const finalMtime = fileObj && fileObj instanceof TFile ? fileObj.stat.mtime : Date.now();
           newMetadata.files[path] = { fileId: remote.id, md5: remote.md5Checksum || calculateMD5(remoteContent), mtime: finalMtime };
           continue;
        }

        // 4. Local Deleted
        if (!local && lastSync && !remoteModified) {
           this.logger.info(`[Sync] Local deleted. Deleting remote for ${path}`);
           if (remote) {
             await this.driveClient.deleteFile(remote.id);
           }
           continue;
        }

        // 5. Remote Deleted
        if (!remote && lastSync && !localModified) {
           this.logger.info(`[Sync] Remote deleted. Deleting local for ${path}`);
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
      this.logger.info('Google Drive Sync Completed Successfully!');
      new Notice('Google Drive Sync Completed Successfully!');
    } catch (error: any) {
      this.logger.error('[Sync Engine Error]', error);
      new Notice(`Sync failed: ${error.message}`);
    }
  }
}
