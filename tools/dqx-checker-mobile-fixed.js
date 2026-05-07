// ========== DQX日課チェッカー（分割テーブル版：項目列を独立テーブルで固定） ==========
(function(global) {
    // ===== ストレージキー =====
    const STORAGE_CHARS = 'dqx_chars_final10';
    const STORAGE_CHECK_PREFIX = 'dqx_check_final10_';
    const STORAGE_DISABLED = 'dqx_disabled_final10';
    const STORAGE_HIDDEN = 'dqx_hidden_tasks_v1';
    const STORAGE_CHECKS = 'dqx_limited_checks_v3';
    const EVENTS_URL = 'https://raw.githubusercontent.com/yuffy-1111/dqx-event-data/main/Checker.json';
    const RESET_HOUR = 6;

    // ===== タスク定義 =====
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
        { type: "section", label: "▼ 隔週2", sectionId: "jashin-section", taskKey: "section_jashin", cycleTaskId: "jashin" },
        { name: "邪神の宮殿", taskId: "jashin", key: "jashin" },
        { type: "section", label: "▼ 月1回", sectionId: "monthly-section", taskKey: "section_monthly", cycleTaskId: "monthly" },
        { name: "異界の闘技場", taskId: "monthly", key: "monthly1" },
        { type: "section", label: "▼ 周期", sectionId: "period-section", taskKey: "section_period", cycleTaskId: "pani" },
        { name: "現世庫パニガルム", taskId: "pani", key: "pani" },
        { type: "section", label: "▼ 期間限定", sectionId: "limited-section", taskKey: "section_limited", cycleTaskId: "konmeiku" },
        { name: "昏冥庫パニガルム", taskId: "konmeiku", key: "konmeiku" },
        { type: "section", label: "▼ 受け取り", sectionId: "receive-10-section", taskKey: "section_receive_10", cycleTaskId: "sekkai" },
        { name: "覚醒の秘石", taskId: "sekkai", key: "sekkai" },
        { type: "section", label: "▼ 受け取り", sectionId: "receive-1-section", taskKey: "section_receive_1", cycleTaskId: "monthly" },
        { name: "宝珠ポイント(福引券)", taskId: "monthly", key: "monthly2" }
    ];

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
    function isDarkMode() { return document.body.classList.contains('dark-mode'); }
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
    function isSameWeek(a, b) { return getWeekKey(a) === getWeekKey(b); }
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

    // ===== 周期計算 =====
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
            case 'lemon':
                if (day >= 15) return new Date(year, month, 15, 6, 0, 0);
                else return new Date(year, month, 1, 6, 0, 0);
            case 'jashin':
                if (day >= 25) return new Date(year, month, 25, 6, 0, 0);
                else if (day >= 10) return new Date(year, month, 10, 6, 0, 0);
                else {
                    const prevMonth = new Date(year, month, 1);
                    prevMonth.setDate(0);
                    return new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 25, 6, 0, 0);
                }
            case 'monthly':
                return new Date(year, month, 1, 6, 0, 0);
            case 'sekkai':
                if (day >= 10) return new Date(year, month, 10, 6, 0, 0);
                else {
                    const prevMonth = new Date(year, month, 1);
                    prevMonth.setDate(0);
                    return new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10, 6, 0, 0);
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
            case 'pani':   next.setTime(last.getTime() + 72 * 60 * 60 * 1000); break;
            case 'roster': case 'tasogare': case 'lemon':
                if (last.getDate() === 1) next.setDate(15);
                else { next.setDate(1); next.setMonth(next.getMonth() + 1); }
                break;
            case 'jashin':
                if (last.getDate() === 10) next.setDate(25);
                else if (last.getDate() === 25) { next.setDate(10); next.setMonth(next.getMonth() + 1); }
                break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
            case 'sekkai':  next.setMonth(next.getMonth() + 1); break;
        }
        return next;
    }
    function getSectionNextText(taskId, targetDate) {
        if (!taskId) return '';
        const effectiveNow = getEffectiveDate(targetDate);
        let nextDate;
        if (taskId === 'pani') {
            const last = getLastUpdateDateForTask('pani', effectiveNow);
            nextDate = new Date(last.getTime() + 72 * 60 * 60 * 1000);
            const diffDays = Math.ceil((nextDate - effectiveNow) / (1000 * 60 * 60 * 24));
            const nextStr = `${nextDate.getMonth()+1}/${nextDate.getDate()}`;
            return diffDays <= 0 ? `【次回 ${nextStr}】` : `【次回 ${nextStr}（あと${diffDays}日）】`;
        }
        if (taskId === 'konmeiku') {
            const now = getEffectiveDate(targetDate);
            const day = now.getDate();
            let nextStart = day < 15
                ? new Date(now.getFullYear(), now.getMonth(), 15, 6, 0, 0)
                : new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0);
            const diffDays = Math.ceil((nextStart - now) / (1000 * 60 * 60 * 24));
            const nextStr = `${nextStart.getMonth()+1}/${nextStart.getDate()}`;
            return diffDays <= 0 ? `【次回 ${nextStr}】` : `【次回 ${nextStr}（あと${diffDays}日）】`;
        }
        nextDate = getNextUpdateDateForTask(taskId, effectiveNow);
        const diffDays = Math.ceil((nextDate - effectiveNow) / (1000 * 60 * 60 * 24));
        const nextStr = `${nextDate.getMonth()+1}/${nextDate.getDate()}`;
        return diffDays <= 0 ? `【次回 ${nextStr}】` : `【次回 ${nextStr}（あと${diffDays}日）】`;
    }

    // ===== パニガルム =====
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
        function fmt(d) { return `${d.getMonth()+1}/${d.getDate()}`; }
        return { name: `現世庫パニガルム`, detail: `${PANI_BOSSES[bossIdx]} ${fmt(startDate)}〜${fmt(endDate)}` };
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
        function fmt(d) { return `${d.getMonth()+1}/${d.getDate()}`; }
        if (isOpen) {
            const bossIdx = getKonmeikuCycleIndex(target);
            const period = day <= 5
                ? `${fmt(new Date(year, month, 1))}〜${fmt(new Date(year, month, 5))}`
                : `${fmt(new Date(year, month, 15))}〜${fmt(new Date(year, month, 20))}`;
            return { name: `昏冥庫パニガルム`, detail: `${KONMEIKU_BOSSES[bossIdx]} ${period}` };
        } else {
            let nextStart, nextEnd;
            if (day < 15) { nextStart = new Date(year, month, 15); nextEnd = new Date(year, month, 20); }
            else { nextStart = new Date(year, month + 1, 1); nextEnd = new Date(year, month + 1, 5); }
            return { name: `昏冥庫パニガルム`, detail: `未開催（次回 ${fmt(nextStart)}〜${fmt(nextEnd)}）` };
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

    // ===== チェックボックス =====
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
        localStorage.setItem(key, JSON.stringify({ checked, lastDate: getDateKey(todayDate) }));
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

    // ===== イベント =====
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
        const fmtDT = (d) => {
            const h = d.getHours(), m = d.getMinutes();
            const base = `${d.getMonth()+1}/${d.getDate()}`;
            if (h === 0 && m === 0) return base;
            return `${base} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };
        return `${fmtDT(start)}〜${fmtDT(end)}`;
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
            if (typeof event.id === 'undefined' || typeof event.name !== 'string') return false;
        }
        return true;
    }

    // ===== 詳細テーブル =====
    async function renderDetailTable() {
        const today = getJSTNow();
        const detailContainer = document.getElementById('detailTableContainer');
        if (!detailContainer) return;
        let html = '<div style="margin-top: 20px; overflow-x: auto;"><table class="detail-table" style="width: 100%; border-collapse: collapse; font-size: 0.7rem;">';
        html += '<thead><tr style="background: #e6edf4;"><th style="padding: 6px; text-align: left;">名称</th><th style="padding: 6px; text-align: left;">詳細</th></tr></thead><tbody>';
        html += '<tr class="detail-section-row"><td colspan="2" style="padding: 6px 8px; background: #e9edf2; font-weight: bold; text-align: left;">▼ パニガルム</td></tr>';
        const paniDetail = getPaniDetail(today);
        html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(paniDetail.name)}</td><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(paniDetail.detail)}</td></tr>`;
        const konmeikuDetail = getKonmeikuDetail(today);
        html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(konmeikuDetail.name)}</td><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(konmeikuDetail.detail)}</td></tr>`;
        let events = [];
        try {
            const res = await fetch(EVENTS_URL, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (validateEventData(data)) events = data.events.filter(e => isEventActive(e, today));
            }
        } catch(e) {}
        if (events.length) {
            html += '<tr class="detail-section-row"><td colspan="2" style="padding: 6px 8px; background: #e9edf2; font-weight: bold; text-align: left;">▼ イベント</td></tr>';
            for (const event of events) {
                html += `<tr><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(event.name)}</td><td style="padding: 5px 8px; border-bottom: 1px solid #e2edf2;">${escapeHtml(getEventPeriodStr(event))}</td></tr>`;
            }
        }
        html += '</tbody></table></div>';
        detailContainer.innerHTML = html;
    }

    // ===== 編集モード切替 =====
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

    // ===== 行高さ同期 =====
    // 左テーブル(固定)と右テーブル(スクロール)の行高さを揃える
    function syncRowHeights() {
        const leftRows  = document.querySelectorAll('#leftTable tbody tr, #leftTable thead tr');
        const rightRows = document.querySelectorAll('#rightTable tbody tr, #rightTable thead tr');
        if (leftRows.length !== rightRows.length) return;

        // まずリセット
        leftRows.forEach(r => r.style.height = '');
        rightRows.forEach(r => r.style.height = '');

        for (let i = 0; i < leftRows.length; i++) {
            const h = Math.max(leftRows[i].getBoundingClientRect().height,
                               rightRows[i].getBoundingClientRect().height);
            leftRows[i].style.height  = h + 'px';
            rightRows[i].style.height = h + 'px';
        }
    }

    // ===== イベント行の構築（左右分離版） =====
    async function renderEventRows(leftTbody, rightTbody, targetDate) {
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

        function buildEventSection(eventList, sectionLabel) {
            // 左：セクション行
            const lSecRow = document.createElement('tr');
            lSecRow.className = 'section-row';
            const lSecTd = document.createElement('td');
            lSecTd.innerHTML = `<div style="display:flex;align-items:baseline;">${sectionLabel}</div>`;
            lSecRow.appendChild(lSecTd);
            leftTbody.appendChild(lSecRow);

            // 右：セクション行（キャラ分の幅を持つ空セル）
            const rSecRow = document.createElement('tr');
            rSecRow.className = 'section-row';
            const rSecTd = document.createElement('td');
            rSecTd.colSpan = Math.max(characters.length, 1);
            rSecTd.style.padding = '4px 8px';
            rSecRow.appendChild(rSecTd);
            rightTbody.appendChild(rSecRow);

            for (const event of eventList) {
                const isHiddenRow = isHidden(`event_${event.id}`);
                if (!isEditMode && isHiddenRow) continue;

                // ── 左行：タスク名 ──
                const lRow = document.createElement('tr');
                if (isHiddenRow && isEditMode) lRow.style.opacity = '0.5';

                const lTd = document.createElement('td');
                lTd.className = 'task-name';
                if (isEditMode) {
                    const hideBtn = document.createElement('button');
                    hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                    Object.assign(hideBtn.style, { width:'28px', height:'28px', borderRadius:'8px', cursor:'pointer', fontSize:'14px',
                        backgroundColor: isHiddenRow ? '#10b981' : '#ef4444', border:'1px solid #cbd5e1', color:'white', marginRight:'4px' });
                    hideBtn.onclick = () => toggleHidden(`event_${event.id}`);
                    lTd.appendChild(hideBtn);
                }
                const nameSpan = document.createElement('span');
                nameSpan.innerText = event.name;
                lTd.appendChild(nameSpan);
                lRow.appendChild(lTd);
                leftTbody.appendChild(lRow);

                // ── 右行：チェックボックス ──
                const rRow = document.createElement('tr');
                if (isHiddenRow && isEditMode) rRow.style.opacity = '0.5';

                for (const ch of characters) {
                    const td = document.createElement('td');
                    td.style.backgroundColor = getColColor(ch.color);
                    const disabled = isDisabled(`event_${event.id}`, ch.id);
                    if (isEditMode) {
                        const editBtn = document.createElement('div');
                        editBtn.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                        editBtn.innerText = disabled ? '🔒' : '🔓';
                        editBtn.onclick = (function(ev, cid) {
                            return function(e) { e.preventDefault(); e.stopPropagation(); toggleDisabled(`event_${ev.id}`, cid); };
                        })(event, ch.id);
                        td.appendChild(editBtn);
                    } else if (!isHiddenRow) {
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        if (disabled) { cb.disabled = true; cb.classList.add('disabled-checkbox'); }
                        else {
                            cb.checked = isLimChecked(event, ch.id, targetDate);
                            cb.addEventListener('change', (function(ev, cid, d) {
                                return function(e) { setLimChecked(ev, cid, e.target.checked, d); };
                            })(event, ch.id, targetDate));
                        }
                        td.appendChild(cb);
                    }
                    rRow.appendChild(td);
                }
                rightTbody.appendChild(rRow);
            }
        }

        if (dailyEvents.length)  buildEventSection(dailyEvents, '▼ イベント（毎日）');
        if (otherEvents.length)  buildEventSection(otherEvents, '▼ イベント（期間中1回）');

        // イベント行追加後に再同期
        requestAnimationFrame(syncRowHeights);
    }

    // ===== メイン描画 =====
    function renderAll() {
        const targetDate   = getJSTNow();
        const effectiveDate = getEffectiveDate(targetDate);

        // 日付表示
        const todayInfo = document.getElementById('todayInfo');
        if (todayInfo) {
            todayInfo.innerHTML = `<div>📆 ${targetDate.getMonth()+1}/${targetDate.getDate()}</div><div>✅ 各6時リセット</div>`;
        }

        // ── 右テーブル：ヘッダー ──
        const rightHeaderRow = document.getElementById('rightHeaderRow');
        if (rightHeaderRow) {
            rightHeaderRow.innerHTML = '';
            for (const ch of characters) {
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
                rightHeaderRow.appendChild(th);
            }
        }

        // ── 左右 tbody クリア ──
        const leftTbody  = document.getElementById('leftBody');
        const rightTbody = document.getElementById('rightBody');
        if (!leftTbody || !rightTbody) return;
        leftTbody.innerHTML  = '';
        rightTbody.innerHTML = '';

        // ── 行を生成 ──
        for (const item of sectionsTemplate) {
            if (item.type === 'section') {
                // セクション行の描画
const isHiddenRow = isHidden(item.taskKey);
if (!isEditMode && isHiddenRow) continue;

// 左：セクション行（ラベルのみ）
const lRow = document.createElement('tr');
lRow.className = 'section-row';
if (isHiddenRow && isEditMode) lRow.style.opacity = '0.5';
const lTd = document.createElement('td');
lTd.style.padding = '4px 8px';

const container = document.createElement('div');
container.style.display = 'flex';
container.style.alignItems = 'baseline';
container.style.gap = '6px';

if (isEditMode && item.taskKey) {
    const hideBtn = document.createElement('button');
    hideBtn.innerText = isHiddenRow ? '✓' : '✗';
    Object.assign(hideBtn.style, {
        width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', backgroundColor: isHiddenRow ? '#10b981' : '#ef4444',
        border: '1px solid #cbd5e1', color: 'white'
    });
    hideBtn.onclick = () => toggleHidden(item.taskKey);
    container.appendChild(hideBtn);
}
const labelSpan = document.createElement('span');
labelSpan.innerText = item.label;
container.appendChild(labelSpan);
lTd.appendChild(container);
lRow.appendChild(lTd);
leftTbody.appendChild(lRow);

// 右：セクション行（次回情報を中央に表示）
const rRow = document.createElement('tr');
rRow.className = 'section-row';
if (isHiddenRow && isEditMode) rRow.style.opacity = '0.5';
const rTd = document.createElement('td');
rTd.colSpan = Math.max(characters.length, 1);
rTd.style.textAlign = 'center';
rTd.style.padding = '4px 8px';

const nextText = getSectionNextText(item.cycleTaskId, targetDate);
if (nextText) {
    const nextSpan = document.createElement('span');
    nextSpan.innerText = nextText;
    nextSpan.style.fontSize = '0.65rem';
    nextSpan.style.opacity = '0.85';
    rTd.appendChild(nextSpan);
}
rRow.appendChild(rTd);
rightTbody.appendChild(rRow);
                continue;
            }

            // タスク行
            const isHiddenRow = isHidden(item.key);
            if (!isEditMode && isHiddenRow) continue;

            // 左：タスク名
            const lRow = document.createElement('tr');
            if (isHiddenRow && isEditMode) lRow.style.opacity = '0.5';
            const lTd = document.createElement('td');
            lTd.className = 'task-name';
            if (isEditMode) {
                const hideBtn = document.createElement('button');
                hideBtn.innerText = isHiddenRow ? '✓' : '✗';
                Object.assign(hideBtn.style, { width:'28px', height:'28px', borderRadius:'8px', cursor:'pointer', fontSize:'14px',
                    backgroundColor: isHiddenRow ? '#10b981' : '#ef4444', border:'1px solid #cbd5e1', color:'white', marginRight:'4px' });
                hideBtn.onclick = () => toggleHidden(item.key);
                lTd.appendChild(hideBtn);
            }
            const nameSpan = document.createElement('span');
            nameSpan.innerText = item.name;
            lTd.appendChild(nameSpan);
            lRow.appendChild(lTd);
            leftTbody.appendChild(lRow);

            // 右：チェックボックス列
            const rRow = document.createElement('tr');
            if (isHiddenRow && isEditMode) rRow.style.opacity = '0.5';

            for (const ch of characters) {
                const td = document.createElement('td');
                td.style.backgroundColor = getColColor(ch.color);
                const disabled = isDisabled(item.key, ch.id);

                if (isEditMode) {
                    td.classList.add('edit-mode-cell');
                    const editBtn = document.createElement('div');
                    editBtn.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                    editBtn.innerText = disabled ? '🔒' : '🔓';
                    editBtn.onclick = (function(k, cid) {
                        return function(e) { e.preventDefault(); e.stopPropagation(); toggleDisabled(k, cid); };
                    })(item.key, ch.id);
                    td.appendChild(editBtn);
                } else if (!isHiddenRow) {
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    if (disabled) { cb.disabled = true; cb.classList.add('disabled-checkbox'); }
                    else {
                        // konmeiku未開催チェック
let isKonmeikuClosed = false;
if (item.taskId === 'konmeiku') {
    const today = getJSTNow();
    const day = getEffectiveDate(today).getDate();
    isKonmeikuClosed = !((day >= 1 && day <= 5) || (day >= 15 && day <= 20));
}

if (isKonmeikuClosed) {
    cb.disabled = true;
    cb.checked = false;
    cb.classList.add('disabled-checkbox');
} else {
    cb.checked = loadCheck(item.key, ch.id, effectiveDate, item.taskId);
    cb.addEventListener('change', (function(k, cid, d) {
        return function(e) { saveCheck(k, cid, e.target.checked, d); };
    })(item.key, ch.id, effectiveDate));
}
                    }
                    td.appendChild(cb);
                }
                rRow.appendChild(td);
            }
            rightTbody.appendChild(rRow);
        }

        // イベント行（非同期）→ 終了後に高さ同期
        renderEventRows(leftTbody, rightTbody, targetDate).then(() => {
            requestAnimationFrame(syncRowHeights);
        });

        // 同期テーブル部分は同期的に高さ合わせ
        requestAnimationFrame(syncRowHeights);

        renderDetailTable();
    }

    // ===== スタイル =====
    const toolStyle = `
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #eef2f7; margin: 0; padding: 8px; color: #1e2f3f; }

.container { max-width: 100%; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.05); padding: 6px 0 20px; }
.toolbar { display: flex; gap: 6px; padding: 6px 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #e2edf2; }
.toolbar input { padding: 5px 8px; font-size: 0.7rem; border: 1px solid #ccc; border-radius: 20px; width: 90px; }
.toolbar input[type="color"] { width: 32px; height: 30px; border-radius: 20px; cursor: pointer; }
.toolbar button { background: #eef2ff; border: none; padding: 5px 12px; border-radius: 30px; font-size: 0.7rem; font-weight: 500; cursor: pointer; }
.add-btn  { background: #0066cc !important; color: white !important; }
.edit-btn { background: #f59e0b !important; color: white !important; }
.edit-mode-active { background: #10b981 !important; color: white !important; }
.today-card { background: #fefce8; border-left: 3px solid #f5a623; margin: 6px 12px; padding: 4px 10px; border-radius: 10px; display: flex; justify-content: space-between; font-size: 0.65rem; flex-wrap: wrap; }

/* ===== 分割テーブルレイアウト ===== */
/*
  #tableWrapper
    #leftPanel   ← 固定（幅: auto / min-width: 100px）
      #leftTable  ← 項目名のみ
    #rightPanel  ← 横スクロール（flex: 1）
      #rightTable ← キャラ列のみ
*/
#tableWrapper {
    display: flex;
    align-items: flex-start;   /* 上揃え */
    width: 100%;
    overflow: hidden;           /* 右パネルのみスクロール */
}
#leftPanel {
    flex-shrink: 0;
    /* 右パネルのスクロールバーが表示されても高さを合わせるため overflow hidden */
    overflow: hidden;
    /* ボーダー右だけ引いて境界を示す */
    border-right: 2px solid #94a8c2;
    background: inherit;
    /* z-index で右テーブルより前面 */
    position: relative;
    z-index: 5;
}
#rightPanel {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;         /* 縦スクロールは外側で */
}

/* 共通テーブル */
#leftTable, #rightTable {
    border-collapse: collapse;
    font-size: 0.7rem;
    /* 行高さを JS で揃えるので table-layout は固定しない */
}
#leftTable  { width: 100%; }
#rightTable { width: max-content; min-width: 100%; }

th, td {
    border-bottom: 1px solid #e2edf2;
    padding: 5px 3px;
    text-align: center;
    vertical-align: middle;
    /* 行高さは JS で height プロパティを直接セットする */
    white-space: nowrap;
}
th { background: #e6edf4; font-weight: 600; font-size: 0.7rem; }

/* 左テーブルのヘッダー（「項目」） */
#leftTable thead th {
    background: #e6edf4;
    text-align: left;
    padding-left: 8px;
}
/* 左テーブルのタスク名セル */
#leftTable tbody td {
    background: #fafcff;
    text-align: left;
}

/* セクション行 */
.section-row { background: #b8c7da !important; border-top: 2px solid #94a8c2; border-bottom: 2px solid #94a8c2; }
.section-row td { color: #1e3a5f !important; font-weight: bold; letter-spacing: 0.5px; }
#leftTable .section-row td  { background: #b8c7da !important; }
#rightTable .section-row td { background: #b8c7da !important; }

.detail-section-row td { background: #e9edf2; font-weight: bold; }
.task-name { font-weight: 600; text-align: left !important; padding-left: 6px !important; white-space: nowrap; font-size: 0.7rem; }
.char-header { min-width: 70px; }
.char-header-content { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.char-name { display: inline-block; padding: 2px 4px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 0.75rem; white-space: nowrap; }
.char-controls { display: flex; gap: 4px; justify-content: center; align-items: center; }
.char-color-input { width: 18px; height: 18px; border: 1px solid #ccc; border-radius: 50%; cursor: pointer; }
.char-delete { background: none; border: none; font-size: 0.75rem; cursor: pointer; color: #a00; font-weight: bold; padding: 0 2px; }

input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #2c7da0; margin: 0; }
input[type="checkbox"].disabled-checkbox { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

.edit-mode-cell { background-color: #fff3e0 !important; }
.edit-button { width: 28px; height: 28px; margin: 0 auto; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; background-color: #e2e8f0; border: 1px solid #cbd5e1; }
.edit-button-enabled  { background-color: #e2e8f0; border: 1px solid #cbd5e1; }
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

/* ===== ダークモード ===== */
body.dark-mode { background: #0f172a; color: #e5e7eb; }
body.dark-mode .container { background: #111827; }
body.dark-mode .toolbar { border-bottom-color: #2a3441; }
body.dark-mode .toolbar input { background: #374151; border-color: #4b5563; color: #e5e7eb; }
body.dark-mode .toolbar button { background: #374151; color: #e5e7eb; }
body.dark-mode .add-btn  { background: #3399ff !important; }
body.dark-mode .edit-btn { background: #f59e0b !important; }
body.dark-mode .edit-mode-active { background: #10b981 !important; }
body.dark-mode .today-card { background: #1f2937; border-left-color: #f59e0b; }
body.dark-mode th { background: #1f2937; color: #fff; border-bottom-color: #374151; }
body.dark-mode td { color: #fff; border-bottom-color: #2a3441; }
body.dark-mode #leftTable thead th  { background: #1f2937; }
body.dark-mode #leftTable tbody td  { background: #111827; }
body.dark-mode #leftPanel { border-right-color: #475569; }
body.dark-mode .section-row { background: #334155 !important; border-top-color: #475569; border-bottom-color: #475569; }
body.dark-mode .section-row td { color: #ffffff !important; }
body.dark-mode #leftTable  .section-row td { background: #334155 !important; }
body.dark-mode #rightTable .section-row td { background: #334155 !important; }
body.dark-mode .detail-section-row td { background: #334155; }
/* 詳細テーブルのtdを強制的にダークモード色に */
body.dark-mode .detail-table td {
    background-color: #111827 !important;
    color: #e5e7eb !important;
    border-bottom-color: #374151 !important;
}

/* ヘッダー行も合わせて */
body.dark-mode .detail-table th {
    background-color: #1f2937 !important;
    color: #e5e7eb !important;
}
body.dark-mode .char-name   { color: #fff; }
body.dark-mode .char-delete { color: #f88; }
body.dark-mode .edit-mode-cell { background-color: #2a2a2a !important; }
body.dark-mode .edit-button-enabled  { background-color: #374151; border-color: #4b5563; color: #fff; }
body.dark-mode .edit-button-disabled { background-color: #f59e0b; border-color: #d97706; }
</style>
`;
// ========== 呪文書き出し/読み込み機能 ==========
(function() {
    // 変換マップ（ブログ版21タスク → 新規版23タスク）
    const BLOG_TO_NEW_MAP = {
        0: [0], 1: [1], 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 11,
        10: 12, 11: 13, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19, 17: 20, 18: 21, 19: 22, 20: 23
    };

    function getTasksFromTemplate() {
        return window.sectionsTemplate || [];
    }

    // キャラデータとチェックを取得（新規版用）
    function getCurrentCheckBits() {
        if (typeof characters === 'undefined') return null;
        const targetDate = getJSTNow();
        const effectiveDate = getEffectiveDate(targetDate);
        const tasks = getTasksFromTemplate().filter(item => !item.type);
        
        const charDataList = [];
        for (let ch of characters) {
            const firstChar = ch.name.charAt(0);
            const colorCode = ch.color.slice(1);
            let bits = "";
            for (let item of tasks) {
                const isChecked = loadCheck(item.key, ch.id, effectiveDate, item.taskId);
                bits += isChecked ? "1" : "0";
            }
            const bytes = [];
            for (let i = 0; i < bits.length; i += 8) {
                const byteStr = bits.slice(i, i + 8).padEnd(8, '0');
                bytes.push(parseInt(byteStr, 2));
            }
            let checksBase64 = '';
            if (bytes.length > 0) {
                checksBase64 = btoa(String.fromCharCode(...bytes));
                checksBase64 = checksBase64.replace(/\//g, '-').replace(/\+/g, '_');
            }
            charDataList.push(firstChar + colorCode + checksBase64);
        }
        return charDataList;
    }

    function exportSpell() {
        if (typeof characters === 'undefined' || characters.length === 0) {
            alert('キャラクターが登録されていません');
            return;
        }
        const charDataList = getCurrentCheckBits();
        if (!charDataList) return;
        const spell = 'XN' + charDataList.join('');
        navigator.clipboard.writeText(spell).then(() => {
            alert(`✓ 復活の呪文をコピーしました！\n${spell.length}文字`);
        }).catch(() => alert('コピー失敗'));
    }

    function importBlogFormat(spellWithoutMarker) {
        let remaining = spellWithoutMarker;
        const newCharacters = [];
        const newChecksList = [];
        
        while (remaining.length > 0 && newCharacters.length < 10) {
            if (remaining.length < 7) break;
            const firstChar = remaining.charAt(0);
            const colorCode = remaining.slice(1, 7);
            remaining = remaining.slice(7);
            
            let checksBase64 = '';
            let foundNext = false;
            for (let i = 0; i < remaining.length; i++) {
                const c = remaining.charAt(i);
                if (i + 6 < remaining.length && /[A-Za-z0-9]/.test(c)) {
                    if (/^[0-9a-f]{6}$/i.test(remaining.slice(i + 1, i + 7))) {
                        foundNext = true;
                        checksBase64 = remaining.slice(0, i);
                        remaining = remaining.slice(i);
                        break;
                    }
                }
            }
            if (!foundNext) {
                checksBase64 = remaining;
                remaining = '';
            }
            
            checksBase64 = checksBase64.replace(/-/g, '/').replace(/_/g, '+');
            let bits = '';
            try {
                const bytes = Uint8Array.from(atob(checksBase64), c => c.charCodeAt(0));
                for (let b of bytes) bits += b.toString(2).padStart(8, '0');
            } catch(e) { bits = ''; }
            
            newCharacters.push({ name: firstChar, color: '#' + colorCode });
            newChecksList.push(bits);
        }
        
        if (newCharacters.length === 0) {
            alert('キャラ情報が読み取れませんでした');
            return false;
        }
        
        // 変換（21→23）
        const convertedChecks = newChecksList.map(blogBits => {
            const newBits = new Array(23).fill('0');
            for (let i = 0; i < Math.min(blogBits.length, 21); i++) {
                const target = BLOG_TO_NEW_MAP[i];
                if (target !== undefined && blogBits[i] === '1') {
                    if (Array.isArray(target)) newBits[target[0]] = '1';
                    else newBits[target] = '1';
                }
            }
            return newBits.join('');
        });
        
        // 保存
        window.characters = [];
        let newId = 1;
        for (let i = 0; i < newCharacters.length; i++) {
            window.characters.push({ id: newId++, name: newCharacters[i].name, color: newCharacters[i].color });
        }
        saveCharacters();
        
        const tasks = getTasksFromTemplate().filter(item => !item.type);
        const effectiveDate = getEffectiveDate(getJSTNow());
        for (let c = 0; c < window.characters.length; c++) {
            const bits = convertedChecks[c];
            if (!bits) continue;
            for (let t = 0; t < tasks.length && t < bits.length; t++) {
                if (bits[t] === '1') {
                    saveCheck(tasks[t].key, window.characters[c].id, true, effectiveDate);
                }
            }
        }
        
        if (typeof disabledMap !== 'undefined') {
            disabledMap.clear();
            saveDisabled();
        }
        
        if (typeof renderAll === 'function') renderAll();
        alert(`✓ ブログ版から復元！（${window.characters.length}キャラ）`);
        return true;
    }

    function importNewFormat(spellWithoutMarker) {
        let remaining = spellWithoutMarker;
        const newCharacters = [];
        const newChecksList = [];
        
        while (remaining.length > 0 && newCharacters.length < 10) {
            if (remaining.length < 7) break;
            const firstChar = remaining.charAt(0);
            const colorCode = remaining.slice(1, 7);
            remaining = remaining.slice(7);
            
            let checksBase64 = '';
            let foundNext = false;
            for (let i = 0; i < remaining.length; i++) {
                const c = remaining.charAt(i);
                if (i + 6 < remaining.length && /[A-Za-z0-9]/.test(c)) {
                    if (/^[0-9a-f]{6}$/i.test(remaining.slice(i + 1, i + 7))) {
                        foundNext = true;
                        checksBase64 = remaining.slice(0, i);
                        remaining = remaining.slice(i);
                        break;
                    }
                }
            }
            if (!foundNext) {
                checksBase64 = remaining;
                remaining = '';
            }
            
            checksBase64 = checksBase64.replace(/-/g, '/').replace(/_/g, '+');
            let bits = '';
            try {
                const bytes = Uint8Array.from(atob(checksBase64), c => c.charCodeAt(0));
                for (let b of bytes) bits += b.toString(2).padStart(8, '0');
            } catch(e) { bits = ''; }
            
            newCharacters.push({ name: firstChar, color: '#' + colorCode });
            newChecksList.push(bits);
        }
        
        if (newCharacters.length === 0) {
            alert('キャラ情報が読み取れませんでした');
            return false;
        }
        
        window.characters = [];
        let newId = 1;
        for (let i = 0; i < newCharacters.length; i++) {
            window.characters.push({ id: newId++, name: newCharacters[i].name, color: newCharacters[i].color });
        }
        saveCharacters();
        
        const tasks = getTasksFromTemplate().filter(item => !item.type);
        const effectiveDate = getEffectiveDate(getJSTNow());
        for (let c = 0; c < window.characters.length; c++) {
            const bits = newChecksList[c];
            if (!bits) continue;
            for (let t = 0; t < tasks.length && t < bits.length; t++) {
                if (bits[t] === '1') {
                    saveCheck(tasks[t].key, window.characters[c].id, true, effectiveDate);
                }
            }
        }
        
        if (typeof disabledMap !== 'undefined') {
            disabledMap.clear();
            saveDisabled();
        }
        
        if (typeof renderAll === 'function') renderAll();
        alert(`✓ 新規版の呪文から復元！（${window.characters.length}キャラ）`);
        return true;
    }

    function promptImportSpell() {
        const spell = prompt('復活の呪文を入力してください', '');
        if (!spell) return;
        if (spell.startsWith('XB')) importBlogFormat(spell.slice(2));
        else if (spell.startsWith('XN')) importNewFormat(spell.slice(2));
        else if (spell.startsWith('X')) importBlogFormat(spell.slice(1));
        else alert('無効な呪文です（先頭が XB, XN, X である必要があります）');
    }

    function addSpellButtons() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;
        if (document.getElementById('exportSpellBtn')) return;
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportSpellBtn';
        exportBtn.innerText = '📋 書き出し';
        exportBtn.style.cssText = 'background:#10b981 !important; color:white !important;';
        exportBtn.addEventListener('click', exportSpell);
        
        const importBtn = document.createElement('button');
        importBtn.id = 'importSpellBtn';
        importBtn.innerText = '🔮 呪文読み込み';
        importBtn.style.cssText = 'background:#8b5cf6 !important; color:white !important;';
        importBtn.addEventListener('click', promptImportSpell);
        
        toolbar.appendChild(exportBtn);
        toolbar.appendChild(importBtn);
    }
    
    // 既存のrenderAllをフック
    const originalRenderAll = typeof renderAll !== 'undefined' ? renderAll : null;
    if (typeof window !== 'undefined') {
        // 少し遅らせて実行（DOMができてから）
        setTimeout(function waitForToolbar() {
            if (document.getElementById('toolbar')) {
                addSpellButtons();
            } else {
                setTimeout(waitForToolbar, 500);
            }
        }, 1000);
    }
})();
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

  <!-- 分割テーブル本体 -->
  <div id="tableWrapper">

    <!-- 左パネル：項目名固定列 -->
    <div id="leftPanel">
      <table id="leftTable">
        <thead>
          <tr><th>項目</th></tr>
        </thead>
        <tbody id="leftBody"></tbody>
      </table>
    </div>

    <!-- 右パネル：キャラ列（横スクロール） -->
    <div id="rightPanel">
      <table id="rightTable">
        <thead>
          <tr id="rightHeaderRow"></tr>
        </thead>
        <tbody id="rightBody"></tbody>
      </table>
    </div>

  </div><!-- /#tableWrapper -->

  <div id="detailTableContainer"></div>
</div>
`;

            loadCharacters();
            loadDisabled();
            loadHidden();

            document.getElementById('addCharBtn').addEventListener('click', addCharacter);
            document.getElementById('editModeBtn').addEventListener('click', toggleEditMode);

            // ウィンドウリサイズ時にも高さ同期
            window.addEventListener('resize', syncRowHeights);

            renderAll();

            if (currentObserver) currentObserver.disconnect();
            currentObserver = new MutationObserver(() => {
                if (typeof renderAll === 'function') renderAll();
            });
            currentObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        },

        destroy: function() {
            if (currentObserver) { currentObserver.disconnect(); currentObserver = null; }
            window.removeEventListener('resize', syncRowHeights);
            const addBtn  = document.getElementById('addCharBtn');
            const editBtn = document.getElementById('editModeBtn');
            if (addBtn)  addBtn.replaceWith(addBtn.cloneNode(true));
            if (editBtn) editBtn.replaceWith(editBtn.cloneNode(true));
        }
    };
})(window);
