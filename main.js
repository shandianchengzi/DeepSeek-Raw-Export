// ==UserScript==
// @name         DeepSeek & ChatGPT Markdown 导出
// @namespace    https://github.com/shandianchengzi/DeepSeek-Raw-Export
// @version      3.2
// @description  导出 DeepSeek 与 ChatGPT 网页当前对话为 Markdown；DeepSeek 使用原始复制按钮，ChatGPT 使用可见消息 DOM 解析。
// @author       shandianchengzi
// @match        https://chat.deepseek.com/*
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // Keep the legacy DeepSeek copy-button exporter unchanged on DeepSeek only.
    if (location.hostname !== 'chat.deepseek.com') return;

    const COPY_PATH_START = "M6.14923 4.02032";
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    function createUI() {
        const btn = document.createElement('button');
        btn.innerText = "📥 导出对话";
        btn.id = "deepseek-export-btn";
        Object.assign(btn.style, {
            position: "fixed", top: "10px", right: "10px", zIndex: "9999",
            padding: "10px 15px", backgroundColor: "#4d6bfe", color: "white",
            border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            minWidth: "140px", textAlign: "center"
        });

        btn.onclick = startExtraction;
        document.body.appendChild(btn);

        // 创建进度提示框（初始隐藏）
        const progress = document.createElement('div');
        progress.id = "deepseek-progress-tip";
        Object.assign(progress.style, {
            position: "fixed", top: "60px", right: "10px", zIndex: "9999",
            padding: "8px 12px", backgroundColor: "rgba(0,0,0,0.8)", color: "white",
            borderRadius: "6px", fontSize: "13px", display: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        });
        document.body.appendChild(progress);
    }

    // 判断是否为对话框的复制按钮（排除代码块、图片等）
    function isDialogCopyButton(btn) {
        // 检查是否有复制按钮的 SVG 特征
        const path = btn.querySelector('path');
        if (!path || !path.getAttribute('d')?.startsWith(COPY_PATH_START)) {
            return false;
        }

        // 向上查找按钮组容器
        let buttonGroup = btn.parentElement;
        while (buttonGroup && !buttonGroup.classList.contains('ds-flex')) {
            buttonGroup = buttonGroup.parentElement;
        }

        if (!buttonGroup) return false;

        // 统计同级的图标按钮数量
        const siblingButtons = buttonGroup.querySelectorAll('.ds-icon-button');
        const buttonCount = siblingButtons.length;

        // 用户输入框有 2 个按钮（复制、编辑）
        // DeepSeek 回答框有 5 个按钮（复制、重新生成、点赞、点踩、分享）
        // 代码块/图片的复制按钮通常是单独的或按钮数量不同
        return buttonCount === 2 || buttonCount === 5;
    }

    // 判断是用户输入还是 AI 回答
    function isUserInput(btn) {
        let buttonGroup = btn.parentElement;
        while (buttonGroup && !buttonGroup.classList.contains('ds-flex')) {
            buttonGroup = buttonGroup.parentElement;
        }

        if (!buttonGroup) return false;

        const siblingButtons = buttonGroup.querySelectorAll('.ds-icon-button');
        // 2 个按钮 = 用户输入，5 个按钮 = AI 回答
        return siblingButtons.length === 2;
    }

    async function startExtraction() {
        const btnUI = document.getElementById('deepseek-export-btn');
        const progressTip = document.getElementById('deepseek-progress-tip');

        // 查找所有复制按钮
        const allButtons = Array.from(document.querySelectorAll('div[role="button"], button'));
        const dialogButtons = allButtons.filter(isDialogCopyButton);

        if (dialogButtons.length === 0) {
            alert("未找到对话框的复制按钮，请确认页面已加载完毕。");
            return;
        }

        // 禁用按钮，防止重复点击
        btnUI.disabled = true;
        btnUI.style.cursor = "not-allowed";
        btnUI.style.opacity = "0.7";

        const originalText = btnUI.innerText;
        btnUI.innerText = "提取中...";
        btnUI.style.backgroundColor = "#eab308";

        // 显示进度提示
        progressTip.style.display = "block";

        const capturedData = [];
        const originalWriteText = navigator.clipboard.writeText;

        navigator.clipboard.writeText = async (text) => {
            capturedData.push(text);
            return Promise.resolve();
        };

        try {
            for (let i = 0; i < dialogButtons.length; i++) {
                const btn = dialogButtons[i];
                const isUser = isUserInput(btn);

                // 更新进度提示
                progressTip.innerText = `${i + 1}/${dialogButtons.length} ${isUser ? '👤 用户' : '🤖 AI'}`;

                const oldBorder = btn.style.border;
                btn.style.border = isUser ? "2px solid blue" : "2px solid red";

                btn.click();
                await sleep(150);

                btn.style.border = oldBorder;
            }

            if (capturedData.length > 0) {
                let finalContent = "# DeepSeek 对话导出\n\n";
                finalContent += `导出时间: ${new Date().toLocaleString()}\n`;
                finalContent += `对话轮数: ${Math.ceil(capturedData.length / 2)}\n\n`;
                finalContent += "---\n\n";

                dialogButtons.forEach((btn, index) => {
                    const isUser = isUserInput(btn);
                    const content = capturedData[index] || "";

                    if (isUser) {
                        finalContent += `## 👤 用户\n\n`;
                    } else {
                        finalContent += `## 🤖 DeepSeek\n\n`;
                    }

                    finalContent += content;
                    finalContent += `\n\n---\n\n`;
                });

                downloadFile(finalContent, `DeepSeek_对话_${new Date().toISOString().slice(0,10)}.md`);

                btnUI.innerText = "✅ 导出成功";
                btnUI.style.backgroundColor = "#22c55e";
                progressTip.innerText = `✅ 成功导出 ${capturedData.length} 条消息`;

                // 成功后 3 秒恢复
                setTimeout(() => {
                    btnUI.innerText = originalText;
                    btnUI.style.backgroundColor = "#4d6bfe";
                    btnUI.disabled = false;
                    btnUI.style.cursor = "pointer";
                    btnUI.style.opacity = "1";
                    progressTip.style.display = "none";
                }, 3000);

            } else {
                alert("未截获到数据，请重试。");
                btnUI.innerText = "❌ 失败";
                btnUI.style.backgroundColor = "#ef4444";
                progressTip.innerText = "❌ 未截获到数据";

                // 失败后 2 秒恢复
                setTimeout(() => {
                    btnUI.innerText = originalText;
                    btnUI.style.backgroundColor = "#4d6bfe";
                    btnUI.disabled = false;
                    btnUI.style.cursor = "pointer";
                    btnUI.style.opacity = "1";
                    progressTip.style.display = "none";
                }, 2000);
            }

        } catch (e) {
            console.error("提取错误:", e);
            alert("提取过程出错: " + e.message);
            btnUI.innerText = "❌ 错误";
            btnUI.style.backgroundColor = "#ef4444";
            progressTip.innerText = "❌ 提取出错";

            // 错误后 2 秒恢复
            setTimeout(() => {
                btnUI.innerText = originalText;
                btnUI.style.backgroundColor = "#4d6bfe";
                btnUI.disabled = false;
                btnUI.style.cursor = "pointer";
                btnUI.style.opacity = "1";
                progressTip.style.display = "none";
            }, 2000);

        } finally {
            navigator.clipboard.writeText = originalWriteText;
        }
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.addEventListener('load', createUI);
    setTimeout(createUI, 2000);

})();

// -----------------------------------------------------------------------------
// ChatGPT adapter. Export both websites with one installed userscript.
// -----------------------------------------------------------------------------
(() => {
  'use strict';
  // ChatGPT adapter: separate site-specific DOM parsing, with no DeepSeek hooks.
  if (!['chatgpt.com', 'chat.openai.com'].includes(location.hostname)) return;

  const SCRIPT_ID = 'chatgpt-markdown-exporter';
  const OPTIONS = { filenameWithDate: true, includeSourceUrl: true };
  const OMIT_SELECTOR = [
    '[data-markdown-copy="exclude"]', '.turn-action-controls',
    '[role="toolbar"]', 'button', 'script', 'style', 'noscript', 'svg',
    'textarea', 'input', 'select', 'nav', 'footer',
    '[hidden]', '[aria-hidden="true"]', '.sr-only'
  ].join(',');
  const FILE_EXT = /\.(?:pdf|docx?|xlsx?|pptx?|csv|txt|md|zip|rar|7z|png|jpe?g|webp|svg|json|py|js|ts|c|h|cpp|hpp|html?|log|yaml|yml|xml|sh|ipynb|tex)(?:\s|$)/i;

  function safeText(value) {
    return String(value ?? '').replace(/\u200b/g, '').replace(/\r\n?/g, '\n');
  }

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    if (!el.isConnected || !el.getClientRects().length) return false;
    for (let p = el; p && p instanceof Element; p = p.parentElement) {
      if (p.hasAttribute('hidden') || p.getAttribute('aria-hidden') === 'true' || p.hasAttribute('inert')) return false;
      const style = getComputedStyle(p);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }

  function activeMain() {
    // 2026 版 ChatGPT 会把其他聊天的工作区保留在 DOM 中，不能直接扫描 document。
    const candidates = Array.from(document.querySelectorAll('main[data-app-shell-main-surface], main'))
      .filter(isVisible);
    if (!candidates.length) return null;
    return candidates.find(m => m.querySelector('[data-turn-key], [data-message-author-role]')) || candidates[0];
  }

  function currentTitle(main) {
    const pathname = location.pathname.replace(/\/$/, '');
    const nav = document.querySelector('nav[aria-label="聊天记录"]') || document.querySelector('#app-shell-sidebar');
    if (nav) {
      for (const anchor of nav.querySelectorAll('a[href]')) {
        try {
          if (new URL(anchor.href).pathname.replace(/\/$/, '') === pathname) {
            const title = safeText(anchor.innerText || anchor.textContent).trim();
            if (title && title.length < 250) return title;
          }
        } catch { /* invalid href */ }
      }
    }
    const documentTitle = safeText(document.title).replace(/^ChatGPT\s*[-|–]\s*/i, '').trim();
    if (documentTitle && !/^(ChatGPT|代码|首页)$/i.test(documentTitle)) return documentTitle;
    const firstUser = main?.querySelector('[data-user-message-bubble] .whitespace-pre-wrap, [data-user-message-bubble]');
    const firstLine = safeText(firstUser?.textContent).trim().split('\n')[0];
    return firstLine ? firstLine.slice(0, 60) : 'ChatGPT对话';
  }

  function safeFilename(title) {
    return (title || 'ChatGPT对话')
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/[. ]+$/g, '').trim().slice(0, 110) || 'ChatGPT对话';
  }

  function timestamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function safeHref(href) {
    const raw = (href || '').trim();
    if (!raw || raw === '#') return '';
    if (/^sandbox:\//i.test(raw)) return raw;
    try {
      const url = new URL(raw, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function codeSpan(text) {
    const code = safeText(text).replace(/\n/g, ' ');
    if (!code) return '';
    const matches = code.match(/`+/g) || [];
    const ticks = '`'.repeat(Math.max(1, ...matches.map(x => x.length + 1)));
    const padded = /^`|`$|^\s|\s$/.test(code) ? ` ${code} ` : code;
    return `${ticks}${padded}${ticks}`;
  }

  function fencedCode(code, lang = '') {
    const text = safeText(code).replace(/\n+$/, '');
    const ticks = Math.max(3, ...(text.match(/`+/g) || []).map(s => s.length + 1));
    const marker = '`'.repeat(ticks);
    return `\n\n${marker}${lang}\n${text}\n${marker}\n\n`;
  }

  function codeLanguage(el) {
    const detected = el.querySelector('code[class*="language-"]');
    const cls = detected?.className || '';
    const match = String(cls).match(/language-([\w+#-]+)/);
    if (match) return match[1];
    const header = el.querySelector('[data-markdown-copy="exclude"]');
    const label = safeText(header?.textContent).trim().split(/\s+/)[0].toLowerCase();
    const langs = {
      python: 'python', javascript: 'javascript', typescript: 'typescript',
      shell: 'bash', bash: 'bash', c: 'c', 'c++': 'cpp', cpp: 'cpp',
      java: 'java', rust: 'rust', json: 'json', yaml: 'yaml',
      markdown: 'markdown', html: 'html', css: 'css', sql: 'sql',
      text: 'text', plaintext: 'text', xml: 'xml', go: 'go', latex: 'latex'
    };
    return langs[label] || '';
  }

  function markdownTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const data = rows.map(tr => Array.from(tr.children)
      .filter(cell => /^(TD|TH)$/.test(cell.tagName))
      .map(cell => renderChildren(cell, { inline: true }).replace(/\n+/g, '<br>').replace(/\|/g, '\\|').trim()))
      .filter(row => row.length);
    if (!data.length) return '';
    const width = Math.max(...data.map(row => row.length));
    const fill = row => [...row, ...Array(width - row.length).fill('')];
    return '\n\n' + [
      `| ${fill(data[0]).join(' | ')} |`,
      `| ${Array(width).fill('---').join(' | ')} |`,
      ...data.slice(1).map(row => `| ${fill(row).join(' | ')} |`)
    ].join('\n') + '\n\n';
  }

  function markdownList(el, depth = 0) {
    const ordered = el.tagName === 'OL';
    const start = Number(el.getAttribute('start')) || 1;
    const lines = [];
    const items = Array.from(el.children).filter(x => x.tagName === 'LI');
    items.forEach((li, i) => {
      const marker = ordered ? `${Number(li.getAttribute('value')) || (start + i)}. ` : '- ';
      const regular = Array.from(li.childNodes)
        .filter(n => !(n.nodeType === Node.ELEMENT_NODE && /^(UL|OL)$/.test(n.tagName)))
        .map(n => renderNode(n, { inline: true, listDepth: depth + 1 })).join('')
        .replace(/\n{3,}/g, '\n\n').trim();
      if (regular) lines.push(`${'  '.repeat(depth)}${marker}${regular.replace(/\n/g, `\n${'  '.repeat(depth + 1)}`)}`);
      else lines.push(`${'  '.repeat(depth)}${marker.trim()}`);
      for (const child of li.children) {
        if (child.tagName === 'UL' || child.tagName === 'OL') lines.push(markdownList(child, depth + 1));
      }
    });
    return lines.join('\n');
  }

  function renderChildren(el, ctx = {}) {
    return Array.from(el.childNodes).map(n => renderNode(n, ctx)).join('');
  }

  function renderNode(node, ctx = {}) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return safeText(node.nodeValue).replace(/\s+/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node;
    if (el.matches(OMIT_SELECTOR)) return '';
    const tag = el.tagName;

    // Only a static representation of map / rich widgets is available to Markdown.
    if (el.matches('[data-testid="businesses-map-widget"], [data-testid="chatgpt-map-canvas"]')) {
      return '\n\n[交互式地图组件（Markdown 无法完整保存）]\n\n';
    }
    if (el.matches('[data-markdown-copy="code-block"]')) {
      const code = el.querySelector('pre code, pre, code');
      return code ? fencedCode(code.textContent, codeLanguage(el)) : '';
    }
    if (tag === 'PRE') {
      return fencedCode((el.querySelector('code') || el).textContent, codeLanguage(el));
    }
    if (el.matches('[data-markdown-copy="inline-code"]') || tag === 'CODE') {
      return codeSpan(el.textContent);
    }
    if (el.classList.contains('katex-display') || el.classList.contains('katex-inline') || el.classList.contains('katex')) {
      const tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
      if (tex) return el.classList.contains('katex-display') ? `\n\n$$\n${tex}\n$$\n\n` : `$${tex}$`;
    }
    if (tag === 'MJX-CONTAINER') {
      const tex = el.getAttribute('aria-label');
      if (tex) return `$${tex}$`;
    }
    if (tag === 'BR') return '\n';
    if (tag === 'HR') return '\n\n---\n\n';
    if (tag === 'TABLE') return markdownTable(el);
    if (tag === 'UL' || tag === 'OL') return `\n\n${markdownList(el, ctx.listDepth || 0)}\n\n`;
    if (/^H[1-6]$/.test(tag)) {
      return `\n\n${'#'.repeat(Number(tag[1]))} ${renderChildren(el, { inline: true }).trim()}\n\n`;
    }
    if (tag === 'BLOCKQUOTE') {
      const text = tidy(renderChildren(el)).trim();
      return text ? `\n\n${text.split('\n').map(x => x ? '> ' + x : '>').join('\n')}\n\n` : '';
    }
    if (tag === 'STRONG' || tag === 'B') return `**${renderChildren(el, { inline: true }).trim()}**`;
    if (tag === 'EM' || tag === 'I') return `*${renderChildren(el, { inline: true }).trim()}*`;
    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') return `~~${renderChildren(el, { inline: true }).trim()}~~`;
    if (tag === 'A') {
      const href = safeHref(el.getAttribute('href'));
      if (el.matches('[data-testid="chatgpt-citation"]')) {
        const aria = safeText(el.getAttribute('aria-label'));
        const source = aria.match(/^([^,，]+)(?:[,，]\s*https?:\/\/)/)?.[1] || el.textContent.trim() || '来源';
        const additional = aria.match(/另外\s*(\d+)\s*个来源/);
        const extra = additional ? `（另有${additional[1]}个来源未展开）` : '';
        return href ? `[${source.trim()}](${href})${extra}` : source.trim();
      }
      const title = renderChildren(el, { inline: true }).trim() || href;
      return href ? `[${title.replace(/\]/g, '\\]')}](${href.replace(/\)/g, '%29')})` : title;
    }
    if (tag === 'IMG') {
      const alt = (el.getAttribute('alt') || '图片').trim();
      const href = safeHref(el.getAttribute('src'));
      return href ? `![${alt.replace(/\]/g, '\\]')}](${href})` : `[图片：${alt}]`;
    }
    if (tag === 'P') return `\n\n${renderChildren(el, ctx).trim()}\n\n`;
    if (tag === 'DIV' && (el.getAttribute('data-d-direction') === 'col' || el.hasAttribute('data-markdown-han-text'))) {
      return `\n\n${renderChildren(el, ctx).trim()}\n\n`;
    }
    return renderChildren(el, ctx);
  }

  function tidy(markdown) {
    // Protect fenced code blocks while compacting surrounding empty lines.
    const saved = [];
    const protectedText = safeText(markdown).replace(/(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1(?=\n|$)/g, full => {
      const key = `\u001aCODEBLOCK_${saved.length}\u001a`;
      saved.push(full);
      return key;
    });
    return protectedText
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .replace(/\u001aCODEBLOCK_(\d+)\u001a/g, (_, n) => saved[Number(n)]);
  }

  function collectAttachments(userGroup) {
    if (!userGroup) return [];
    const names = new Set();
    const add = value => {
      const text = safeText(value).trim();
      if (text && text.length < 260 && FILE_EXT.test(text)) names.add(text);
    };
    // User attachment cards may be separate from the text bubble.
    for (const el of userGroup.querySelectorAll('[data-file-name], [data-filename], [download], [title], [aria-label]')) {
      if (el.closest('.turn-action-controls, button')) continue;
      for (const attribute of ['data-file-name', 'data-filename', 'download', 'title', 'aria-label']) {
        add(el.getAttribute(attribute));
      }
    }
    const bubble = userGroup.querySelector('[data-user-message-bubble]');
    for (const el of userGroup.querySelectorAll('a, [class*="file"], [class*="attachment"]')) {
      if (bubble?.contains(el) || el.closest('.turn-action-controls, button')) continue;
      const txt = safeText(el.textContent).trim();
      if (txt.length < 260) add(txt);
    }
    return [...names];
  }

  function userMessage(turn) {
    const group = turn.querySelector('[data-chatgpt-search-unit-key$=":user"], [class*="group/user-message"]');
    const bubble = turn.querySelector('[data-user-message-bubble]') || group;
    if (!bubble) return '';
    const textNode = bubble.querySelector('.whitespace-pre-wrap, [data-markdown-text-style="user-message"]');
    const text = safeText(textNode?.textContent || bubble.textContent).trim();
    const files = collectAttachments(group || bubble);
    return [text, files.length ? `📁 附件：${files.join('、')}` : ''].filter(Boolean).join('\n\n');
  }

  function assistantMessage(container) {
    const roots = Array.from(container.querySelectorAll('[data-markdown-text-style="assistant-message"], .markdown, .prose'))
      .filter(el => !el.parentElement?.closest('[data-markdown-text-style="assistant-message"], .markdown, .prose'));
    if (!roots.length) {
      const unit = container.matches('[data-content-search-unit-key]') ? container : container.querySelector('[data-content-search-unit-key$=":assistant"]');
      if (!unit) return { present: false, text: '' };
      // Avoid exporting headings, controls, and activity/thinking panels.
      const fallback = unit.querySelector('[data-markdown-copy="contents"]') || unit.querySelector('[data-chatgpt-selection-message-id]');
      const body = fallback ? tidy(renderNode(fallback)) : '';
      return { present: true, text: body };
    }
    return { present: true, text: tidy(roots.map(renderNode).join('\n\n')) };
  }

  function enumerateMessages(main) {
    const turns = Array.from(main.querySelectorAll('[data-turn-key]'))
      .filter(el => !el.parentElement?.closest('[data-turn-key]'));
    const result = [];
    let missingReplies = 0;
    for (const turn of turns) {
      const user = userMessage(turn);
      if (user) result.push({ role: 'user', text: user });
      // Work/Agent turns can contain many separate assistant replies inside ONE turn.
      // Treat each assistant role heading as a message, rather than merging them.
      const headings = Array.from(turn.querySelectorAll('[data-conversation-role="assistant"]'));
      const containers = headings.length
        ? headings.map(h => h.parentElement).filter(Boolean)
        : [turn];
      const seen = new Set();
      for (const container of containers) {
        if (seen.has(container)) continue;
        seen.add(container);
        const assistant = assistantMessage(container);
        if (!assistant.present) continue;
        if (!assistant.text) missingReplies += 1;
        result.push({ role: 'assistant', text: assistant.text || '[此回复的正文未加载到页面 DOM，无法提取]' });
      }
    }
    // Backward-compatible fallback for older ChatGPT message structures.
    if (!result.length) {
      for (const node of main.querySelectorAll('[data-message-author-role]')) {
        const role = node.getAttribute('data-message-author-role');
        if (!['user', 'assistant'].includes(role)) continue;
        const content = role === 'user'
          ? safeText((node.querySelector('.whitespace-pre-wrap') || node).textContent).trim()
          : tidy(renderNode(node.querySelector('.markdown, .prose') || node));
        if (content) result.push({ role, text: content });
      }
    }
    return { messages: result, missingReplies, unloadedEarlier: /正在加载更早的消息|Load earlier messages/i.test(main.textContent || '') };
  }

  function makeMarkdown(title, messages) {
    const parts = [
      `# ${title.replace(/\n+/g, ' ').trim()}`,
      `导出时间：${timestamp()}`,
      ...(OPTIONS.includeSourceUrl ? [`来源：${location.href}`] : [])
    ];
    for (const [i, message] of messages.entries()) {
      parts.push('---', `## ${message.role === 'user' ? '👤 User' : '🤖 ChatGPT'}`, message.text);
    }
    return parts.join('\n\n').trim() + '\n';
  }

  function saveMarkdown(filename, content) {
    const blob = new Blob(['\ufeff', content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function showNotice(message, error = false) {
    const host = document.getElementById(SCRIPT_ID);
    const notice = host?.shadowRoot?.getElementById('notice');
    if (!notice) return alert(message);
    notice.textContent = message;
    notice.style.display = 'block';
    notice.style.borderColor = error ? '#e8a4a4' : 'var(--border-color, #d1d5db)';
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => { notice.style.display = 'none'; }, 6500);
  }

  function exportCurrentChat() {
    const main = activeMain();
    if (!main) return showNotice('未找到当前可见的聊天区域。', true);
    const data = enumerateMessages(main);
    if (!data.messages.length) {
      return showNotice('当前页面没有可导出的对话。请先打开一条具体聊天。', true);
    }
    const title = currentTitle(main);
    const date = timestamp().slice(0, 10);
    const filename = safeFilename(title) + (OPTIONS.filenameWithDate ? `_${date}` : '') + '.md';
    saveMarkdown(filename, makeMarkdown(title, data.messages));
    const issues = [];
    if (data.missingReplies) issues.push(`${data.missingReplies} 条回复尚无可读取的正文`);
    if (data.unloadedEarlier) issues.push('更早的历史消息尚未加载');
    showNotice(`已导出 ${data.messages.length} 条消息。${issues.length ? '注意：' + issues.join('；') + '。' : ''}`);
    if (issues.length) console.warn('[ChatGPT Markdown Exporter] 本次导出可能不完整：', issues);
  }

  function mount() {
    if (!document.body || document.getElementById(SCRIPT_ID)) return;
    const host = document.createElement('div');
    host.id = SCRIPT_ID;
    host.style.cssText = 'position:fixed;right:16px;bottom:18px;z-index:2147483647;pointer-events:auto';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        button { font: 600 13px system-ui, sans-serif; color: #fff; background: #2563eb;
          border: 0; border-radius: 11px; padding: 10px 14px; cursor: pointer;
          box-shadow: 0 3px 12px #0002; }
        button:hover { background: #1d4ed8; }
        button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
        #notice { display:none; position:absolute; bottom:calc(100% + 10px); right:0;
          max-width: 340px; width:max-content; min-width: 150px; padding:10px 12px;
          border:1px solid #d1d5db; border-radius:10px; background:#fff; color:#111827;
          font: 12px/1.6 system-ui,sans-serif; box-shadow:0 3px 15px #0002; }
      </style>
      <div id="notice" role="status" aria-live="polite"></div>
      <button type="button" id="export" aria-label="导出当前 ChatGPT 对话为 Markdown">📥 导出 Markdown</button>
    `;
    shadow.getElementById('export').addEventListener('click', exportCurrentChat);
    document.body.appendChild(host);
  }

  // SPA navigation does not reload the entire document. Content is read afresh on each click.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

})();
