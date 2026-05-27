# Obsidian 2-Way Google Drive Sync

[🇺🇸 English](./README.md)

这是一个为 Obsidian 和 Google Drive 量身打造的无缝、安全、直连的双向同步插件。它能让您的 Obsidian 库在桌面端和移动端之间，直接与您个人的 Google Drive 文件夹进行双向同步，彻底告别对任何第三方中心化服务器的依赖。

## 为什么开发这个插件？
因为现有的部分优秀的云同步插件需要付费订阅，而社区中免费的其他 Google Drive 插件大多只支持单向同步（仅能备份）。因此，我决定亲自开发这款插件，旨在为大家提供一个**完全免费**、**真正的双向同步**解决方案，让您的数据完全掌握在自己手中。

## 核心特性
- **真正的双向同步**：智能的三方状态比对引擎 (Three-Way Reconciliation) 安全处理各种上传、下载，并在发生编辑冲突时自动保护文件。
- **隐私至上**：使用您自己的 Google Cloud API 密钥。数据从您的设备直达谷歌，没有任何中间商赚差价，也没有任何第三方服务器能看到您的笔记。
- **全平台兼容**：借助跨平台的哈希算法和原生请求，在 iOS 和 Android 版的 Obsidian 上同样运行完美。
- **智能静默同步**：自动检测您的输入状态，在您停止打字后于后台静默同步您的更改。

## 初始配置指南

要使用此插件，您需要提供您专属的 Google Client ID 和 Client Secret。这大约需要花费您 5 分钟的时间来设置，但能确保您拥有独立、免费且额度充足的 API。

### 1. 创建 Google Cloud 项目
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 创建一个新的项目（例如命名为 "Obsidian Sync"）。
3. 导航到 **API 和服务 (APIs & Services) > 库 (Library)**，搜索 **Google Drive API**，点击 **启用 (Enable)**。

### 2. 配置 OAuth 同意屏幕
1. 导航到 **API 和服务 > OAuth 同意屏幕 (OAuth consent screen)**。
2. User Type 选择 **外部 (External)** 并点击创建。
3. 填写必填信息（应用名称、用户支持邮箱、开发者联系信息等）。
4. **重要提醒**：在 **发布状态 (Publishing status)** 处，一定要点击 **发布应用 (Publish App)** 将其变更为“生产环境 (In production)”。如果保持在测试状态，您的授权 Token 每 7 天就会过期失效一次。

### 3. 生成凭据 (Credentials)
1. 导航到 **API 和服务 > 凭据 (Credentials)**。
2. 点击顶部 **创建凭据 (Create Credentials) > OAuth 客户端 ID (OAuth client ID)**。
3. 应用类型选择 **桌面应用 (Desktop app)**（或者 Web 应用，并将重定向 URI 设置为 `http://127.0.0.1:53134`）。
4. 创建成功后，您将获得属于您的 **Client ID** 和 **Client Secret**。

### 4. 在 Obsidian 中进行授权
1. 打开 Obsidian 的 设置 > Obsidian 2-Way Google Drive Sync。
2. 粘贴您的 **Client ID** 和 **Client Secret**。
3. 点击 **Authorize (授权)**。浏览器将会弹出一个页面，请使用您的 Google 账号登录。
4. 如果浏览器重定向到了一个无法访问的 `127.0.0.1` 页面，请查看浏览器顶部地址栏的网址。复制 `code=` 后面的那串代码，并将其粘贴到 Obsidian 设置里的 **Manual Auth Code (手动授权码)** 输入框中。
5. 大功告成！同步已开启。

## 开发者指令
```bash
npm install
npm run dev
npm run build
```

## 开源协议

本项目采用 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** 协议。

您可以在保留原作者署名的前提下，自由地将本软件用于个人非商业用途、修改并重新发布，且您的修改版本也必须采用相同的协议发布。**严禁将其用于任何商业用途。**
