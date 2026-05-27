import { App, Modal, Setting } from 'obsidian';

export interface ConflictResolveResult {
  choice: 'local' | 'remote' | 'merged';
  mergedContent?: string;
}

export class ConflictModal extends Modal {
  private filePath: string;
  private localContent: string;
  private remoteContent: string;
  private autoMergedContent: string;
  private resolvePromise: (value: ConflictResolveResult) => void;
  private isResolved = false;

  constructor(
    app: App,
    filePath: string,
    localContent: string,
    remoteContent: string,
    autoMergedContent: string,
    resolvePromise: (value: ConflictResolveResult) => void
  ) {
    super(app);
    this.filePath = filePath;
    this.localContent = localContent;
    this.remoteContent = remoteContent;
    this.autoMergedContent = autoMergedContent;
    this.resolvePromise = resolvePromise;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Style modal wrapper
    this.modalEl.style.width = '80vw';
    this.modalEl.style.maxWidth = '1000px';
    this.modalEl.style.maxHeight = '85vh';
    this.modalEl.style.display = 'flex';
    this.modalEl.style.flexDirection = 'column';

    contentEl.createEl('h2', { 
      text: `🔄 冲突文件解决: ${this.filePath}`, 
      attr: { style: 'margin-bottom: 5px; font-weight: 600;' } 
    });

    contentEl.createEl('p', {
      text: '本地与 Google Drive 均有最新修改。请对比下方内容，并选择适合您的处理方案。',
      attr: { style: 'color: var(--text-muted); margin-bottom: 20px; font-size: 0.9em;' }
    });

    // Create 2-column side-by-side compare layout
    const columnsContainer = contentEl.createDiv({
      attr: { 
        style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex-grow: 1; min-height: 250px; margin-bottom: 20px;' 
      }
    });

    // Local column
    const localCol = columnsContainer.createDiv({
      attr: { style: 'display: flex; flex-direction: column;' }
    });
    localCol.createEl('h4', { text: '💻 本地设备内容 (Local)', attr: { style: 'margin-top:0; color: var(--text-accent);' } });
    const localText = localCol.createEl('textarea', {
      value: this.localContent,
      attr: { 
        readonly: 'true', 
        style: 'width: 100%; flex-grow: 1; font-family: var(--font-monospace); font-size: 0.85em; padding: 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border); background-color: var(--background-secondary); resize: none;' 
      }
    });

    // Remote column
    const remoteCol = columnsContainer.createDiv({
      attr: { style: 'display: flex; flex-direction: column;' }
    });
    remoteCol.createEl('h4', { text: '☁️ Google Drive 云端内容 (Remote)', attr: { style: 'margin-top:0; color: var(--text-success);' } });
    const remoteText = remoteCol.createEl('textarea', {
      value: this.remoteContent,
      attr: { 
        readonly: 'true', 
        style: 'width: 100%; flex-grow: 1; font-family: var(--font-monospace); font-size: 0.85em; padding: 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border); background-color: var(--background-secondary); resize: none;' 
      }
    });

    // Manual merge editing area
    const mergeSection = contentEl.createDiv({
      attr: { style: 'display: flex; flex-direction: column; margin-bottom: 20px;' }
    });
    mergeSection.createEl('h4', { 
      text: '✏️ 合并编辑器 (编辑最终决定保存的内容)', 
      attr: { style: 'margin-top: 0; color: var(--text-warning);' } 
    });
    const mergeTextarea = mergeSection.createEl('textarea', {
      value: this.autoMergedContent || this.localContent,
      attr: { 
        style: 'width: 100%; height: 180px; font-family: var(--font-monospace); font-size: 0.85em; padding: 10px; border-radius: 4px; border: 1px solid var(--background-modifier-border); background-color: var(--background-primary); resize: vertical;' 
      }
    });

    // Control buttons
    const actionContainer = contentEl.createDiv({
      attr: { style: 'display: flex; justify-content: flex-end; gap: 10px;' }
    });

    new Setting(actionContainer)
      .addButton(btn => btn
        .setButtonText('保留本地版本')
        .setCta()
        .onClick(() => {
          this.resolve({ choice: 'local' });
        }))
      .addButton(btn => btn
        .setButtonText('保留云端版本')
        .setClass('gdrive-sync-btn-success')
        .onClick(() => {
          this.resolve({ choice: 'remote' });
        }))
      .addButton(btn => btn
        .setButtonText('提交合并修改')
        .setCta()
        .onClick(() => {
          this.resolve({ choice: 'merged', mergedContent: mergeTextarea.value });
        }));
  }

  private resolve(result: ConflictResolveResult) {
    if (!this.isResolved) {
      this.isResolved = true;
      this.resolvePromise(result);
      this.close();
    }
  }

  onClose() {
    // If the modal was closed without choice, default to 'local' to be safe
    if (!this.isResolved) {
      this.isResolved = true;
      this.resolvePromise({ choice: 'local' });
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}
