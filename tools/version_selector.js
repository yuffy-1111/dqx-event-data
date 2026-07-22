// ========== 傭兵ツール バージョンセレクタ（PC:小窓 / スマホ:画面置き換え） ==========
// v2: type: 'html' | 'module' に対応。
//   - 'html'   : 完全独立HTML（旧はてなブログ形式）。iframe.src でそのまま読み込む。
//   - 'module' : tools/expmercenary.js 系のモジュールJS（window.Expmercenary.render(sel) を呼ぶ形式）。
//                iframe.srcdoc に最小シェルHTMLを生成して読み込む。
//
// 今後バージョンが増えた場合の運用:
//   1. old_tools/ に該当バージョンの .js（モジュール形式）を置く
//   2. 下の VERSIONS 配列に { version, date, url, desc, type: 'module' } を1行追加する
//   だけでよい。version_selector.js 本体の修正は不要。
(function(global) {
    const VERSIONS = [
        // ---- モジュールJS版（現行アーキテクチャ。今後もここに追記していく） ----
        { version: 'v2.4.0', date: '2026-07-09', url: './old_tools/ver240.js',  desc: '',                         type: 'module' },
        { version: 'v2.3.0', date: '2026-06-28', url: './old_tools/ver230.js',  desc: '',                         type: 'module' },
        { version: 'v2.1.0', date: '2026-06-19', url: './old_tools/ver210.js',  desc: '',                         type: 'module' },
        { version: 'v1.5.5', date: '2026-05-xx', url: './old_tools/ver155b.js', desc: 'github移行版', type: 'module' },

        // ---- 完全独立HTML版（はてなブログ実装時代のアーカイブ。凍結・修正対象外） ----
        { version: 'v1.5.5', date: '2026-05-12', url: './old_tools/ver155.html', desc: 'はてなブログ版',       type: 'html' },
        { version: 'v1.4.5', date: '2026-04-xx', url: './old_tools/ver145.html', desc: '',                     type: 'html' },
        { version: 'v1.4.1', date: '2026-04-xx', url: './old_tools/ver141.html', desc: 'ｳｪﾌﾞﾌｯｸ版(連携撤廃)',  type: 'html' },
        { version: 'v1.3.0', date: '2026-03-xx', url: './old_tools/ver130.html', desc: '',                     type: 'html' },
        { version: 'v1.2.6', date: '2026-03-xx', url: './old_tools/ver126.html', desc: 'Blue Edition',         type: 'html' },
        { version: 'v1.1.7', date: '2026-02-xx', url: './old_tools/ver117.html', desc: '',                     type: 'html' }
    ];

    let currentIframe = null;
    let isPreviewMode = false;
    let selectedUrl = '';
    let currentContainerSelector = '';

    // ver1.4.1のみ、ダークモード切り替えをツール内で自己完結的にlocalStorageへ
    // 保存する実装になっている（本来は他バージョン同様、ブログヘッダー側の
    // ダークモード制御に追従すべきところ、当時ツール内に直接組み込んでしまった経緯）。
    // アーカイブとして凍結しこのファイル自体は修正しない方針のため、
    // sandbox側でallow-same-originを残して動作を維持する。
    // allow-same-originとallow-scriptsの同時指定はsandboxの隔離を実質無効化するため、
    // 必要なもの以外はallow-scriptsのみに絞る。
    const NEEDS_SAME_ORIGIN = ['ver141.html'];

    function findVersion(url) {
        return VERSIONS.find(v => v.url === url);
    }

    function getSandboxAttr(url) {
        const version = findVersion(url);
        const needsSameOrigin = NEEDS_SAME_ORIGIN.some((name) => url.endsWith(name))
            || (version && (version.type === 'module' || version.type === 'html'));
        return needsSameOrigin ? 'allow-same-origin allow-scripts' : 'allow-scripts';
    }

    function applyDarkModeToIframe(iframe) {
        if (!iframe || !iframe.contentDocument) return;
        const isDark = document.body.classList.contains('dark-mode');
        try {
            iframe.contentDocument.body.classList.toggle('dark-mode', isDark);
        } catch (_) {
            // 同一オリジンでない場合や読み込み前は無視
        }
    }

    const bodyClassObserver = new MutationObserver(() => {
        if (currentIframe) {
            applyDarkModeToIframe(currentIframe);
        }
    });
    bodyClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    function buildModuleShell(url) {
        const absoluteUrl = new URL(url, window.location.href).href;
        const shellUrl = new URL('./old_tools/module_shell.html', window.location.href).href;
        const encodedScript = encodeURIComponent(absoluteUrl);
        return `${shellUrl}?script=${encodedScript}`;
    }

    function createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    // ★ destroy（先に定義）
    const destroy = function() {
        const iframeToDestroy = currentIframe;
        currentIframe = null;
        if (iframeToDestroy) {
            try {
                if (iframeToDestroy.contentWindow && iframeToDestroy.contentWindow.Expmercenary
                    && typeof iframeToDestroy.contentWindow.Expmercenary.destroy === 'function') {
                    iframeToDestroy.contentWindow.Expmercenary.destroy();
                }
            } catch (_) { /* クロスオリジン等で触れない場合は無視 */ }
            try {
                iframeToDestroy.remove();
            } catch (_) {}
        }
        const oldModal = document.getElementById('vs-pc-modal');
        if (oldModal) oldModal.remove();
        const oldOverlay = document.getElementById('vs-modal-overlay');
        if (oldOverlay) oldOverlay.remove();
        isPreviewMode = false;
        selectedUrl = '';
    };

    function mountIframe(container, url) {
        if (currentIframe) {
            try { currentIframe.remove(); } catch (_) {}
            currentIframe = null;
        }
        const version = findVersion(url);
        const iframe = document.createElement('iframe');
        iframe.sandbox = getSandboxAttr(url);
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:white;';

        if (version && version.type === 'module') {
            iframe.src = buildModuleShell(url);
        } else {
            iframe.src = url;
        }

        container.appendChild(iframe);
        currentIframe = iframe;
        return iframe;
    }

    // ★ スマホ用：プレビュー画面を表示（ツールバーは残る）
    const showMobilePreview = function(container, url, versionName) {
        const previewRoot = createEl('div', 'vs-mobile-preview');
        previewRoot.style.cssText = 'display: flex; flex-direction: column; height: calc(100vh - 140px);';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; padding: 12px; background: #0066cc; color: white; gap: 12px; border-radius: 12px 12px 0 0;';
        const backBtn = document.createElement('button');
        backBtn.id = 'vs-back-btn';
        backBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 20px; cursor: pointer;';
        backBtn.textContent = '← 戻る';
        backBtn.onclick = () => {
            destroy();
            render(currentContainerSelector);
        };
        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.textContent = versionName;
        header.appendChild(backBtn);
        header.appendChild(title);

        const previewArea = document.createElement('div');
        previewArea.id = 'vs-preview-area';
        previewArea.style.cssText = 'flex: 1; background: white; border-radius: 0 0 12px 12px; overflow: auto;';

        previewRoot.appendChild(header);
        previewRoot.appendChild(previewArea);
        container.replaceChildren(previewRoot);
        mountIframe(previewArea, url);
    };

    // ★ PC用：小窓（モーダル風）で表示
    const showPcModal = function(url, versionName) {
        // 既存のモーダルを削除
        const oldModal = document.getElementById('vs-pc-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'vs-pc-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 85%;
            max-width: 1000px;
            height: 80%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #0066cc; color: white;';
        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.textContent = `📜 ${versionName}`;
        const closeBtn = document.createElement('button');
        closeBtn.id = 'vs-close-modal';
        closeBtn.style.cssText = 'background: none; border: none; color: white; font-size: 20px; cursor: pointer;';
        closeBtn.textContent = '✕';
        header.appendChild(title);
        header.appendChild(closeBtn);

        const previewArea = document.createElement('div');
        previewArea.id = 'vs-modal-preview';
        previewArea.style.cssText = 'flex: 1; background: white;';

        modal.appendChild(header);
        modal.appendChild(previewArea);
        document.body.appendChild(modal);

        // 背面オーバーレイ
        const overlay = document.createElement('div');
        overlay.id = 'vs-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        const closeModal = () => {
            try { modal.remove(); } catch (_) {}
            try { overlay.remove(); } catch (_) {}
            destroy();
        };
        overlay.onclick = closeModal;
        document.body.appendChild(overlay);

        if (previewArea) {
            mountIframe(previewArea, url);
        }

        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }
    };

    const render = function(containerSelector) {
        currentContainerSelector = containerSelector;
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // スマホでプレビューモード中なら表示を切り替え
        const isMobile = window.innerWidth <= 768;
        if (isMobile && isPreviewMode && selectedUrl) {
            const version = findVersion(selectedUrl);
            showMobilePreview(container, selectedUrl, version ? version.version : '旧バージョン');
            return;
        }

        // 通常の一覧表示（プレビューモード解除時もここに来る）
        isPreviewMode = false;
        selectedUrl = '';

        const root = createEl('div', 'vs-container');
        const header = createEl('div', 'vs-header');
        header.appendChild(createEl('h2', null, '📜 傭兵ツール 過去バージョン'));
        header.appendChild(createEl('p', null, 'バージョンを選択して開く（PC:小窓 / スマホ:画面切替）'));
        root.appendChild(header);

        const list = createEl('div', 'vs-list');
        VERSIONS.forEach((v) => {
            const item = createEl('div', 'version-item');
            item.dataset.url = v.url;
            item.dataset.version = v.version;
            const info = createEl('div', 'version-info');
            info.appendChild(createEl('strong', null, v.version));
            if (v.desc) {
                info.appendChild(createEl('span', 'version-desc', v.desc));
            }
            info.appendChild(createEl('div', 'version-date', v.date));
            const btn = createEl('button', 'preview-btn', '▶ 開く');
            item.appendChild(info);
            item.appendChild(btn);
            list.appendChild(item);
        });
        root.appendChild(list);
        container.replaceChildren(root);

        // スタイル追加（一度だけ）
        if (!document.getElementById('vs-style-final')) {
            const style = document.createElement('style');
            style.id = 'vs-style-final';
            style.textContent = `
                .vs-container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .vs-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0066cc; }
                .vs-header h2 { margin: 0 0 8px 0; }
                .vs-header p { margin: 0; font-size: 13px; color: #666; }
                .vs-list { display: flex; flex-direction: column; gap: 8px; }
                .version-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f9f9f9; border-radius: 12px; border: 1px solid #e0e0e0; cursor: pointer; transition: all 0.2s; }
                .version-item:hover { background: #f0f7ff; border-color: #0066cc; }
                .version-info { flex: 1; }
                .version-desc { font-size: 11px; color: #0066cc; margin-left: 8px; }
                .version-date { font-size: 11px; color: #888; margin-top: 4px; }
                .preview-btn { background: #0066cc; color: white; border: none; padding: 8px 20px; border-radius: 24px; cursor: pointer; font-size: 13px; }
                .preview-btn:hover { background: #0052a3; }
                /* ダークモード */
                body.dark-mode .vs-header p { color: #94a3b8; }
                body.dark-mode .version-item { background: #1e293b; border-color: #334155; }
                body.dark-mode .version-item:hover { background: #2d3a4e; border-color: #60a5fa; }
                body.dark-mode .version-date { color: #94a3b8; }
                body.dark-mode .version-desc { color: #60a5fa; }
                /* スマホ */
                @media (max-width: 768px) {
                    .vs-container { padding: 12px; }
                    .version-item { flex-direction: column; gap: 12px; text-align: center; }
                    .preview-btn { width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        // イベント設定
        document.querySelectorAll('.version-item').forEach(item => {
            const url = item.dataset.url;
            const versionName = item.dataset.version;
            const btn = item.querySelector('.preview-btn');
            const isMobile = window.innerWidth <= 768;

            const openVersion = () => {
                if (isMobile) {
                    // スマホ：画面をプレビューに置き換え
                    selectedUrl = url;
                    isPreviewMode = true;
                    render(containerSelector);
                } else {
                    // PC：小窓モーダル
                    showPcModal(url, versionName);
                }
            };

            btn.onclick = (e) => {
                e.stopPropagation();
                openVersion();
            };
            item.onclick = openVersion;
        });
    };

    global.VersionSelector = { render, destroy };
})(window);
