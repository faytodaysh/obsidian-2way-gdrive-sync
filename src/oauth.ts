import { requestUrl, Notice } from 'obsidian';

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  expiry_time?: number;
}

export class OAuthClient {
  private clientId: string;
  private clientSecret: string;
  private tokens: OAuthTokens | null = null;
  private readonly AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';

  constructor(clientId: string, clientSecret: string, tokens?: OAuthTokens) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    if (tokens) {
      this.tokens = tokens;
    }
  }

  setTokens(tokens: OAuthTokens) {
    this.tokens = tokens;
  }

  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: 'http://127.0.0.1:53134',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `${this.AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: 'http://127.0.0.1:53134',
      grant_type: 'authorization_code'
    });

    try {
      const response = await requestUrl({
        url: this.TOKEN_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (response.status !== 200) {
        throw new Error(`Failed to exchange code: ${response.text}`);
      }

      const tokens = response.json as OAuthTokens;
      tokens.expiry_time = Date.now() + tokens.expires_in * 1000;
      this.tokens = tokens;
      return tokens;
    } catch (error) {
      new Notice('Failed to exchange authorization code.');
      console.error(error);
      throw error;
    }
  }

  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }

    if (this.tokens.expiry_time && Date.now() > this.tokens.expiry_time - 60000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  async refreshToken(): Promise<OAuthTokens> {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      refresh_token: this.tokens.refresh_token,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token'
    });

    try {
      const response = await requestUrl({
        url: this.TOKEN_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (response.status !== 200) {
        throw new Error(`Failed to refresh token: ${response.text}`);
      }

      const newTokens = response.json as OAuthTokens;
      
      this.tokens = {
        ...this.tokens,
        ...newTokens,
        refresh_token: newTokens.refresh_token || this.tokens.refresh_token,
        expiry_time: Date.now() + newTokens.expires_in * 1000
      };

      return this.tokens;
    } catch (error) {
      console.error('Failed to refresh token', error);
      throw error;
    }
  }
}
