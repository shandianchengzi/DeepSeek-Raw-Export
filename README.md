[EN](./README_EN.md) / 中文版

# DeepSeek / ChatGPT 对话 Markdown 导出

一个油猴脚本，支持在 **DeepSeek** 和 **ChatGPT** 网页端一键导出当前对话为 Markdown（`.md`），区分用户消息与 AI 回复。

## 功能特点

- **一份脚本，两处可用**：支持 `chat.deepseek.com`、`chatgpt.com` 和 `chat.openai.com`。
- **DeepSeek**：延用 v3.1 的复制按钮拦截逻辑，提取网页提供的原始 Markdown，保留已有提取进度显示。
- **ChatGPT**：按当前可见会话及消息顺序提取，支持普通聊天以及一个用户回合内包含多条 AI 回复的 Work 对话。
- **Markdown 格式**：ChatGPT 导出尽量保留标题、列表、代码块、表格、链接、引用、可见的图片链接及附件名称，自动生成带日期的文件名。
- **防止串会话**：ChatGPT 导出仅读取当前可见对话区域，不混入网页缓存的隐藏会话。

## 使用效果

以下截图为 **DeepSeek** 原有导出效果；ChatGPT 使用页面右下角的「📥 导出 Markdown」按钮。


### 提取过程
![导出时效果](image-export-process.png)
*实时显示提取进度，蓝色边框标识用户输入，红色边框标识 AI 回答*

### 导出结果
![导出结果展示](image-export-result.png)
*导出的 Markdown 文件自动添加角色标识和时间戳*

## Greasyfork 下载链接

[https://greasyfork.org/zh-CN/scripts/563762-deepseek原始对话导出](https://greasyfork.org/zh-CN/scripts/563762-deepseek%E5%8E%9F%E5%A7%8B%E5%AF%B9%E8%AF%9D%E5%AF%BC%E5%87%BA)

## 安装与使用

1. 安装 Tampermonkey，并安装仓库中的 [main.js](./main.js)（或使用下方 Greasy Fork 链接安装）。
2. 打开 DeepSeek 或 ChatGPT 的**具体对话页面**，等待内容加载。
3. DeepSeek 点击右上角「📥 导出对话」；ChatGPT 点击右下角「📥 导出 Markdown」。
4. 自动下载当前对话的 Markdown 文件。

## 注意事项

- **ChatGPT 为 DOM 提取**：只能导出网页当前已加载的消息。长对话请先向上滚动、加载更早的消息；未加载时会提示导出可能不完整。
- ChatGPT 的交互组件（地图、动态图表等）无法完整还原到静态 Markdown；不可见的内部推理过程不在导出范围内。
- ChatGPT 文本、代码块、表格、引用等受前端结构变化影响，若网站大幅改版，需要更新适配器。
- **DeepSeek 使用原有复制机制**：导出过程中不要切换页面或刷新，不会实际向系统剪贴板写入提取到的内容。
- 如果之前安装了独立的 ChatGPT Markdown 导出脚本，建议停用旧脚本，避免两个按钮同时出现。
- GitHub 上的代码更新**不等同于** Greasy Fork 脚本发布；通过 Greasy Fork 安装的用户需要等待该平台更新版本。

## 技术原理

- **DeepSeek**：识别用户/助手消息的复制按钮，逐条点击并暂时拦截 `navigator.clipboard.writeText`，收集页面原始 Markdown 后按角色组合导出。此分支保留仓库 v3.1 的实现。
- **ChatGPT**：在当前可见 `main` 中查找消息容器，将已渲染的 DOM 转换为 Markdown；支持常见文本格式及多助手回复，并在缺失早期消息或正文时提示。

两个平台分别使用独立的解析模块，脚本按当前域名选择执行的模块。

## 更新日志

**v3.2** (2026-10-11)
- 将 DeepSeek 和 ChatGPT 合并为一个油猴脚本，新增 ChatGPT Markdown 导出
- 保留原有 DeepSeek 复制式导出逻辑；增加 ChatGPT 的当前可见会话识别和不完整导出提示
- 更新脚本元数据与中英文说明


**v3.0** (2026-01-23)
- 新增独立的进度提示框，不再被按钮遮挡
- 优化按钮状态管理，提取过程中禁用按钮防止重复点击
- 改进恢复时机，根据操作结果智能调整显示时长

**v2.0** (2026-01-23)
- 精准识别对话框按钮，排除代码块和图片的复制按钮
- 自动区分用户输入和 AI 回答
- 优化导出格式，添加角色图标和统计信息

**v1.0** (2026-01-23)
- 基础导出功能实现

## 更详细的介绍
[【开源工具】DeepSeek-Raw-Export｜油猴脚本使用 DeepSeek 的复制按键直接导出-CSDN博客](https://shandianchengzi.blog.csdn.net/article/details/157300233)
