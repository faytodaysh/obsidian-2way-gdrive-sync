import { App } from 'obsidian';
import GDriveSyncPlugin from './main';

export class Logger {
    private plugin: GDriveSyncPlugin;
    private logFile: string;
    private memoryLogs: string[] = [];
    
    constructor(plugin: GDriveSyncPlugin) {
        this.plugin = plugin;
        this.logFile = this.plugin.manifest.dir + '/sync.log';
    }

    private async appendLog(level: string, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] [${level}] ${message}`;
        if (data) {
            if (data instanceof Error) {
                logLine += `\nError: ${data.message}\n${data.stack}`;
            } else {
                try {
                    logLine += `\nData: ${JSON.stringify(data, null, 2)}`;
                } catch (e) {
                    logLine += `\nData: [Unserializable Object]`;
                }
            }
        }
        logLine += '\n';

        console.log(logLine.trim());
        this.memoryLogs.push(logLine);
        if (this.memoryLogs.length > 1000) {
            this.memoryLogs.shift();
        }

        try {
            const exists = await this.plugin.app.vault.adapter.exists(this.logFile);
            if (exists) {
                const stat = await this.plugin.app.vault.adapter.stat(this.logFile);
                if (stat && stat.size > 5 * 1024 * 1024) { // 5MB limit
                     await this.plugin.app.vault.adapter.write(this.logFile, logLine);
                } else {
                     await this.plugin.app.vault.adapter.append(this.logFile, logLine);
                }
            } else {
                await this.plugin.app.vault.adapter.write(this.logFile, logLine);
            }
        } catch (e) {
            console.error('Failed to write to sync.log', e);
        }
    }

    public info(message: string, data?: any) {
        this.appendLog('INFO', message, data);
    }

    public warn(message: string, data?: any) {
        this.appendLog('WARN', message, data);
    }

    public error(message: string, error?: any) {
        this.appendLog('ERROR', message, error);
    }

    public async getLogs(): Promise<string> {
        try {
            const exists = await this.plugin.app.vault.adapter.exists(this.logFile);
            if (exists) {
                return await this.plugin.app.vault.adapter.read(this.logFile);
            }
        } catch (e) {
            console.error('Failed to read sync.log', e);
        }
        return this.memoryLogs.join('');
    }

    public async clearLogs() {
        this.memoryLogs = [];
        try {
            await this.plugin.app.vault.adapter.write(this.logFile, '');
        } catch (e) {
            console.error('Failed to clear sync.log', e);
        }
    }
}
