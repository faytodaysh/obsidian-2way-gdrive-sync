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

## 初始配置指南（请仔细阅读）

由于此插件抛弃了所有的中心化服务器、直接与您的 Google Drive 连通，您需要亲自去申请属于您自己的 Google Client ID 和 Secret。配置 Google Cloud Console 的流程可能看起来有些繁琐，但这能确保您的数据绝对安全、且 API 额度无限使用。整个过程大约需要 5 分钟。

### 1. 创建 Google Cloud 项目并开启 API
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 点击页面左上角的 **选择项目**，然后在弹出窗口右上角点击 **新建项目 (New Project)**。随便起个名字并创建。
3. 在页面顶部中间的搜索框里，搜索 **Google Drive API**，点击进入详情页，然后点击蓝色的 **启用 (Enable)** 按钮。

### 2. 配置 Google Auth Platform (OAuth 同意屏幕)
1. 点击网页左上角的汉堡菜单，依次进入 **API 和服务 (APIs & Services) > OAuth 同意屏幕**（或者 **Google Auth Platform**）。
2. 如果提示您开始配置，请点击开始。随便填写一下 **应用名称**，并在两处需要填邮箱的地方下拉选择您自己的邮箱。
3. 如果系统询问 **受众类型 / User Type**，请务必选择 **外部 (External)**。
4. **⚠️ 极其关键的一步**：在 Auth Platform 的“目标对象 (Audience)”或“概览”页面中，您会看到一个 **发布状态 (Publishing status)**。它默认是“测试中 (Testing)”。您**必须**点击旁边的 **发布应用 (Publish App)** 或 **推送至生产环境**，确保它的状态变成“生产环境 (In production)”。如果不发布，授权时会报错“应用未验证或仅限测试人员”，且 Token 每 7 天就会过期失效。

### 3. 生成专属密钥 (Credentials)
1. 在左侧菜单中点击 **客户端 (Clients)** 或 **凭据 (Credentials)**。
2. 点击顶部的 **+ 创建客户端 / 创建凭据**，选择 **OAuth 客户端 ID (OAuth client ID)**。
3. 应用类型**必须选择**：**桌面应用 (Desktop app)**，名称随便填，点击创建。
4. 此时屏幕上会弹出一个窗口，里面包含了您的 **客户端 ID (Client ID)** 和 **客户端密钥 (Client Secret)**。（如果您不小心关掉了弹窗，点击列表中名字右侧的 ✎ 铅笔图标即可再次查看）。

### 4. 在 Obsidian 中完成最后授权
1. 打开 Obsidian 设置 > 第三方插件 > 找到并开启 Obsidian 2-Way Google Drive Sync 的设置页。
2. 将刚才的 **Client ID** 和 **Client Secret** 分别复制粘贴到前两个输入框里。
3. 点击紫色的 **Authorize (授权)** 按钮。您的浏览器会弹出一个页面让您登录 Google 账号。
4. **⚠️ 警报说明**：登录后，Google 会弹出一个非常吓人的红色警告界面（“Google 尚未验证此应用”）。**这是绝对正常的！** 因为这是您私人的应用，没有花钱做安全审计。请点击左下角不太显眼的小字 **高级 (Advanced)**，然后点击底部的 **转至 [您的应用名]（不安全） / Go to [Your App Name] (unsafe)** 继续。
5. 勾选赋予访问 Google Drive 的权限。完成后，浏览器会重定向到一个打不开的 `127.0.0.1` 页面。**这同样是正常的！**
6. 点击浏览器最顶部的网址地址栏，找到网址里 `code=` 后面的那一大串毫无规律的代码，并复制它（复制到 `&scope=` 前面为止）。
7. 切回 Obsidian，把这串代码粘贴到 **Manual Auth Code (手动授权码)** 输入框中，并在屏幕空白处随便点一下。
8. 稍等两秒，状态变为 **Authenticated ✓**。大功告成，您的双向同步引擎已正式启动！

## 开发者指令
```bash
npm install
npm run dev
npm run build
```

## 开源协议

本项目采用 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** 协议。

您可以在保留原作者署名的前提下，自由地将本软件用于个人非商业用途、修改并重新发布，且您的修改版本也必须采用相同的协议发布。**严禁将其用于任何商业用途。**
