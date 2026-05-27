import { App, Modal, Setting, Notice } from 'obsidian';
import { Logger } from './logger';

export class LogModal extends Modal {
    private logger: Logger;

    constructor(app: App, logger: Logger) {
        super(app);
        this.logger = logger;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Sync Logs' });
        
        const logs = await this.logger.getLogs();
        
        const textArea = contentEl.createEl('textarea');
        textArea.style.width = '100%';
        textArea.style.height = '400px';
        textArea.style.resize = 'vertical';
        textArea.style.fontFamily = 'monospace';
        textArea.style.whiteSpace = 'pre';
        textArea.readOnly = true;
        textArea.value = logs || 'No logs yet.';

        // Scroll to bottom
        setTimeout(() => {
            textArea.scrollTop = textArea.scrollHeight;
        }, 10);

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Copy to Clipboard')
                .onClick(async () => {
                    await navigator.clipboard.writeText(textArea.value);
                    new Notice('Logs copied to clipboard!');
                }))
            .addButton(btn => btn
                .setButtonText('Clear Logs')
                .setWarning()
                .onClick(async () => {
                    await this.logger.clearLogs();
                    textArea.value = 'No logs yet.';
                    new Notice('Logs cleared.');
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
