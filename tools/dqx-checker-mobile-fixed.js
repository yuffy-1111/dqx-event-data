// ========== DQX日課チェッカー（最終版・セクション修正完了） ==========
(function(global) {
    // ===== ストレージキー =====
    const STORAGE_CHARS = 'dqx_chars_final10';
    const STORAGE_CHECK_PREFIX = 'dqx_check_final10_';
    const STORAGE_DISABLED = 'dqx_disabled_final10';
    const STORAGE_HIDDEN = 'dqx_hidden_tasks_v1';
    const STORAGE_CHECKS = 'dqx_limited_checks_v3';
    const EVENTS_URL = 'https://raw.githubusercontent.com/yuffy-1111/dqx-event-data/main/Checker.json';
    const RESET_HOUR = 6;

    // ===== タスク定義（keyは一意、固定） =====
    const sectionsTemplate = [
        { type: "section", label: "▼ 日課", sectionId: "daily-section", taskKey: "section_daily", cycleTaskId: null },
        { name: "日替わり討伐", taskId: "daily", key: "daily1" },
        { name: "深淵の咎人(ﾗｸﾘﾏ)", taskId: "daily", key: "daily2" },
        { name: "深淵の咎人(果実)", taskId: "daily", key: "daily3" },
        { name: "聖守護者の闘戦記", taskId: "daily", key: "daily4" },
        
        { type: "section", label: "▼ 週課", sectionId: "weekly-section", taskKey: "section_weekly", cycleTaskId: "weekly" },
        { name: "週替わり討伐", taskId: "weekly", key: "weekly1" },
        { name: "エピソード依頼帳", taskId: "weekly", key: "weekly2" },
        { name: "トレーニー育成帳", taskId: "weekly", key: "weekly3" },
        { name: "達人クエスト", taskId: "weekly", key: "weekly4" },
        { name: "王家の迷宮", taskId: "weekly", key: "weekly5" },
        { name: "ピラミッド", taskId: "weekly", key: "weekly6" },
        { name: "万魔の塔", taskId: "weekly", key: "weekly7" },
        { name: "アスタルジア探索", taskId: "weekly", key: "weekly8" },
        { name: "皇帝の創りしもの", taskId: "weekly", key: "weekly9" },
        { name: "ヴァリーブートキャンプ", taskId: "weekly", key: "weekly10" },
        
        { type: "section", label: "▼ 隔週", sectionId: "biweekly-section", taskKey: "section_biweekly", cycleTaskId: "roster" },
        { name: "ロスターのお題", taskId: "roster", key: "roster" },
        { name: "黄昏の奏戦記", taskId: "tasogare", key: "tasogare" },
        { name: "レモンスライムクイズ", taskId: "lemon", key: "lemon" },
        
        { type: "section", label: "▼ 邪神の宮殿", sectionId: "jashin-section", taskKey: "section_jashin", cycleTaskId: "jashin" },
        { name: "邪神の宮殿", taskId: "jashin", key: "jashin" },
        
        { type: "section", label: "▼ 月1回", sectionId: "monthly-section", taskKey: "section_monthly", cycleTaskId: "monthly" },
        { name: "異界の闘技場", taskId: "monthly", key: "monthly1" },
        
        { type: "section", label: "▼ 周期", sectionId: "period-section", taskKey: "section_period", cycleTaskId: "pani" },
        { name: "現世庫パニガルム", taskId: "pani", key: "pani" },
        
        { type: "section", label: "▼ 期間限定", sectionId: "limited-section", taskKey: "section_limited", cycleTaskId: "konmeiku" },
        { name: "昏冥庫パニガルム", taskId: "konmeiku", key: "konmeiku" },
        
        { type: "section", label: "▼ 受け取り（10日）", sectionId: "receive-10-section", taskKey: "section_receive_10", cycleTaskId: "sekkai" },
        { name: "覚醒の秘石", taskId: "sekkai", key: "sekkai" },
        
        { type: "section", label: "▼ 受け取り（1日）", sectionId: "receive-1-section", taskKey: "section_receive_1", cycleTaskId: "monthly" },
        { name: "宝珠ポイント(福引券)", taskId: "monthly", key: "monthly2" }
    ];

    function getTaskCount() { return sectionsTemplate.filter(item => !item.type).length; }

    // ===== 共通ユーティリティ =====
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    }

    function blendColor(hex, alpha, bgRgb) {
        const [r,g,b] = hexToRgb(hex);
        const [br,bg,bb] = bgRgb;
        const nr = Math.round(r*alpha + br*(1-alpha));
        const ng = Math.round(g*alpha + bg*(1-alpha));
        const nb = Math.round(b*alpha + bb*(1-alpha));
        return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
    }

    function isDarkMode() {
        return document.body.classList.contains('dark-mode');
    }

    function getColColor(hex) {
        return isDarkMode() ? blendColor(hex, 0.25, [17, 24, 39]) : blendColor(hex, 0.30, [255, 255, 255]);
    }

    function getJSTNow() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const jstOffset = -540;
        return new Date(now.getTime() + (offset - jstOffset) * 60000);
    }

    function getEffectiveDate(date) {
        const d = new Date(date);
        const hour = d.getHours();
        if (hour < 6) d.setDate(d.getDate() - 1);
        d.setHours(6, 0, 0, 0);
        return d;
    }

    function getDateKey(date) {
        const d = getEffectiveDate(date);
        return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    }

    function getWeekKey(date) {
        const d = getEffectiveDate(date);
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const week = Math.floor((d - jan1) / (7 * 86400000));
        return `${d.getFullYear()}_${week}`;
    }

    function parseDateKey(key) {
        const parts = key.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), 6, 0, 0);
    }

    function isSameDay(a, b) {
        const da = getEffectiveDate(a), db = getEffectiveDate(b);
        return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    }

    function isSameWeek(a, b) {
        return getWeekKey(a) === getWeekKey(b);
    }

    function parseToJST(str) {
        if (!str) return null;
        let d;
        if (str.includes('T')) {
            d = (!str.includes('+') && !str.includes('Z')) ? new Date(str + '+09:00') : new Date(str);
        } else {
            d = new Date(str + 'T00:00:00+09:00');
        }
        return isNaN(d.getTime()) ? null : d;
    }

    // ===== 周期計算関数 =====
    function getLastUpdateDateForTask(taskId, targetDate) {
        const target = getEffectiveDate(targetDate);
        const year = target.getFullYear();
        const month = target.getMonth();
        const day = target.getDate();

        switch(taskId) {
            case 'weekly': {
                const base = new Date(2026, 3, 12, 6, 0, 0);
                const hours = (target - base) / (1000 * 60 * 60);
                const cycles = Math.floor(hours / 168);
                return new Date(base.getTime() + cycles * 168 * 60 * 60 * 1000);
            }
            case 'pani': {
                const base = new Date(2026, 3, 12, 6, 0, 0);
                const hours = (target - base) / (1000 * 60 * 60);
                const cycles = Math.floor(hours / 72);
                return new Date(base.getTime() + cycles * 72 * 60 * 60 * 1000);
            }
            case 'roster':
            case 'tasogare':
            case 'lemon': {
                if (day >= 15) return new Date(year, month, 15, 6, 0, 0);
                else return new Date(year, month, 1, 6, 0, 0);
            }
            case 'jashin': {
                if (day >= 25) return new Date(year, month, 25, 6, 0, 0);
                else if (day >= 10) return new Date(year, month, 10, 6, 0, 0);
                else {
                    const prevMonth = new Date(year, month, 1);
                    prevMonth.setDate(0);
                    return new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 25, 6, 0, 0);
                }
            }
            case 'monthly': {
                return new Date(year, month, 1, 6, 0, 0);
            }
            case 'sekkai': {
                if (day >= 10) return new Date(year, month, 10, 6, 0, 0);
                else {
                    const prevMonth = new Date(year, month, 1);
                    prevMonth.setDate(0);
                    return new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10, 6, 0, 0);
                }
            }
            case 'daily':
            default:
                return target;
        }
    }

    function getNextUpdateDateForTask(taskId, targetDate) {
        const last = getLastUpdateDateForTask(taskId, targetDate);
        const next = new Date(last);
        
        switch(taskId) {
            case 'weekly': next.setTime(last.getTime() + 168 * 60 * 60 * 1000); break;
            case 'pani': next.setTime(last.getTime() + 72 * 60 * 60 * 1000); break;
            case 'roster':
            case 'tasogare':
            case 'lemon':
                if (last.getDate() === 1) next.setDate(15);
                else { next.setDate(1); next.setMonth(next.getMonth() + 1); }
                break;
            case 'jashin':
                if (last.getDate() === 10) next.setDate(25);
                else if (last.getDate() === 25) { next.setDate(10); next.setMonth(next.getMonth() + 1); }
                break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
            case 'sekkai': next.setMonth(next.getMonth() + 1); break;
            default: break;
        }
        return next;
    }

    // セクション用の次回表示テキストを取得
    function getSectionNextText(taskId, targetDate) {
        if (!taskId) return '';
        const effectiveNow = getEffectiveDate(targetDate);
        let nextDate;
        
        if (taskId === 'pani') {
            const last = getLastUpdateDateForTask('pani', effectiveNow);
            nextDate = new Date(last.getTime() + 72 * 60 * 60 * 1000);
            const diffDays = Math.ceil((nextDate - effectiveNow) / (1000 * 60 * 60 * 24));
            const nextStr = `${nextDate.getMonth()+1}/${nextDate.getDate()}`;
            if (diffDays <= 0) return `【次回 ${nextStr}】`;
            return `【次回 ${nextStr}（あと${diffDays}日）】`;
        }
        
        if (taskId === 'konmeiku') {
            const now = getEffectiveDate(targetDate);
            const day = now.getDate();
            let nextStart;
            if (day < 15) {
                nextStart = new Date(now.getFullYear(), now.getMonth(), 15, 6, 0, 0);
            } else {
                nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0);
            }
            const diffDays = Math.ceil((nextStart - now) / (1000 * 60 * 60 * 24));
            const nextStr = `${nextStart.getMonth()+1}/${nextStart.getDate()}`;
            if (diffDays <= 0) return `【次回 ${nextStr}】`;
            return `【次回 ${nextStr}（あと${diffDays}日）】`;
        }
        
        nextDate = getNextUpdateDateForTask(taskId, effectiveNow);
        const diffDays = Math.ceil((nextDate - effectiveNow) / (1000 * 60 * 60 * 24));
        const nextStr = `${nextDate.getMonth()+1}/${nextDate.getDate()}`;
        if (diffDays <= 0) return `【次回 ${nextStr}】`;
        return `【次回 ${nextStr}（あと${diffDays}日）】`;
    }

    // ===== パニガルム・昏冥庫関連 =====
    const PANI_BOSSES = ['ﾌｫﾙﾀﾞｲﾅ','ﾀﾞｲﾀﾞﾙﾓｽ','ﾊﾟﾆｶﾞｷｬｯﾁｬｰ','ﾌﾙﾎﾟﾃｨ','ﾌﾟﾙﾀﾇｽ','ｴﾙｷﾞｵｽ','ｱﾙﾏﾅ','ｼﾞｹﾞﾝﾘｭｳ'];
    const PANI_BASE = new Date(2026, 3, 12, 6, 0, 0);
    
    function getPaniDetail(targetDate) {
        const target = getEffectiveDate(targetDate);
        const hours = (target - PANI_BASE) / (1000 * 60 * 60);
        let cycle = Math.floor(hours / 72);
        if (hours < 0) cycle = -1;
        const bossIdx = ((cycle % 8) + 8) % 8;
        const startDate = new Date(PANI_BASE.getTime() + cycle * 72 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + 72 * 60 * 60 * 1000);
        function formatDate(d) { return `${d.getMonth()+1}/${d.getDate()}`; }
        return { name: `現世庫パニガルム`, detail: `${PANI_BOSSES[bossIdx]} ${formatDate(startDate)}〜${formatDate(endDate)}` };
    }

    const KONMEIKU_BOSSES = ['ﾊﾟﾆｽﾗｲﾑ', 'ｼﾞｪﾛﾄﾞｰﾗ', 'ﾌｫﾙｶﾞﾉｽ', 'ﾏｳﾌﾗｰﾄ'];
    const KONMEIKU_BASE = new Date(2026, 3, 1, 6, 0, 0);
    
    function getKonmeikuCycleIndex(targetDate) {
        const d = getEffectiveDate(targetDate);
        let count = 0;
        let current = new Date(KONMEIKU_BASE);
        while (current <= d) {
            const day = current.getDate();
            if (day === 1 || day === 15) count++;
            if (day === 1) current = new Date(current.getFullYear(), current.getMonth(), 15, 6, 0, 0);
            else current = new Date(current.getFullYear(), current.getMonth() + 1, 1, 6, 0, 0);
        }
        return ((count - 1) % 4 + 4) % 4;
    }
    
    function getKonmeikuDetail(targetDate) {
        const target = getEffectiveDate(targetDate);
        const day = target.getDate();
        const year = target.getFullYear();
        const month = target.getMonth();
        const isOpen = (day >= 1 && day <= 5) || (day >= 15 && day <= 20);
        function formatDate(d) { return `${d.getMonth()+1}/${d.getDate()}`; }
        if (isOpen) {
            const bossIdx = getKonmeikuCycleIndex(target);
            let period = '';
            if (day <= 5) period = `${formatDate(new Date(year, month, 1))}〜${formatDate(new Date(year, month, 5))}`;
            else period = `${formatDate(new Date(year, month, 15))}〜${formatDate(new Date(year, month, 20))}`;
            return { name: `昏冥庫パニガルム`, detail: `${KONMEIKU_BOSSES[bossIdx]} ${period}` };
        } else {
            let nextStart, nextEnd;
            if (day < 15) { nextStart = new Date(year, month, 15); nextEnd = new Date(year, month, 20); }
            else { nextStart = new Date(year, month + 1, 1); nextEnd = new Date(year, month + 1, 5); }
            return { name: `昏冥庫パニガルム`, detail: `未開催（次回 ${formatDate(nextStart)}〜${formatDate(nextEnd)}）` };
        }
    }

    // ===== キャラクター管理 =====
    let characters = [];
    let nextId = 1;
    let disabledMap = new Map();
    let hiddenMap = new Map();
    let isEditMode = false;
    let currentObserver = null;

    function loadCharacters() {
        const saved = localStorage.getItem(STORAGE_CHARS);
        if (saved) {
            try {
                characters = JSON.parse(saved);
                if (characters.length) nextId = Math.max(...characters.map(c => c.id), 0) + 1;
            } catch(e) { characters = []; }
        }
    }
    function saveCharacters() { localStorage.setItem(STORAGE_CHARS, JSON.stringify(characters)); }
    
    function loadDisabled() {
        const saved = localStorage.getItem(STORAGE_DISABLED);
        if (saved) {
            try { disabledMap = new Map(Object.entries(JSON.parse(saved))); } catch(e) { disabledMap = new Map(); }
        }
    }
    function saveDisabled() { localStorage.setItem(STORAGE_DISABLED, JSON.stringify(Object.fromEntries(disabledMap))); }
    function isDisabled(taskKey, charId) { return disabledMap.has(`${taskKey}_${charId}`); }
    function setDisabled(taskKey, charId, disabled) {
        const key = `${taskKey}_${charId}`;
        if (disabled) disabledMap.set(key, true);
        else disabledMap.delete(key);
        saveDisabled();
    }
    function toggleDisabled(taskKey, charId) { setDisabled(taskKey, charId, !isDisabled(taskKey, charId)); renderAll(); }

    function loadHidden() {
        const saved = localStorage.getItem(STORAGE_HIDDEN);
        if (saved) {
            try { hiddenMap = new Map(Object.entries(JSON.parse(saved))); } catch(e) { hiddenMap = new Map(); }
        }
    }
    function saveHidden() { localStorage.setItem(STORAGE_HIDDEN, JSON.stringify(Object.fromEntries(hiddenMap))); }
    function isHidden(taskKey) { return hiddenMap.has(taskKey); }
    function setHidden(taskKey, hidden) {
        if (hidden) hiddenMap.set(taskKey, true);
        else hiddenMap.delete(taskKey);
        saveHidden();
        renderAll();
    }
    function toggleHidden(taskKey) { setHidden(taskKey, !isHidden(taskKey)); }

    function addCharacter() {
        const nameInput = document.getElementById('newCharName');
        const colorPicker = document.getElementById('newCharColor');
        const newName = nameInput.value.trim();
        if (!newName) { alert('キャラ名を入力してください'); return; }
        characters.push({ id: nextId++, name: newName, color: colorPicker.value });
        saveCharacters();
        nameInput.value = '';
        renderAll();
    }
    function deleteCharacter(charId) {
        for (const item of sectionsTemplate) {
            if (!item.type) setDisabled(item.key, charId, false);
        }
        characters = characters.filter(c => c.id !== charId);
        saveCharacters();
        renderAll();
    }
    function editCharacterName(charId, newName) {
        const char = characters.find(c => c.id === charId);
        if (char && newName.trim()) { char.name = newName.trim(); saveCharacters(); renderAll(); }
    }
    function changeCharacterColor(charId, newColor) {
        const char = characters.find(c => c.id === charId);
        if (char) { char.color = newColor; saveCharacters(); renderAll(); }
    }

    // ===== チェックボックス保存/読込 =====
    function shouldReset(lastCheckedDate, todayDate, taskId) {
        if (taskId === 'konmeiku') {
            const target = getEffectiveDate(todayDate);
            const day = target.getDate();
            const isOpen = (day >= 1 && day <= 5) || (day >= 15 && day <= 20);
            if (isOpen) return false;
            return true;
        }
        const lastUpdate = getLastUpdateDateForTask(taskId, todayDate);
        return lastCheckedDate < lastUpdate;
    }

    function saveCheck(taskKey, charId, checked, todayDate) {
        const key = STORAGE_CHECK_PREFIX + taskKey + '_' + charId;
        const data = { checked: checked, lastDate: getDateKey(todayDate) };
        localStorage.setItem(key, JSON.stringify(data));
    }

    function loadCheck(taskKey, charId, todayDate, taskId) {
        const key = STORAGE_CHECK_PREFIX + taskKey + '_' + charId;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            if (!data.checked) return false;
            const lastDate = parseDateKey(data.lastDate);
            if (shouldReset(lastDate, todayDate, taskId)) {
                saveCheck(taskKey, charId, false, todayDate);
                return false;
            }
            return true;
        } catch(e) { return false; }
    }

    // ===== イベント関連 =====
    function isEventActive(event, now) {
        const start = parseToJST(event.startDateTime || event.startDate);
        const end = parseToJST(event.endDateTime || event.endDate);
        if (!start || !end) return false;
        return now >= start && now <= end;
    }

    function getEventPeriodStr(event) {
        const start = parseToJST(event.startDateTime || event.startDate);
        const end = parseToJST(event.endDateTime || event.endDate);
        if (!start || !end) return '期間不明';
        const fmtDateTime = (d) => {
            const h = d.getHours(), m = d.getMinutes();
            const base = `${d.getMonth()+1}/${d.getDate()}`;
            if (h === 0 && m === 0) return base;
            return `${base} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };
        return `${fmtDateTime(start)}〜${fmtDateTime(end)}`;
    }

    function getLimCheckKey(eventId, charId, periodKey) {
        return `${STORAGE_CHECKS}_${eventId}_${charId}_${periodKey}`;
    }

    function isLimChecked(event, charId, today) {
        if (!isEventActive(event, today)) return false;
        let periodKey;
        if (event.resetType === 'weekly') periodKey = getWeekKey(today);
        else if (event.resetType === 'daily') periodKey = getDateKey(today);
        else periodKey = `once_${event.id}`;
        const key = getLimCheckKey(event.id, charId, periodKey);
        if (localStorage.getItem(key) !== '1') return false;
        const lastStr = localStorage.getItem(getLimCheckKey(event.id, charId, 'last_date'));
        if (lastStr) {
            const last = new Date(lastStr);
            if (event.resetType === 'daily' && !isSameDay(last, today)) { localStorage.removeItem(key); return false; }
            if (event.resetType === 'weekly' && !isSameWeek(last, today)) { localStorage.removeItem(key); return false; }
        }
        return true;
    }

    function setLimChecked(event, charId, checked, today) {
        if (!isEventActive(event, today) && checked) return;
        let periodKey;
        if (event.resetType === 'weekly') periodKey = getWeekKey(today);
        else if (event.resetType === 'daily') periodKey = getDateKey(today);
        else periodKey = `once_${event.id}`;
        const key = getLimCheckKey(event.id, charId, periodKey);
        localStorage.setItem(key, checked ? '1' : '0');
        if (checked) localStorage.setItem(getLimCheckKey(event.id, charId, 'last_date'), today.toISOString());
    }

    function validateEventData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.events)) return false;
        for (const event of data.events) {
            if (typeof event.id === 'undefined' || typeof event.name !== 'string') {
                return false;
            }
        }
        return true;
    }

    // ===== 詳細テーブル描画 =====
    async function renderDetailTable() {
        const today = getJSTNow();
        const detailContainer = document.getElementById('detailTableContainer');
        if (!detailContainer) return;

        let html = '<div style="margin-top: 20px; overflow-x: auto;"><table class="detail-table" style="width: 100%; border-collapse: collapse; font-size: 0.7rem;">';
        html += '<thead><tr style="background: #e6edf4;"><th style="padding: 6px; text-align: left;">名称</th><th style="padding: 6px; text-align: left;">詳細</th></td></thead><tbody>';

        // パニガルムセクション
        html += '<tr class="detail-section-row"><td colspan="2" style="padding: 6px 8px; background: #e9edf2; font-weight: bold; text-align: left;">▼ パニガルム</td></tr>';
        
        const paniDetail = getPaniDetail(today);
        html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(paniDetail.name)}</td>`;
        html += `<td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(paniDetail.detail)}</td></tr>`;

        const konmeikuDetail = getKonmeikuDetail(today);
        html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(konmeikuDetail.name)}</td>`;
        html += `<td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(konmeikuDetail.detail)}</td></tr>`;

        // イベントセクション
        let events = [];
        try {
            const res = await fetch(EVENTS_URL, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (validateEventData(data)) {
                    events = data.events.filter(e => isEventActive(e, today));
                }
            }
        } catch(e) {
            console.error('イベント取得失敗:', e);
        }

        if (events.length) {
            html += '<tr class="detail-section-row"><td colspan="2" style="padding: 6px 8px; background: #e9edf2; font-weight: bold; text-align: left;">▼ イベント</td></tr>';
            for (const event of events) {
                html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(event.name)}</td>`;
                html += `<td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(getEventPeriodStr(event))}</td></tr>`;
            }
        }

        html += '</tbody></table></div>';
        detailContainer.innerHTML = html;
    }

    // ===== メイン描画関数 =====
    function toggleEditMode() {
        isEditMode = !isEditMode;
        const editBtn = document.getElementById('editModeBtn');
        if (isEditMode) {
            editBtn.textContent = '🔒 編集モード終了';
            editBtn.classList.add('edit-mode-active');
        } else {
            editBtn.textContent = '✏️ 編集モード';
            editBtn.classList.remove('edit-mode-active');
        }
        renderAll();
    }

    // イベントセクションと行を描画
    async function renderEventRows(tbody, targetDate) {
        let events = [];
        try {
            const res = await fetch(EVENTS_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!validateEventData(data)) return;
            events = data.events.filter(e => isEventActive(e, targetDate));
        } catch(e) {
            console.error('イベント取得失敗:', e);
            return;
        }

        if (!events.length) return;

        const dailyEvents = events.filter(e => e.resetType === 'daily');
        const otherEvents = events.filter(e => e.resetType !== 'daily');

        // 毎日イベントセクション
        if (dailyEvents.length) {
            const secRow = document.createElement('tr');
            secRow.className = 'section-row';
            const secTd = document.createElement('td');
            secTd.colSpan = 1 + characters.length;
            secTd.style.padding = '4px 8px';
            
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'baseline';
            container.style.gap = '10px';
            
            const labelSpan = document.createElement('span');
            labelSpan.innerText = '▼ イベント（毎日）';
            container.appendChild(labelSpan);
            secTd.appendChild(container);
            secRow.appendChild(secTd);
            tbody.appendChild(secRow);

            for (const event of dailyEvents) {
                const isHiddenRow = isHidden(`event_${event.id}`);
                if (!isEditMode && isHiddenRow) continue;
                
                const row = document.createElement('tr');
                if (isHiddenRow && isEditMode) row.style.opacity = '0.5';
                row.style.backgroundColor = isHiddenRow && isEditMode ? '#f0f0f0' : '';
                
                const tdName = document.createElement('td');
                tdName.className = 'task-name';
                tdName.style.display = 'flex';
                tdName.style.alignItems = 'center';
                tdName.style.gap = '6px';
                
                if (isEditMode) {
                    const hideBtn = document.createElement('button');
                    hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                    hideBtn.style.width = '28px';
                    hideBtn.style.height = '28px';
                    hideBtn.style.borderRadius = '8px';
                    hideBtn.style.cursor = 'pointer';
                    hideBtn.style.fontSize = '14px';
                    hideBtn.style.backgroundColor = isHiddenRow ? '#10b981' : '#ef4444';
                    hideBtn.style.border = '1px solid #cbd5e1';
                    hideBtn.style.color = 'white';
                    hideBtn.onclick = (() => { toggleHidden(`event_${event.id}`); });
                    tdName.appendChild(hideBtn);
                }
                
                const nameSpan = document.createElement('span');
                nameSpan.innerText = event.name;
                tdName.appendChild(nameSpan);
                row.appendChild(tdName);

                for (const ch of characters) {
                    const td = document.createElement('td');
                    const colBg = getColColor(ch.color);
                    td.style.backgroundColor = colBg;
                    
                    const disabled = isDisabled(`event_${event.id}`, ch.id);
                    
                    if (isEditMode) {
                        const editButton = document.createElement('div');
                        editButton.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                        editButton.innerText = disabled ? '🔒' : '🔓';
                        editButton.onclick = (function(ev, cid) {
                            return function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleDisabled(`event_${ev.id}`, cid);
                                return false;
                            };
                        })(event, ch.id);
                        td.appendChild(editButton);
                    } else if (!isHiddenRow) {
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        if (disabled) {
                            cb.disabled = true;
                            cb.classList.add('disabled-checkbox');
                        } else {
                            cb.checked = isLimChecked(event, ch.id, targetDate);
                            cb.addEventListener('change', (function(ev, cid, d) {
                                return function(e) {
                                    setLimChecked(ev, cid, e.target.checked, d);
                                };
                            })(event, ch.id, targetDate));
                        }
                        td.appendChild(cb);
                    }
                    row.appendChild(td);
                }
                tbody.appendChild(row);
            }
        }

        // 期間中1回イベントセクション
        if (otherEvents.length) {
            const secRow = document.createElement('tr');
            secRow.className = 'section-row';
            const secTd = document.createElement('td');
            secTd.colSpan = 1 + characters.length;
            secTd.style.padding = '4px 8px';
            
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'baseline';
            container.style.gap = '10px';
            
            const labelSpan = document.createElement('span');
            labelSpan.innerText = '▼ イベント（期間中1回）';
            container.appendChild(labelSpan);
            secTd.appendChild(container);
            secRow.appendChild(secTd);
            tbody.appendChild(secRow);

            for (const event of otherEvents) {
                const isHiddenRow = isHidden(`event_${event.id}`);
                if (!isEditMode && isHiddenRow) continue;
                
                const row = document.createElement('tr');
                if (isHiddenRow && isEditMode) row.style.opacity = '0.5';
                row.style.backgroundColor = isHiddenRow && isEditMode ? '#f0f0f0' : '';
                
                const tdName = document.createElement('td');
                tdName.className = 'task-name';
                tdName.style.display = 'flex';
                tdName.style.alignItems = 'center';
                tdName.style.gap = '6px';
                
                if (isEditMode) {
                    const hideBtn = document.createElement('button');
                    hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                    hideBtn.style.width = '28px';
                    hideBtn.style.height = '28px';
                    hideBtn.style.borderRadius = '8px';
                    hideBtn.style.cursor = 'pointer';
                    hideBtn.style.fontSize = '14px';
                    hideBtn.style.backgroundColor = isHiddenRow ? '#10b981' : '#ef4444';
                    hideBtn.style.border = '1px solid #cbd5e1';
                    hideBtn.style.color = 'white';
                    hideBtn.onclick = (() => { toggleHidden(`event_${event.id}`); });
                    tdName.appendChild(hideBtn);
                }
                
                const nameSpan = document.createElement('span');
                nameSpan.innerText = event.name;
                tdName.appendChild(nameSpan);
                row.appendChild(tdName);

                for (const ch of characters) {
                    const td = document.createElement('td');
                    const colBg = getColColor(ch.color);
                    td.style.backgroundColor = colBg;
                    
                    const disabled = isDisabled(`event_${event.id}`, ch.id);
                    
                    if (isEditMode) {
                        const editButton = document.createElement('div');
                        editButton.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                        editButton.innerText = disabled ? '🔒' : '🔓';
                        editButton.onclick = (function(ev, cid) {
                            return function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleDisabled(`event_${ev.id}`, cid);
                                return false;
                            };
                        })(event, ch.id);
                        td.appendChild(editButton);
                    } else if (!isHiddenRow) {
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        if (disabled) {
                            cb.disabled = true;
                            cb.classList.add('disabled-checkbox');
                        } else {
                            cb.checked = isLimChecked(event, ch.id, targetDate);
                            cb.addEventListener('change', (function(ev, cid, d) {
                                return function(e) {
                                    setLimChecked(ev, cid, e.target.checked, d);
                                };
                            })(event, ch.id, targetDate));
                        }
                        td.appendChild(cb);
                    }
                    row.appendChild(td);
                }
                tbody.appendChild(row);
            }
        }
    }

    function renderAll() {
        const targetDate = getJSTNow();
        const effectiveDate = getEffectiveDate(targetDate);
        
        const todayInfo = document.getElementById('todayInfo');
        if (todayInfo) {
            todayInfo.innerHTML = '<div>📆 ' + (targetDate.getMonth()+1) + '/' + targetDate.getDate() + '</div><div>✅ 各6時リセット</div>';
        }

        const headerRow = document.getElementById('headerRow');
        if (headerRow) {
            while (headerRow.children.length > 1) headerRow.removeChild(headerRow.lastChild);
            for (let ch of characters) {
                const colBg = getColColor(ch.color);
                const th = document.createElement('th');
                th.className = 'char-header';
                th.style.backgroundColor = colBg;
                const contentDiv = document.createElement('div');
                contentDiv.className = 'char-header-content';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'char-name';
                nameSpan.innerText = ch.name;
                nameSpan.contentEditable = 'true';
                nameSpan.addEventListener('blur', (id => e => editCharacterName(id, e.target.innerText))(ch.id));
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'char-controls';
                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.value = ch.color;
                colorPicker.className = 'char-color-input';
                colorPicker.addEventListener('change', (id => e => changeCharacterColor(id, e.target.value))(ch.id));
                const delBtn = document.createElement('button');
                delBtn.innerText = '✕';
                delBtn.className = 'char-delete';
                delBtn.addEventListener('click', (id => () => deleteCharacter(id))(ch.id));
                controlsDiv.appendChild(colorPicker);
                controlsDiv.appendChild(delBtn);
                contentDiv.appendChild(nameSpan);
                contentDiv.appendChild(controlsDiv);
                th.appendChild(contentDiv);
                headerRow.appendChild(th);
            }
        }

        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        for (let item of sectionsTemplate) {
            if (item.type === 'section') {
                const isHiddenRow = isHidden(item.taskKey);
                if (!isEditMode && isHiddenRow) continue;

                const row = document.createElement('tr');
                row.className = 'section-row';
                if (isHiddenRow && isEditMode) row.style.opacity = '0.5';

                const td = document.createElement('td');
                td.colSpan = 1 + characters.length;
                td.style.padding = '4px 8px';

                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'baseline';
                container.style.gap = '10px';

                // 非表示ボタン（編集モード時）
                if (isEditMode && item.taskKey) {
                    const hideBtn = document.createElement('button');
                    hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                    hideBtn.style.width = '26px';
                    hideBtn.style.height = '26px';
                    hideBtn.style.borderRadius = '6px';
                    hideBtn.style.cursor = 'pointer';
                    hideBtn.style.fontSize = '13px';
                    hideBtn.style.backgroundColor = isHiddenRow ? '#10b981' : '#ef4444';
                    hideBtn.style.border = '1px solid #cbd5e1';
                    hideBtn.style.color = 'white';
                    hideBtn.onclick = (() => { toggleHidden(item.taskKey); });
                    container.appendChild(hideBtn);
                }

                // ラベル
                const labelSpan = document.createElement('span');
                labelSpan.innerText = item.label;

                // 次回表示
                const nextText = getSectionNextText(item.cycleTaskId, targetDate);
                if (nextText) {
                    const nextSpan = document.createElement('span');
                    nextSpan.innerText = nextText;
                    nextSpan.style.fontSize = '0.6rem';
                    nextSpan.style.opacity = '0.85';
                    nextSpan.style.marginLeft = '6px';
                    labelSpan.appendChild(nextSpan);
                }

                container.appendChild(labelSpan);
                td.appendChild(container);
                row.appendChild(td);
                tbody.appendChild(row);
                continue;
            }

            const isHiddenRow = isHidden(item.key);
            if (!isEditMode && isHiddenRow) continue;
            
            const row = document.createElement('tr');
            if (isHiddenRow && isEditMode) row.style.opacity = '0.5';
            
            const tdName = document.createElement('td');
            tdName.className = 'task-name';
            tdName.style.display = 'flex';
            tdName.style.alignItems = 'center';
            tdName.style.gap = '6px';
            
            if (isEditMode) {
                const hideBtn = document.createElement('button');
                hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                hideBtn.style.width = '28px';
                hideBtn.style.height = '28px';
                hideBtn.style.borderRadius = '8px';
                hideBtn.style.cursor = 'pointer';
                hideBtn.style.fontSize = '14px';
                hideBtn.style.backgroundColor = isHiddenRow ? '#10b981' : '#ef4444';
                hideBtn.style.border = '1px solid #cbd5e1';
                hideBtn.style.color = 'white';
                hideBtn.onclick = (() => { toggleHidden(item.key); });
                tdName.appendChild(hideBtn);
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = item.name;
            tdName.appendChild(nameSpan);
            row.appendChild(tdName);

            for (let ch of characters) {
                const tdChk = document.createElement('td');
                const colBg = getColColor(ch.color);
                tdChk.style.backgroundColor = colBg;
                
                const disabled = isDisabled(item.key, ch.id);
                
                if (isEditMode) {
                    tdChk.classList.add('edit-mode-cell');
                    const editButton = document.createElement('div');
                    editButton.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                    editButton.innerText = disabled ? '🔒' : '🔓';
                    editButton.onclick = (function(k, cid) {
                        return function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDisabled(k, cid);
                            return false;
                        };
                    })(item.key, ch.id);
                    tdChk.appendChild(editButton);
                } else if (!isHiddenRow) {
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    if (disabled) {
                        cb.disabled = true;
                        cb.classList.add('disabled-checkbox');
                    } else {
                        const isChecked = loadCheck(item.key, ch.id, effectiveDate, item.taskId);
                        cb.checked = isChecked;
                        cb.addEventListener('change', (function(k, cid, d, tid) {
                            return function(e) {
                                saveCheck(k, cid, e.target.checked, d);
                            };
                        })(item.key, ch.id, effectiveDate, item.taskId));
                    }
                    tdChk.appendChild(cb);
                }
                row.appendChild(tdChk);
            }
            tbody.appendChild(row);
        }

        renderEventRows(tbody, targetDate);
        renderDetailTable();
    }

    // ===== スタイル定義 =====
    const toolStyle = `
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #eef2f7; margin: 0; padding: 8px; color: #1e2f3f; }
.container { max-width: 100%; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.05); padding: 6px 0 20px; overflow-x: auto; }
.toolbar { display: flex; gap: 6px; padding: 6px 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #e2edf2; }
.toolbar input { padding: 5px 8px; font-size: 0.7rem; border: 1px solid #ccc; border-radius: 20px; width: 90px; }
.toolbar input[type="color"] { width: 32px; height: 30px; border-radius: 20px; cursor: pointer; }
.toolbar button { background: #eef2ff; border: none; padding: 5px 12px; border-radius: 30px; font-size: 0.7rem; font-weight: 500; cursor: pointer; transition: 0.1s; }
.add-btn { background: #0066cc !important; color: white !important; }
.edit-btn { background: #f59e0b !important; color: white !important; }
.edit-mode-active { background: #10b981 !important; color: white !important; }
.today-card { background: #fefce8; border-left: 3px solid #f5a623; margin: 6px 12px; padding: 4px 10px; border-radius: 10px; display: flex; justify-content: space-between; font-size: 0.65rem; flex-wrap: wrap; }
table { width: 100%; border-collapse: collapse; font-size: 0.7rem; }
th, td { border-bottom: 1px solid #e2edf2; padding: 5px 3px; text-align: center; vertical-align: middle; }
th { background: #e6edf4; font-weight: 600; font-size: 0.7rem; }
thead tr th:first-child { position: sticky; left: 0; background-color: #e6edf4; z-index: 2; }
tbody tr td:first-child { position: sticky; left: 0; background-color: #fafcff; z-index: 1; }
.task-name { font-weight: 600; text-align: left; padding-left: 6px; white-space: nowrap; font-size: 0.7rem; }

/* ===== セクション固定＆視認性 ===== */
.section-row {
    position: relative;
    z-index: 3;
    background: #b8c7da !important;
    border-top: 2px solid #94a8c2;
    border-bottom: 2px solid #94a8c2;
}

.section-row td {
    position: sticky;
    left: 0;
    z-index: 4;
    background: inherit !important;
    color: #1e3a5f !important;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.detail-section-row td { background: #e9edf2; font-weight: bold; }

.char-header { min-width: 70px; }
.char-header-content { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.char-name { display: inline-block; padding: 2px 4px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.75rem; white-space: nowrap; }
.char-controls { display: flex; gap: 4px; justify-content: center; align-items: center; }
.char-color-input { width: 18px; height: 18px; border: 1px solid #ccc; border-radius: 50%; cursor: pointer; }
.char-delete { background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #a00; font-weight: bold; padding: 0 2px; }
input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #2c7da0; margin: 0; }
input[type="checkbox"].disabled-checkbox { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.edit-mode-cell { background-color: #fff3e0; }
.edit-button { width: 28px; height: 28px; margin: 0 auto; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s; font-size: 14px; background-color: #e2e8f0; border: 1px solid #cbd5e1; }
.edit-button-enabled { background-color: #e2e8f0; border: 1px solid #cbd5e1; }
.edit-button-disabled { background-color: #f59e0b; border: 1px solid #d97706; color: white; }
.detail-table th, .detail-table td { text-align: left; padding: 6px 8px; }
@media (max-width: 768px) {
  body { padding: 12px 0 0 0 !important; }
  .container { padding: 6px 0 100px !important; }
  .char-name { font-size: 0.65rem; }
  .toolbar input { width: 70px; }
  .toolbar button { padding: 5px 8px; font-size: 0.65rem; }
  .edit-button { width: 24px; height: 24px; font-size: 12px; }
}
body.dark-mode { background: #0f172a; color: #e5e7eb; }
body.dark-mode .container { background: #111827; }
body.dark-mode .toolbar { border-bottom-color: #2a3441; }
body.dark-mode .toolbar input { background: #374151; border-color: #4b5563; color: #e5e7eb; }
body.dark-mode .toolbar button { background: #374151; color: #e5e7eb; }
body.dark-mode .add-btn { background: #3399ff !important; }
body.dark-mode .edit-btn { background: #f59e0b !important; }
body.dark-mode .edit-mode-active { background: #10b981 !important; }
body.dark-mode .today-card { background: #1f2937; border-left-color: #f59e0b; }
body.dark-mode table { background: #111827; }
body.dark-mode th { background: #1f2937; color: #fff; border-bottom-color: #374151; }
body.dark-mode td { color: #fff; border-bottom-color: #2a3441; }
body.dark-mode tbody tr td:first-child { background: #111827 !important; }
body.dark-mode thead tr th:first-child { background: #1f2937 !important; }

/* ダークモード セクション行 */
body.dark-mode .section-row {
    background: #334155 !important;
    border-top: 2px solid #475569;
    border-bottom: 2px solid #475569;
}

body.dark-mode .section-row td {
    color: #ffffff !important;
}

body.dark-mode .detail-section-row td { background: #2d3a4a; }
body.dark-mode .char-name { color: #fff; }
body.dark-mode .char-delete { color: #f88; }
body.dark-mode .edit-mode-cell { background-color: #2a2a2a; }
body.dark-mode .edit-button-enabled { background-color: #374151; border-color: #4b5563; color: #fff; }
body.dark-mode .edit-button-disabled { background-color: #f59e0b; border-color: #d97706; }
</style>
`;

    // ===== 外部公開 =====
    global.DQXDailyChecker = {
        render: function(containerSelector) {
            const container = document.querySelector(containerSelector);
            if (!container) return;
            
            container.innerHTML = toolStyle + `
<div class="container">
<div id="toolbar" class="toolbar">
<input id="newCharName" type="text" placeholder="キャラ名" />
<input id="newCharColor" type="color" value="#d4eaf3" />
<button id="addCharBtn" class="add-btn">＋ 追加</button>
<button id="editModeBtn" class="edit-btn">✏️ 編集モード</button>
</div>
<div id="todayInfo" class="today-card"></div>
<div style="overflow-x: auto;">
<table id="mainTable">
<thead id="tableHeader">
<tr id="headerRow"><th>項目</th></td>
</thead>
<tbody id="tableBody"></tbody>
</table>
</div>
<div id="detailTableContainer"></div>
</div>
`;
            
            loadCharacters();
            loadDisabled();
            loadHidden();
            
            const addBtn = document.getElementById('addCharBtn');
            const editBtn = document.getElementById('editModeBtn');
            if (addBtn) addBtn.addEventListener('click', addCharacter);
            if (editBtn) editBtn.addEventListener('click', toggleEditMode);
            
            renderAll();
            
            if (currentObserver) currentObserver.disconnect();
            currentObserver = new MutationObserver(() => {
                if (typeof renderAll === 'function') renderAll();
            });
            currentObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        },
        
        destroy: function() {
            if (currentObserver) {
                currentObserver.disconnect();
                currentObserver = null;
            }
            const addBtn = document.getElementById('addCharBtn');
            const editBtn = document.getElementById('editModeBtn');
            if (addBtn) addBtn.replaceWith(addBtn.cloneNode(true));
            if (editBtn) editBtn.replaceWith(editBtn.cloneNode(true));
        }
    };
})(window);
