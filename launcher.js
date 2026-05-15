// ==========ツールランチャー（改造版）=========
// ========== バージョン管理 ==========
const APP_VERSION = '2.1.1';

// バージョン情報をグローバルに公開（HTML側と整合性チェック用）
window.LAUNCHER_VERSION = APP_VERSION;

function checkVersionUpdate() {
    const storedVersion = localStorage.getItem('dqx_app_version');
    if (storedVersion !== APP_VERSION) {
        if (storedVersion) {
            alert(`🎉 アップデート完了！\n\n${storedVersion} → ${APP_VERSION}\n新機能・修正が含まれています。`);
        } else {
            alert(`ようこそ！\n\nDQXツール ver.${APP_VERSION}`);
        }
        localStorage.setItem('dqx_app_version', APP_VERSION);
    }
}

const DQXTools = {
    tools: {},
    currentTool: null,
    container: null,
    darkMode: false,
    boundResizeHandler: null,

    // ----- 登録機能（変更なし）-----
    register: function(toolId, toolConfig) {
        this.tools[toolId] = toolConfig;
    },

    isMobile: function() {
        return window.innerWidth <= 768;
    },

    // ----- 初期化（修正済み）-----
    init: function(containerId) {
        checkVersionUpdate();
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('コンテナが見つかりません:', containerId);
            return;
        }
        this.darkMode = localStorage.getItem('darkMode') === 'dark';
        this.applyDarkMode();
        this.showLauncher();

        // リサイズハンドラをバインドして保存
        this.boundResizeHandler = () => {
            if (this.currentTool === null) {
                this.showLauncher();
            } else {
                this.renderToolMenu();
            }
        };
        window.addEventListener('resize', this.boundResizeHandler);
    },

    // ----- ダークモード（変更なし）-----
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
        if (this.currentTool === null) {
            this.showLauncher();
        } else {
            this.renderToolMenu();
        }
    },

    // ==================== ホーム画面（カードグリッド） ====================
    showLauncher: function() {
        const cardButtons = Object.entries(this.tools).map(([id, tool]) => {
            const icon = tool.icon || '🔧';
            const name = tool.name;
            const desc = tool.desc || '';
            return `
                <div class="tool-card" data-tool-id="${id}">
                    <div class="tool-card-icon">${icon}</div>
                    <div class="tool-card-name">${name}</div>
                    <div class="tool-card-desc">${desc}</div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="home-container">
                <div class="home-header">
                    <h1 class="home-title">🎮 DQXツール</h1>
                    <button id="global-dark-toggle" class="dark-toggle-btn">${this.darkMode ? '☀️' : '🌙'}</button>
                </div>
                <div class="home-grid">
                    ${cardButtons}
                </div>
                <div class="home-footer">
                    © yuffy-1111
                </div>
            </div>
        `;

        const toggleBtn = document.getElementById('global-dark-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleDarkMode();
        }

        document.querySelectorAll('.tool-card').forEach(card => {
            card.onclick = () => {
                const toolId = card.dataset.toolId;
                this.loadTool(toolId);
            };
        });
    },

    // ==================== ツール画面のメニュー（PC:右サイドバー / スマホ:下部） ====================
    renderToolMenu: function() {
        const isMobile = this.isMobile();

        const menuButtons = Object.entries(this.tools).map(([id, tool]) => {
            const icon = tool.icon || '🔧';
            const name = tool.name;
            const isActive = (this.currentTool === id);
            return `
                <button class="tool-menu-btn ${isActive ? 'active' : ''}" data-tool-id="${id}">
                    ${icon}<span class="menu-btn-label">${name}</span>
                </button>
            `;
        }).join('');

        const oldBar = document.getElementById('tool-menu-bar');
        if (oldBar) oldBar.remove();

        const menuBar = document.createElement('div');
        menuBar.id = 'tool-menu-bar';
        menuBar.className = isMobile ? 'tool-menu-bottom' : 'tool-menu-sidebar';
        menuBar.innerHTML = menuButtons;
        document.body.appendChild(menuBar);

        const toolContainer = document.getElementById('dqx-tool-container');
        if (toolContainer) {
            if (isMobile) {
                toolContainer.style.paddingBottom = '70px';
                toolContainer.style.paddingRight = '0';
            } else {
                toolContainer.style.paddingBottom = '0';
                toolContainer.style.paddingRight = '80px';
            }
        }

        document.querySelectorAll('.tool-menu-btn').forEach(btn => {
            btn.onclick = () => {
                const toolId = btn.dataset.toolId;
                if (toolId && this.currentTool !== toolId) {
                    this.loadTool(toolId);
                }
            };
        });

        this.addDarkModeButtonToMenu();
    },

    addDarkModeButtonToMenu: function() {
        const menuBar = document.getElementById('tool-menu-bar');
        if (!menuBar) return;

        const homeBtn = document.createElement('button');
        homeBtn.className = 'tool-menu-btn home-btn';
        homeBtn.innerHTML = '🏠<span class="menu-btn-label">ホーム</span>';
        homeBtn.onclick = () => this.goHome();
        menuBar.appendChild(homeBtn);

        const darkBtn = document.createElement('button');
        darkBtn.className = 'tool-menu-btn dark-mode-btn';
        darkBtn.innerHTML = this.darkMode
            ? '☀️<span class="menu-btn-label">ライト</span>'
            : '🌙<span class="menu-btn-label">ダーク</span>';
        darkBtn.onclick = () => this.toggleDarkMode();
        menuBar.appendChild(darkBtn);
    },

    // ==================== ツール読み込み ====================
    loadTool: async function(toolId) {
        const tool = this.tools[toolId];
        if (!tool) return;
        if (this.currentTool === toolId) return;

        this.destroyCurrentTool();

        const oldContainer = document.getElementById('dqx-tool-container');
        if (oldContainer) oldContainer.remove();

        const toolContainer = document.createElement('div');
        toolContainer.id = 'dqx-tool-container';
        this.container.appendChild(toolContainer);

        const loadingImages = [
            { src: './images/dqx_loading.jpg',  weight: 30 },
            { src: './images/dqx_loading2.jpg', weight: 25 },
            { src: './images/dqx_loading3.jpg', weight: 25 },
            { src: './images/dqx_loading4.jpg', weight: 18 },
            { src: './images/dqx_loading5.jpg', weight: 2  },
        ];
        const totalWeight = loadingImages.reduce((sum, img) => sum + img.weight, 0);
        let rand = Math.random() * totalWeight;
        const randomImage = loadingImages.find(img => (rand -= img.weight) < 0).src;

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'dqx-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            transition: opacity 0.3s;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="margin-bottom: 24px;">
                    <img src="${randomImage}" style="width: 320px; max-width: 80vw; height: auto; opacity: 0.95;" onerror="this.style.display='none'">
                </div>
                <div id="dqx-loading-text" style="color: white; font-size: 1.3rem; font-weight: bold; margin-bottom: 20px;">
                    読み込み中...
                </div>
                <div style="color: #aaa; font-size: 0.7rem; max-width: 90%; margin: 0 auto; line-height: 1.5;">
                    このページで利用している株式会社スクウェア・エニックスを代表とする共同著作者が権利を所有する画像の転載・配布は禁止いたします。<br>
                    (C) ARMOR PROJECT/BIRD STUDIO/SQUARE ENIX All Rights Reserved.
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const oldScript = document.querySelector(`script[src*="${tool.url.split('/').pop()}"]`);
            if (oldScript) oldScript.remove();

            await this.loadScript(tool.url);

            const fn = tool.renderFn
                .split('.')
                .reduce((obj, key) => obj && obj[key], window);

            loadingDiv.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 300));
            loadingDiv.remove();

            if (typeof fn === 'function') {
                this.container.innerHTML = '';
                const newToolContainer = document.createElement('div');
                newToolContainer.id = 'dqx-tool-container';
                this.container.appendChild(newToolContainer);

                fn('#dqx-tool-container');
                this.currentTool = toolId;
                this.renderToolMenu();
            } else {
                toolContainer.innerHTML = '<div style="color: red; text-align: center; padding: 40px;">エラー: ツールの読み込みに失敗しました</div>';
                this.goHome();
            }
        } catch(e) {
            loadingDiv.remove();
            console.error('ツール読み込みエラー:', e);
            toolContainer.innerHTML = '<div style="color: red; text-align: center; padding: 40px;">エラー: ツールの読み込みに失敗しました</div>';
            this.goHome();
        }
    },

    // ==================== ホームに戻る ====================
    goHome: function() {
        this.destroyCurrentTool();

        const menuBar = document.getElementById('tool-menu-bar');
        if (menuBar) menuBar.remove();

        const oldContainer = document.getElementById('dqx-tool-container');
        if (oldContainer) oldContainer.remove();

        const newContainer = document.createElement('div');
        newContainer.id = 'dqx-tool-container';
        this.container.appendChild(newContainer);

        // 修正: 全ての testtool 関連スクリプトを削除
        const scripts = document.querySelectorAll('script[src*="testtool"]');
        scripts.forEach(script => script.remove());

        this.currentTool = null;
        this.showLauncher();
    },

    destroyCurrentTool: function() {
        // まず通常のツールを破棄
        if (this.currentTool) {
            const tool = this.tools[this.currentTool];
            if (tool) {
                const globalName = tool.renderFn.split('.')[0];
                if (window[globalName] && typeof window[globalName].destroy === 'function') {
                    window[globalName].destroy();
                }
            }
        }
        
        // 追加: 手動で追加したテストツール（DQtool, DQtool2, DQtool3 など）も破棄
        const possibleGlobalNames = ['DQtool', 'DQtool2', 'DQtool3', 'Tool4'];
        possibleGlobalNames.forEach(globalName => {
            if (window[globalName] && typeof window[globalName].destroy === 'function') {
                window[globalName].destroy();
            }
        });
    },

    destroy: function() {
        if (this.boundResizeHandler) {
            window.removeEventListener('resize', this.boundResizeHandler);
            this.boundResizeHandler = null;
        }
    },

    loadScript: function(url) {
        const cacheBustUrl = url + '?v=' + APP_VERSION;
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${cacheBustUrl}"]`);
            if (existing) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = cacheBustUrl;
            script.onload  = () => resolve();
            script.onerror = () => reject(new Error(`Script load failed: ${url}`));
            document.head.appendChild(script);
        });
    }
};

if (typeof window.DQXTools === 'undefined') {
    window.DQXTools = DQXTools;
}
