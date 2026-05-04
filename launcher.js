// ========== DQX Tools Launcher ==========
const DQXTools = {
    tools: {},
    currentTool: null,
    container: null,

    register: function(toolId, toolConfig) {
        this.tools[toolId] = toolConfig;
    },

    isMobile: function() {
        return window.innerWidth <= 768;
    },

    init: function(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('コンテナが見つかりません:', containerId);
            return;
        }
        this.showLauncher();
        
        window.addEventListener('resize', () => {
            if (this.currentTool === null) {
                this.showLauncher();
            }
        });
    },

    showLauncher: function() {
        const toolButtons = Object.entries(this.tools).map(([id, tool]) => {
            return `<button onclick="DQXTools.loadTool('${id}')" style="
                        flex: 1;
                        max-width: 160px;
                        padding: 10px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border: none;
                        border-radius: 40px;
                        background: #0066cc;
                        color: white;
                        cursor: pointer;
                        transition: transform 0.1s;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        ${tool.name}
                    </button>`;
        }).join('');
        
        const isMobile = this.isMobile();
        
        if (isMobile) {
            this.container.innerHTML = `
                <div style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 10px 12px; display: flex; gap: 10px; justify-content: center; border-top: 1px solid #ddd; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                    ${toolButtons}
                </div>
                <div id="dqx-tool-container" style="padding-bottom: 80px;"></div>
            `;
            // ダークモード対応
            if (!document.getElementById('dqx-dark-fix')) {
                const darkStyle = document.createElement('style');
                darkStyle.id = 'dqx-dark-fix';
                darkStyle.textContent = `body.dark-mode #dqx-app > div[style*="position: fixed"] { background: rgba(26,26,42,0.95) !important; border-top-color: #333 !important; }`;
                document.head.appendChild(darkStyle);
            }
        } else {
            this.container.innerHTML = `
                <div style="display: flex; gap: 12px; justify-content: flex-start; padding: 0 0 20px 0; margin-bottom: 10px;">
                    ${toolButtons}
                </div>
                <div id="dqx-tool-container"></div>
            `;
        }
    },

    loadTool: async function(toolId) {
        const tool = this.tools[toolId];
        if (!tool) return;
        if (this.currentTool === toolId) return;
        
        const toolContainer = document.getElementById('dqx-tool-container');
        if (!toolContainer) return;
        
        toolContainer.innerHTML = '<div style="text-align: center; padding: 40px;">📥 読み込み中...</div>';
        
        try {
            await this.loadScript(tool.url);
            if (window[tool.renderFn] && typeof window[tool.renderFn] === 'function') {
                window[tool.renderFn]('#dqx-tool-container');
                this.currentTool = toolId;
            } else {
                toolContainer.innerHTML = '<div style="color: red;">エラー: ツールの読み込みに失敗しました</div>';
            }
        } catch(e) {
            console.error('ツール読み込みエラー:', e);
            toolContainer.innerHTML = '<div style="color: red;">エラー: ツールの読み込みに失敗しました</div>';
        }
    },

    loadScript: function(url) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${url}"]`);
            if (existing) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Script load failed: ${url}`));
            document.head.appendChild(script);
        });
    }
};
