import { App, TFile } from 'obsidian';
import { DriveClient, DriveFile } from './drive-client';
import { calculateMD5 } from './md5';

export interface LocalFile {
  path: string;
  name: string;
  md5: string;
  mtime: number;
}

export class Scanner {
  private app: App;
  private driveClient: DriveClient;

  constructor(app: App, driveClient: DriveClient) {
    this.app = app;
    this.driveClient = driveClient;
  }

  async scanLocalVault(excludePattern: string = ''): Promise<Record<string, LocalFile>> {
    const files = this.app.vault.getFiles();
    const result: Record<string, LocalFile> = {};
    const excludeRegex = excludePattern ? new RegExp(excludePattern) : null;

    for (const file of files) {
      if (excludeRegex && excludeRegex.test(file.path)) {
        continue;
      }
      
      const buffer = await this.app.vault.readBinary(file);
      const md5 = calculateMD5(buffer);
      
      result[file.path] = {
        path: file.path,
        name: file.name,
        md5,
        mtime: file.stat.mtime
      };
    }

    return result;
  }

  async scanDriveFolder(folderId: string): Promise<Record<string, DriveFile>> {
    const result: Record<string, DriveFile> = {};
    
    // Recursive traversal to build full relative paths
    const traverse = async (currentFolderId: string, currentPath: string) => {
        const files = await this.driveClient.listFiles(`'${currentFolderId}' in parents and trashed = false`);
        
        for (const file of files) {
            const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                await traverse(file.id, filePath);
            } else {
                result[filePath] = file;
            }
        }
    };

    await traverse(folderId, '');
    return result;
  }
}
