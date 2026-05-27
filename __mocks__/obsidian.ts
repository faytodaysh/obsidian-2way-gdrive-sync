export class App {
  vault = {
    getAbstractFileByPath: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    readBinary: jest.fn(),
    createBinary: jest.fn(),
    modifyBinary: jest.fn(),
    trash: jest.fn(),
    createFolder: jest.fn(),
  };
}
export class TFile {
  stat = { mtime: 12345 };
}
export class Notice {
  constructor(message: string) { }
}
export function requestUrl() { return Promise.resolve(); }
export function debounce(cb: any) { return cb; }
export class PluginSettingTab {}
export class Setting {
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addButton() { return this; }
}
export class Plugin {
  app = new App();
  addRibbonIcon() { return { addClass: jest.fn() }; }
  addStatusBarItem() { return { setText: jest.fn() }; }
  addSettingTab() { }
  registerEvent() { }
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}
