
EN / [中文](./README.md)

# DeepSeek / ChatGPT Markdown Exporter

One userscript to export the current conversation from **DeepSeek** or **ChatGPT** into a Markdown (`.md`) file, preserving user/assistant roles.

## Features

- **One userscript, two services**: works on `chat.deepseek.com`, `chatgpt.com`, and `chat.openai.com`.
- **DeepSeek**: preserves the existing v3.1 copy-button interception and progress feedback to capture original Markdown.
- **ChatGPT**: extracts messages from the active visible conversation (including multiple assistant responses within a Work turn) without mixing hidden conversations.
- **Markdown conversion**: retains available headings, lists, code blocks, tables, links, citations, image URLs, and attachment names on ChatGPT. Exports a dated filename.
- **Incomplete history notice**: warns when earlier messages or assistant bodies are not loaded in the current ChatGPT page.

## Usage Effect

The following screenshots show the existing **DeepSeek** exporter. On ChatGPT, use the new bottom-right “📥 导出 Markdown” button.


### Extraction Process
![Export Process](image-export-process.png)
*Real-time display of extraction progress, blue borders indicate user input, red borders indicate AI responses*

### Export Results
![Export Result Showcase](image-export-result.png)
*Exported Markdown files automatically include role identifiers and timestamps*

## Greasyfork Download Link

[https://greasyfork.org/en/scripts/563762-deepseek-conversation-exporter](https://greasyfork.org/en/scripts/563762-deepseek-conversation-exporter)

## Installation and Usage

1. Install Tampermonkey, then install [main.js](./main.js) from this repository or the Greasy Fork listing linked below.
2. Open a specific conversation in DeepSeek or ChatGPT and wait until it loads.
3. Use “📥 导出对话” (top right) on DeepSeek or “📥 导出 Markdown” (bottom right) on ChatGPT.
4. Download the generated Markdown file.

## Notes

- **ChatGPT uses the rendered DOM**, not a private API. Earlier messages must first be loaded (scroll upward in long chats); missing history is reported but cannot be automatically recovered.
- Interactive widgets, live maps/charts and hidden internal reasoning cannot be completely represented in static Markdown.
- ChatGPT HTML changes may require selector updates.
- Keep the DeepSeek conversation open during extraction; its existing copy interception does not write extracted content to the system clipboard.
- Disable any separate ChatGPT exporter you previously installed to avoid duplicate controls.
- Updating this GitHub repository does **not** automatically publish a new version to Greasy Fork.

## Technical Principles

- **DeepSeek**: identifies message copy buttons, intercepts `navigator.clipboard.writeText`, and assembles captured original Markdown. The existing v3.1 implementation is retained.
- **ChatGPT**: reads only the visible active `main`, enumerates messages in DOM order, converts rendered content to Markdown, and warns about missing history or message bodies.

The script selects the appropriate site adapter by hostname.

## Changelog

**v3.2** (2026-10-11)
- Combined DeepSeek and ChatGPT Markdown exports in a single userscript
- Preserved the existing DeepSeek copy-based exporter and added ChatGPT active-conversation extraction
- Updated metadata and bilingual documentation


**v3.0** (2026-01-23)
- Added independent progress notification box that is no longer obscured by buttons
- Optimized button state management, disabling buttons during extraction to prevent duplicate clicks
- Improved recovery timing with intelligent display duration adjustment based on operation results

**v2.0** (2026-01-23)
- Precise identification of dialog box buttons, excluding copy buttons from code blocks and images
- Automatic distinction between user input and AI responses
- Optimized export format with role icons and statistical information

**v1.0** (2026-01-23)
- Basic export functionality implementation

## More Detailed Introduction
[【开源工具】DeepSeek-Raw-Export｜油猴脚本使用 DeepSeek 的复制按键直接导出-CSDN博客](https://shandianchengzi.blog.csdn.net/article/details/157300233)