// ========== DQX Tools Launcher ==========
const DQXTools = {
    tools: {},
    currentTool: null,
    container: null,
    darkMode: false,

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
        
        this.darkMode = localStorage.getItem('darkMode') === 'dark';
        this.applyDarkMode();
        this.showLauncher();
        
        window.addEventListener('resize', () => {
            if (this.currentTool === null) {
                this.showLauncher();
            }
        });
    },

    applyDarkMode: function() {
        document.body.classList.toggle('dark-mode', this.darkMode);
        const btn = document.getElementById('global-dark-toggle');
        if (btn) {
            btn.textContent = this.darkMode ? '☀️' : '🌙';
        }
    },

    toggleDarkMode: function() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode ? 'dark' : 'light');
        this.applyDarkMode();
    },

    getButtonStyle: function() {
        return `
            flex: 1;
            min-width: 100px;
            padding: 10px 8px;
            font-size: 14px;
            font-weight: bold;
            border: none !important;
            border-radius: 40px !important;
            background: #0066cc !important;
            color: white !important;
            cursor: pointer;
            transition: transform 0.1s;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            white-space: nowrap;
        `;
    },

    getIconButtonStyle: function() {
        return `
            width: 44px;
            height: 44px;
            border-radius: 50% !important;
            border: none !important;
            background: #0066cc !important;
            color: white !important;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            transition: transform 0.1s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    },

    showLauncher: function() {
        const buttonStyle = this.getButtonStyle();
        const iconStyle = this.getIconButtonStyle();
        
        const toolButtons = Object.entries(this.tools).map(([id, tool]) => {
            return `<button onclick="DQXTools.loadTool('${id}')" style="${buttonStyle}">
                        ${tool.name}
                    </button>`;
        }).join('');
        
        const darkToggle = `<button id="global-dark-toggle" style="${iconStyle}">
                                ${this.darkMode ? '☀️' : '🌙'}
                            </button>`;
        
        const isMobile = this.isMobile();
        
        if (isMobile) {
            this.container.innerHTML = `
                <div id="launcher-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 10px 12px; display: flex; gap: 10px; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1;">
                        ${toolButtons}
                    </div>
                    ${darkToggle}
                </div>
                <div id="dqx-tool-container" style="padding-bottom: 80px;"></div>
            `;
            
            if (!document.getElementById('dqx-dark-fix')) {
                const darkStyle = document.createElement('style');
                darkStyle.id = 'dqx-dark-fix';
                darkStyle.textContent = `body.dark-mode #launcher-bar { background: rgba(26,26,42,0.95) !important; border-top-color: #333 !important; }`;
                document.head.appendChild(darkStyle);
            }
        } else {
            this.container.innerHTML = `
                <div id="launcher-bar" style="display: flex; gap: 12px; justify-content: space-between; align-items: center; padding: 0 0 20px 0; margin-bottom: 10px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1;">
                        ${toolButtons}
                    </div>
                    ${darkToggle}
                </div>
                <div id="dqx-tool-container"></div>
            `;
        }
        
        const toggleBtn = document.getElementById('global-dark-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleDarkMode();
            toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.02)';
            toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';
        }
    },

    switchToHomeButton: function() {
        const isMobile = this.isMobile();
        const iconStyle = this.getIconButtonStyle();
        
        const homeButton = `<button id="home-button" style="${iconStyle}">
                                🏠
                            </button>`;
        
        const darkToggle = `<button id="global-dark-toggle" style="${iconStyle}">
                                ${this.darkMode ? '☀️' : '🌙'}
                            </button>`;
        
        const barHtml = isMobile ? `
            <div id="launcher-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 10px 12px; display: flex; gap: 10px; justify-content: flex-end; align-items: center; border-top: 1px solid #ddd; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                ${homeButton}
                ${darkToggle}
            </div>
        ` : `
            <div id="launcher-bar" style="display: flex; gap: 12px; justify-content: flex-end; align-items: center; padding: 0 0 20px 0; margin-bottom: 10px;">
                ${homeButton}
                ${darkToggle}
            </div>
        `;
        
        const oldBar = document.getElementById('launcher-bar');
        if (oldBar) oldBar.outerHTML = barHtml;
        
        const homeBtn = document.getElementById('home-button');
        if (homeBtn) {
            homeBtn.onclick = () => this.goHome();
            homeBtn.onmouseover = () => homeBtn.style.transform = 'scale(1.02)';
            homeBtn.onmouseout = () => homeBtn.style.transform = 'scale(1)';
        }
        
        const toggleBtn = document.getElementById('global-dark-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleDarkMode();
            toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.02)';
            toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';
        }
    },

    goHome: function() {
        const toolContainer = document.getElementById('dqx-tool-container');
        if (toolContainer) toolContainer.innerHTML = '';
        
        if (this.currentTool === 'exp-calc') {
            const script = document.querySelector('script[src*="exp-calculator.js"]');
            if (script) script.remove();
        }
        if (this.currentTool === 'daily-checker') {
            const script = document.querySelector('script[src*="dqx-checker.js"]');
            if (script) script.remove();
        }
        
        this.currentTool = null;
        this.showLauncher();
    },

    loadTool: async function(toolId) {
        const tool = this.tools[toolId];
        if (!tool) return;
        if (this.currentTool === toolId) return;
        
        const toolContainer = document.getElementById('dqx-tool-container');
        if (!toolContainer) return;
        
        this.switchToHomeButton();
        
        toolContainer.innerHTML = '<div style="text-align: center; padding: 40px;">📥 読み込み中...</div>';
        
        try {
            const oldScript = document.querySelector(`script[src="${tool.url}"]`);
            if (oldScript) oldScript.remove();
            
            await this.loadScript(tool.url);
            
            const fn = tool.renderFn
                .split('.')
                .reduce((obj, key) => obj && obj[key], window);
            
            if (typeof fn === 'function') {
                fn('#dqx-tool-container');
                this.currentTool = toolId;
            } else {
                toolContainer.innerHTML = '<div style="color: red;">エラー: ツールの読み込みに失敗しました</div>';
                this.showLauncher();
            }
        } catch(e) {
            console.error('ツール読み込みエラー:', e);
            toolContainer.innerHTML = '<div style="color: red;">エラー: ツールの読み込みに失敗しました</div>';
            this.showLauncher();
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
