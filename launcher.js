// ========== DQX Tools Launcher ==========
window.DQXTools = { ... }
    tools: {},
    currentTool: null,
    container: null,

    register: function(toolId, toolConfig) {
        this.tools[toolId] = toolConfig;
    },

    init: function(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('コンテナが見つかりません:', containerId);
            return;
        }
        this.showLauncher();
    },

    showLauncher: function() {
        const toolButtons = Object.entries(this.tools).map(([id, tool]) => {
            return `<button onclick="DQXTools.loadTool('${id}')" style="padding: 8px 16px; margin: 4px; cursor: pointer; border-radius: 8px; border: none; background: #0066cc; color: white;">
                        ${tool.name}
                    </button>`;
        }).join('');
        
        this.container.innerHTML = `
            <div style="margin-bottom: 16px; padding: 8px; background: #eef2f7; border-radius: 12px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${toolButtons}
                </div>
            </div>
            <div id="dqx-tool-container"></div>
        `;
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
