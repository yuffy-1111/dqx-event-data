window.DQXTools = {
    tools: {},
    currentTool: null,
    container: null,

    register: function(toolId, toolConfig) {
        this.tools[toolId] = toolConfig;
    },

    init: function(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.showLauncher();
    },

    showLauncher: function() {
        const toolButtons = Object.entries(this.tools).map(([id, tool]) => {
            return `<button onclick="DQXTools.loadTool('${id}')" style="padding: 8px 16px; margin: 4px; cursor: pointer; border-radius: 8px; border: none; background: #0066cc; color: white;">
                        ${tool.name}
                    </button>`;
        }).join('');
        this.container.innerHTML = `<div style="margin-bottom: 16px;"><div style="display: flex; gap: 8px; flex-wrap: wrap;">${toolButtons}</div></div><div id="dqx-tool-container"></div>`;
    },

    loadTool: async function(toolId) {
        const tool = this.tools[toolId];
        if (!tool) return;
        const toolContainer = document.getElementById('dqx-tool-container');
        if (!toolContainer) return;
        toolContainer.innerHTML = '<div>読み込み中...</div>';
        try {
            await this.loadScript(tool.url);
            const fn = tool.renderFn.split('.').reduce((obj, key) => obj && obj[key], window);
            if (typeof fn === 'function') {
                fn('#dqx-tool-container');
                this.currentTool = toolId;
            } else {
                toolContainer.innerHTML = '<div>エラー</div>';
            }
        } catch(e) {
            toolContainer.innerHTML = '<div>エラー</div>';
        }
    },

    loadScript: function(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};
