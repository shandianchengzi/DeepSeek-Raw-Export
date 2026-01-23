// ==UserScript==
// @name         DeepSeek原始对话导出
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  精准提取 DeepSeek 对话，区分用户输入和 AI 回答
// @author       You
// @match        https://chat.deepseek.com/*
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
