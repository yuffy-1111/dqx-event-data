// ========== 設定ツール（ダークモード対応版） ==========
(function(global) {
    const Settings = {
        render: function(containerSelector) {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            container.innerHTML = `
                <div class="settings-container">
                    <h2>⚙️ 設定</h2>
                    
                    <div class="settings-card">
                        <h3>🗑️ データ管理</h3>
                        <div class="button-group">
                            <button id="clearAllCache" class="btn-danger">全キャッシュを削除</button>
                            <button id="clearCheckerCache" class="btn-warning">チェックデータのみ削除</button>
                        </div>
                        <p class="settings-note">
                            ※ 削除すると復元できません。呪文書き出しでバックアップすることをおすすめします。
                        </p>
                    </div>

                    <div class="settings-card">
                        <h3>📦 ストレージ状況</h3>
                        <div id="storageInfo"></div>
                    </div>

                    <div class="feedback-card">
                        <h3>📢 フィードバックはこちら</h3>
                        <div class="link-buttons">
                            <a href="https://github.com/yuffy-1111/dqx-event-data/issues" target="_blank" class="github-link">
                                🐙 GitHub Issues
                            </a>
                            <a href="https://x.com/yuffy_rre_dqx" target="_blank" class="x-link">
                                𝕏 @yuffy_rre_dqx
                            </a>
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3>ℹ️ このツールについて</h3>
                        <p>DQXツールセット - 製作:yuffy_rre</p>
                        <p>バージョン: 2.1.0</p>
                    </div>
                </div>
            `;

            // スタイル
            const style = document.createElement('style');
            style.textContent = `
                .settings-container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .settings-container h2 {
                    margin: 0 0 20px 0;
                    color: #0066cc;
                }
                .settings-card {
                    background: #f5f5f5;
                    border-radius: 12px;
                    padding: 16px;
                    margin: 20px 0;
                    border: 1px solid #e0e0e0;
                }
                .feedback-card {
                    background: #f5f5f5;
                    border-radius: 12px;
                    padding: 16px;
                    margin: 20px 0;
                    border: 1px solid #e0e0e0;
                    text-align: center;
                }
                .settings-card h3, .feedback-card h3 {
                    margin: 0 0 12px 0;
                    color: #333;
                }
                .button-group {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 12px;
                }
                .btn-danger {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .btn-warning {
                    background: #ffc107;
                    color: #333;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .settings-note {
                    font-size: 12px;
                    color: #666;
                    margin-top: 10px;
                }
                #storageInfo p {
                    margin: 8px 0;
                    font-size: 14px;
                }
                .link-buttons {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .github-link {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #24292f;
                    color: white;
                    text-decoration: none;
                    border-radius: 30px;
                    font-size: 14px;
                }
                .github-link:hover {
                    background: #3b444f;
                }
                .x-link {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #000000;
                    color: white;
                    text-decoration: none;
                    border-radius: 30px;
                    font-size: 14px;
                }
                .x-link:hover {
                    background: #333333;
                }
                /* ダークモード */
                body.dark-mode .settings-container h2 {
                    color: #60a5fa;
                }
                body.dark-mode .settings-card {
                    background: #1e293b;
                    border-color: #334155;
                }
                body.dark-mode .feedback-card {
                    background: #1e293b;
                    border-color: #334155;
                }
                body.dark-mode .settings-card h3 {
                    color: #e2e8f0;
                }
                body.dark-mode .feedback-card h3 {
                    color: #e2e8f0;
                }
                body.dark-mode .settings-card p {
                    color: #cbd5e1;
                }
                body.dark-mode .settings-note {
                    color: #94a3b8;
                }
                body.dark-mode .btn-warning {
                    background: #d97706;
                    color: white;
                }
                body.dark-mode #storageInfo {
                    color: #cbd5e1;
                }
                body.dark-mode .github-link {
                    background: #4b5563;
                }
                body.dark-mode .github-link:hover {
                    background: #6b7280;
                }
                body.dark-mode .x-link {
                    background: #1e293b;
                }
                body.dark-mode .x-link:hover {
                    background: #334155;
                }
            `;
            container.appendChild(style);

            // ストレージ状況を表示
            function updateStorageInfo() {
                let total = 0;
                let count = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('dqx_')) {
                        total += localStorage.getItem(key).length;
                        count++;
                    }
                }
                const infoDiv = document.getElementById('storageInfo');
                if (infoDiv) {
                    infoDiv.innerHTML = `
                        <p>📊 内部データ: ${count} 項目</p>
                        <p>💾 概算サイズ: ${Math.round(total / 1024)} KB</p>
                    `;
                }
            }

            // 全キャッシュ削除
            const clearBtn = document.getElementById('clearAllCache');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    if (confirm('すべてのデータを削除します。よろしいですか？')) {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('dqx_')) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach(key => localStorage.removeItem(key));
                        updateStorageInfo();
                        alert(`✅ ${keysToRemove.length}個のデータを削除しました`);
                    }
                };
            }

            // チェッカーデータのみ削除
            const checkerBtn = document.getElementById('clearCheckerCache');
            if (checkerBtn) {
                checkerBtn.onclick = () => {
                    if (confirm('チェッカーのデータ（キャラクター、チェック状態、非表示設定）を削除します。よろしいですか？')) {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && (key.startsWith('dqx_chars') || key.startsWith('dqx_check_') || key.startsWith('dqx_disabled_') || key.startsWith('dqx_hidden_'))) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach(key => localStorage.removeItem(key));
                        updateStorageInfo();
                        alert(`✅ ${keysToRemove.length}個のチェッカーデータを削除しました`);
                    }
                };
            }

            updateStorageInfo();
        },
        
        destroy: function() {}
    };

    global.Settings = Settings;
})(window);
