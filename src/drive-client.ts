import { requestUrl, RequestUrlParam } from 'obsidian';
import { OAuthClient } from './oauth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  modifiedTime?: string;
  parents?: string[];
  size?: string;
}

export class DriveClient {
  private oauth: OAuthClient;
  private readonly DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
  private readonly DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

  constructor(oauth: OAuthClient) {
    this.oauth = oauth;
  }

  private async request(endpoint: string, options: Partial<RequestUrlParam> = {}): Promise<any> {
    const token = await this.oauth.getValidAccessToken();
    const url = endpoint.startsWith('http') ? endpoint : `${this.DRIVE_API_URL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await requestUrl({
      url,
      ...options,
      headers
    });

    if (response.status >= 400) {
      throw new Error(`Drive API Error: ${response.status} ${response.text}`);
    }

    if (options.method === 'GET' && !endpoint.includes('alt=media')) {
       return response.json;
    }
    
    if (endpoint.includes('alt=media') || endpoint.startsWith(this.DRIVE_UPLOAD_URL)) {
        return response;
    }

    return response.json;
  }

  async listFiles(query: string = '', fields: string = 'files(id, name, mimeType, md5Checksum, modifiedTime, parents, size)'): Promise<DriveFile[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (fields) params.append('fields', fields);
    
    const res = await this.request(`/files?${params.toString()}`);
    return res.files || [];
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFile> {
    const body: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      body.parents = [parentId];
    }

    return await this.request('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const res = await this.request(`/files/${fileId}?alt=media`, { method: 'GET' });
    return res.arrayBuffer;
  }

  async uploadFile(name: string, parentId: string, content: ArrayBuffer, mimeType: string = 'text/markdown'): Promise<DriveFile> {
    const metadata = { name, parents: [parentId] };
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataStr = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataStr);
    
    const contentTypeHeader1 = 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    const contentTypeHeader2 = `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    
    const parts = [
      new TextEncoder().encode(delimiter + contentTypeHeader1 + metadataStr + contentTypeHeader2),
      new Uint8Array(content),
      new TextEncoder().encode(closeDelimiter)
    ];
    
    const totalLength = parts.reduce((acc, val) => acc + val.length, 0);
    const bodyBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      bodyBuffer.set(part, offset);
      offset += part.length;
    }

    const res = await this.request(`${this.DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: bodyBuffer.buffer
    });
    
    return res.json;
  }

  async updateFile(fileId: string, content: ArrayBuffer, mimeType: string = 'text/markdown'): Promise<DriveFile> {
    const res = await this.request(`${this.DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Content-Type': mimeType
      },
      body: content
    });
    return res.json;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.request(`/files/${fileId}`, { method: 'DELETE' });
  }
}
