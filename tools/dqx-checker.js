// ========== DQX日課チェッカー（GitHub収録版） ==========
(function(global) {
    // ===== ストレージキー（現状維持） =====
    const STORAGE_CHARS = 'dqx_chars_final9';
    const STORAGE_CHECK_PREFIX = 'dqx_check_final9_';
    const STORAGE_DISABLED = 'dqx_disabled_final9';
    const STORAGE_CHECKS = 'dqx_limited_checks_v2';
    const EVENTS_URL = 'https://raw.githubusercontent.com/yuffy-1111/dqx-event-data/main/Checker.json';
    const RESET_HOUR = 6;

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

    function getSectionHighlightColor() {
        const redHex = '#dc2626';
        return isDarkMode() ? blendColor(redHex, 0.25, [17, 24, 39]) : blendColor(redHex, 0.15, [255, 255, 255]);
    }

    function getEventSectionHighlightColor() {
        const redHex = '#dc2626';
        return isDarkMode() ? blendColor(redHex, 0.25, [17, 24, 39]) : blendColor(redHex, 0.15, [255, 255, 255]);
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

    // ===== パニガルム・昏冥庫関連 =====
    const PANI_BOSSES = ['ﾌｫﾙﾀﾞｲﾅ','ﾀﾞｲﾀﾞﾙﾓｽ','ﾊﾟﾆｶﾞｷｬｯﾁｬｰ','ﾌﾙﾎﾟﾃｨ','ﾌﾟﾙﾀﾇｽ','ｴﾙｷﾞｵｽ','ｱﾙﾏﾅ','ｼﾞｹﾞﾝﾘｭｳ'];
    const PANI_BASE = new Date(2026, 3, 12, 6, 0, 0);
    
    function getPaniStatus(targetDate) {
        const target = getEffectiveDate(targetDate);
        const hours = (target - PANI_BASE) / (1000 * 60 * 60);
        let cycle = Math.floor(hours / 72);
        if (hours < 0) cycle = -1;
        const bossIdx = ((cycle % 8) + 8) % 8;
        const startDate = new Date(PANI_BASE.getTime() + cycle * 72 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + 72 * 60 * 60 * 1000);
        const isUpdate = isSameDay(startDate, target);
        function formatDate(d) { return (d.getMonth()+1) + '/' + d.getDate(); }
        return { statusStr: PANI_BOSSES[bossIdx] + ' ' + formatDate(startDate) + '〜' + formatDate(endDate), isAlert: isUpdate };
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
    
    function getKonmeikuStatus(targetDate) {
        const target = getEffectiveDate(targetDate);
        const day = target.getDate();
        const year = target.getFullYear();
        const month = target.getMonth();
        const isOpen = (day >= 1 && day <= 5) || (day >= 15 && day <= 20);
        function formatDate(d) { return (d.getMonth()+1) + '/' + d.getDate(); }
        if (isOpen) {
            const bossIdx = getKonmeikuCycleIndex(target);
            let statusStr = '';
            if (day <= 5) statusStr = '🌑' + KONMEIKU_BOSSES[bossIdx] + ' ' + formatDate(new Date(year, month, 1)) + '〜5日';
            else statusStr = '🌑' + KONMEIKU_BOSSES[bossIdx] + ' ' + formatDate(new Date(year, month, 15)) + '〜20日';
            return { statusStr: statusStr, isAlert: true, closedClass: false, isOpen: true };
        } else {
            let nextStart, nextEnd;
            if (day < 15) { nextStart = new Date(year, month, 15); nextEnd = new Date(year, month, 20); }
            else { nextStart = new Date(year, month + 1, 1); nextEnd = new Date(year, month + 1, 5); }
            return { statusStr: '未開催（次回 ' + formatDate(nextStart) + '〜' + formatDate(nextEnd) + '）', isAlert: false, closedClass: true, isOpen: false };
        }
    }

    function computeContentStatus(targetDate, taskId, taskName) {
        const effectiveNow = getEffectiveDate(targetDate);
        function formatDate(d) { return (d.getMonth()+1) + '/' + d.getDate(); }
        if (taskId === 'daily') return { statusStr: "毎日リセット", isAlert: false };
        if (taskId === 'pani') return getPaniStatus(targetDate);
        if (taskId === 'konmeiku') return getKonmeikuStatus(targetDate);
        const lastUpdate = getLastUpdateDateForTask(taskId, effectiveNow);
        const nextUpdate = getNextUpdateDateForTask(taskId, effectiveNow);
        const statusStr = formatDate(lastUpdate) + '更新 / 次回 ' + formatDate(nextUpdate);
        const isAlert = isSameDay(lastUpdate, effectiveNow);
        return { statusStr, isAlert };
    }

    function getUpdateNoticeList(targetDate) {
        const effectiveNow = getEffectiveDate(targetDate);
        const list = [];
        function isSameDayForList(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
        if (isSameDayForList(getLastUpdateDateForTask('weekly', effectiveNow), effectiveNow)) list.push('週課');
        if (isSameDayForList(getLastUpdateDateForTask('roster', effectiveNow), effectiveNow)) list.push('ロスター');
        if (isSameDayForList(getLastUpdateDateForTask('tasogare', effectiveNow), effectiveNow)) list.push('黄昏の奏戦記');
        if (isSameDayForList(getLastUpdateDateForTask('jashin', effectiveNow), effectiveNow)) list.push('邪神の宮殿');
        if (getPaniStatus(targetDate).isAlert) list.push('パニガルム');
        const konmeikuStatus = getKonmeikuStatus(targetDate);
        if (konmeikuStatus.isAlert) {
            const day = getEffectiveDate(targetDate).getDate();
            const isFirstDay = (day === 1 || day === 15);
            if (isFirstDay) list.push('昏冥庫');
        }
        if (isSameDayForList(getLastUpdateDateForTask('monthly', effectiveNow), effectiveNow)) list.push('異界の闘技場');
        if (isSameDayForList(getLastUpdateDateForTask('sekkai', effectiveNow), effectiveNow)) list.push('覚醒の秘石');
        if (isSameDayForList(getLastUpdateDateForTask('monthly', effectiveNow), effectiveNow)) list.push('宝珠P(ふくびき)');
        return list;
    }

    // ===== テーブル定義 =====
    const sectionsTemplate = [
        { type: "section", label: "▼ 日課", sectionId: "daily-section" },
        { name: "日替わり討伐", taskId: "daily" },
        { name: "咎人デイリー", taskId: "daily" },
        { type: "section", label: "▼ 週課", sectionId: "weekly-section" },
        { name: "週替わり討伐", taskId: "weekly" },
        { name: "エピソード依頼帳", taskId: "weekly" },
        { name: "トレーニー育成帳", taskId: "weekly" },
        { name: "達人クエスト", taskId: "weekly" },
        { name: "王家の迷宮", taskId: "weekly" },
        { name: "ピラミッド", taskId: "weekly" },
        { name: "万魔の塔", taskId: "weekly" },
        { name: "アスタルジア探索", taskId: "weekly" },
        { name: "皇帝の創りしもの", taskId: "weekly" },
        { name: "ヴァリーブートキャンプ", taskId: "weekly" },
        { type: "section", label: "▼ 隔週", sectionId: "biweekly-section" },
        { name: "ロスター", taskId: "roster" },
        { name: "黄昏の奏戦記", taskId: "tasogare" },
        { name: "レモンスライムクイズ", taskId: "lemon" },
        { type: "section", label: "▼ 邪神の宮殿", sectionId: "jashin-section" },
        { name: "邪神の宮殿", taskId: "jashin" },
        { type: "section", label: "▼ 周期", sectionId: "period-section" },
        { name: "パニガルム", taskId: "pani" },
        { type: "section", label: "▼ 期間限定", sectionId: "limited-section" },
        { name: "昏冥庫", taskId: "konmeiku" },
        { type: "section", label: "▼ 月1回", sectionId: "monthly-section" },
        { name: "異界の闘技場", taskId: "monthly" },
        { type: "section", label: "▼ 受け取り", sectionId: "receive-section" },
        { name: "覚醒の秘石", taskId: "sekkai" },
        { name: "宝珠P(ふくびき)", taskId: "monthly" }
    ];

    function getTaskCount() { return sectionsTemplate.filter(item => !item.type).length; }

    // ===== キャラクター管理 =====
    let characters = [];
    let nextId = 1;
    let disabledMap = new Map();
    let isEditMode = false;

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
    function isDisabled(rowIdx, charId) { return disabledMap.has(`${rowIdx}_${charId}`); }
    function setDisabled(rowIdx, charId, disabled) {
        const key = `${rowIdx}_${charId}`;
        if (disabled) disabledMap.set(key, true);
        else disabledMap.delete(key);
        saveDisabled();
    }
    function toggleDisabled(rowIdx, charId) { setDisabled(rowIdx, charId, !isDisabled(rowIdx, charId)); renderAll(); }

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
        for (let i = 0; i < getTaskCount(); i++) setDisabled(i, charId, false);
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

    function saveCheck(rowIdx, charId, checked, todayDate) {
        const key = STORAGE_CHECK_PREFIX + rowIdx + '_' + charId;
        const data = { checked: checked, lastDate: getDateKey(todayDate) };
        localStorage.setItem(key, JSON.stringify(data));
    }

    function loadCheck(rowIdx, charId, todayDate, taskId) {
        const key = STORAGE_CHECK_PREFIX + rowIdx + '_' + charId;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            if (!data.checked) return false;
            const lastDate = parseDateKey(data.lastDate);
            if (shouldReset(lastDate, todayDate, taskId)) {
                saveCheck(rowIdx, charId, false, todayDate);
                return false;
            }
            if (!isSameDay(lastDate, todayDate)) {
                saveCheck(rowIdx, charId, true, todayDate);
            }
            return true;
        } catch(e) { return false; }
    }

    // ===== セクション強調判定 =====
    function isWeeklySectionHighlight(today) {
        const effectiveNow = getEffectiveDate(today);
        return isSameDay(getLastUpdateDateForTask('weekly', effectiveNow), effectiveNow);
    }
    function isBiweeklySectionHighlight(today) {
        const effectiveNow = getEffectiveDate(today);
        return isSameDay(getLastUpdateDateForTask('roster', effectiveNow), effectiveNow) ||
               isSameDay(getLastUpdateDateForTask('tasogare', effectiveNow), effectiveNow) ||
               isSameDay(getLastUpdateDateForTask('lemon', effectiveNow), effectiveNow);
    }
    function isJashinSectionHighlight(today) {
        const effectiveNow = getEffectiveDate(today);
        return isSameDay(getLastUpdateDateForTask('jashin', effectiveNow), effectiveNow);
    }
    function isPeriodSectionHighlight(today) { return getPaniStatus(today).isAlert; }
    function isLimitedSectionHighlight(today) { return getKonmeikuStatus(today).isOpen; }
    function isMonthlySectionHighlight(today) {
        const effectiveNow = getEffectiveDate(today);
        return isSameDay(getLastUpdateDateForTask('monthly', effectiveNow), effectiveNow);
    }
    function isReceiveSectionHighlight(today) {
        const effectiveNow = getEffectiveDate(today);
        return isSameDay(getLastUpdateDateForTask('sekkai', effectiveNow), effectiveNow) ||
               isSameDay(getLastUpdateDateForTask('monthly', effectiveNow), effectiveNow);
    }

    // ===== イベントセクション関連関数 =====
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
        const fmt = (d) => {
            const h = d.getHours(), m = d.getMinutes();
            const base = `${d.getMonth()+1}/${d.getDate()}`;
            return (h === 0 && m === 0 && !event.startDateTime && !event.endDateTime) ? base : `${base} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };
        return `${fmt(start)}〜${fmt(end)}`;
    }

    function getResetLabel(event) {
        switch(event.resetType) {
            case 'daily': return '毎日リセット(6時)';
            case 'weekly': return '毎週リセット(6時)';
            default: return '期間中1回';
        }
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

    function cleanupOldEventChecks(currentEvents) {
        const activeEventIds = new Set(currentEvents.map(e => String(e.id)));
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_CHECKS)) {
                const match = key.match(/dqx_limited_checks_v2_(\d+)_/);
                if (match && !activeEventIds.has(match[1])) {
                    localStorage.removeItem(key);
                }
            }
        }
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

    function shouldHighlightEventSection(events, today) {
        return events.some(event => {
            if (!isEventActive(event, today)) return false;
            if (event.resetType === 'daily') return true;
            const start = parseToJST(event.startDateTime || event.startDate);
            if (start && isSameDay(start, today)) return true;
            return false;
        });
    }

    async function appendLimitedRows() {
        const today = getJSTNow();
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        // 既存のイベントセクションを削除
        const existingSections = tbody.querySelectorAll('tr.section-row');
        for (let i = 0; i < existingSections.length; i++) {
            const row = existingSections[i];
            if (row.innerText.includes('イベント')) {
                let nextRow = row.nextSibling;
                tbody.removeChild(row);
                while (nextRow && nextRow.tagName === 'TR' && !nextRow.classList.contains('section-row')) {
                    const toRemove = nextRow;
                    nextRow = nextRow.nextSibling;
                    tbody.removeChild(toRemove);
                }
                break;
            }
        }

        let events = [];
        try {
            const res = await fetch(EVENTS_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!validateEventData(data)) {
                console.warn('イベントJSONの形式が不正です');
                return;
            }
            events = data.events.filter(e => isEventActive(e, today));
            cleanupOldEventChecks(events);
        } catch(e) {
            console.error('イベント取得失敗:', e);
            return;
        }

        if (!events.length) return;

        const highlightEventSection = shouldHighlightEventSection(events, today);
        const secRow = document.createElement('tr');
        secRow.className = 'section-row';
        if (highlightEventSection) {
            secRow.classList.add('section-highlight');
            secRow.style.backgroundColor = getEventSectionHighlightColor();
        }
        const secTd = document.createElement('td');
        secTd.colSpan = 2 + characters.length;
        secTd.style.textAlign = 'center';
        secTd.style.padding = '3px';
        secTd.innerText = '▼ イベント';
        secRow.appendChild(secTd);
        tbody.appendChild(secRow);

        for (const event of events) {
            const row = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.className = 'task-name';
            tdName.innerText = event.name;
            row.appendChild(tdName);

            const tdStatus = document.createElement('td');
            tdStatus.className = 'status-cell';
            const periodStr = getEventPeriodStr(event);
            const resetLabel = getResetLabel(event);
            const startDate = parseToJST(event.startDateTime || event.startDate);
            const isStartDay = startDate && isSameDay(startDate, today);
            const isDailyReset = (event.resetType === 'daily');
            const showAlert = isDailyReset || isStartDay;
            tdStatus.innerHTML = `<span class="status-chip">${escapeHtml(periodStr)}<br>${escapeHtml(resetLabel)}</span>${showAlert ? '<span class="alert-badge">!</span>' : ''}`;
            row.appendChild(tdStatus);

            for (const ch of characters) {
                const td = document.createElement('td');
                const colBg = getColColor(ch.color);
                td.style.backgroundColor = colBg;
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = isLimChecked(event, ch.id, today);
                cb.addEventListener('change', (function(ev, cid) {
                    return function(e) { setLimChecked(ev, cid, e.target.checked, getJSTNow()); };
                })(event, ch.id));
                td.appendChild(cb);
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }
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

    function renderAll() {
        const targetDate = getJSTNow();
        const effectiveDate = getEffectiveDate(targetDate);
        const displayDate = targetDate;
        
        const todayInfo = document.getElementById('todayInfo');
        if (todayInfo) {
            todayInfo.innerHTML = '<div>📆 ' + (displayDate.getMonth()+1) + '/' + displayDate.getDate() + '</div><div>✅ 各6時リセット</div>';
        }

        const updateList = getUpdateNoticeList(effectiveDate);
        const noticeDiv = document.getElementById('updateNotice');
        if (noticeDiv) {
            if (updateList.length) {
                noticeDiv.style.display = 'block';
                noticeDiv.innerHTML = '✅ 今日は ' + updateList.join('・') + ' の更新日です！';
            } else {
                noticeDiv.style.display = 'none';
            }
        }

        const headerRow = document.getElementById('headerRow');
        if (headerRow) {
            while (headerRow.children.length > 2) headerRow.removeChild(headerRow.lastChild);
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
        let rowIdx = 0;

        const sectionHighlightMap = {
            'weekly-section': isWeeklySectionHighlight(targetDate),
            'biweekly-section': isBiweeklySectionHighlight(targetDate),
            'jashin-section': isJashinSectionHighlight(targetDate),
            'period-section': isPeriodSectionHighlight(targetDate),
            'limited-section': isLimitedSectionHighlight(targetDate),
            'monthly-section': isMonthlySectionHighlight(targetDate),
            'receive-section': isReceiveSectionHighlight(targetDate)
        };

        for (let item of sectionsTemplate) {
            if (item.type === 'section') {
                const row = document.createElement('tr');
                row.className = 'section-row';
                if (item.sectionId && sectionHighlightMap[item.sectionId]) {
                    row.classList.add('section-highlight');
                    row.style.backgroundColor = getSectionHighlightColor();
                }
                const td = document.createElement('td');
                td.colSpan = 2 + characters.length;
                td.style.textAlign = 'center';
                td.style.padding = '3px';
                td.innerText = item.label;
                row.appendChild(td);
                tbody.appendChild(row);
                continue;
            }

            const row = document.createElement('tr');
            const { statusStr, isAlert, closedClass, isOpen } = computeContentStatus(targetDate, item.taskId, item.name);
            if (closedClass) row.classList.add('konmeiku-closed');

            const tdName = document.createElement('td');
            tdName.className = 'task-name';
            tdName.innerText = item.name;
            row.appendChild(tdName);

            const tdStatus = document.createElement('td');
            tdStatus.className = 'status-cell';
            tdStatus.innerHTML = `<span class="status-chip">${escapeHtml(statusStr)}</span>${isAlert ? '<span class="alert-badge">!</span>' : ''}`;
            row.appendChild(tdStatus);

            for (let ch of characters) {
                const tdChk = document.createElement('td');
                const colBg = getColColor(ch.color);
                tdChk.style.backgroundColor = colBg;
                
                const disabled = isDisabled(rowIdx, ch.id);
                const isKonmeikuClosed = (item.taskId === 'konmeiku' && isOpen === false);
                
                if (isEditMode) {
                    tdChk.classList.add('edit-mode-cell');
                    const editButton = document.createElement('div');
                    editButton.className = 'edit-button ' + (disabled ? 'edit-button-disabled' : 'edit-button-enabled');
                    editButton.innerText = disabled ? '🔒' : '🔓';
                    editButton.onclick = (function(r, c) {
                        return function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDisabled(r, c);
                            return false;
                        };
                    })(rowIdx, ch.id);
                    tdChk.appendChild(editButton);
                } else {
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    if (disabled || isKonmeikuClosed) {
                        cb.disabled = true;
                        cb.classList.add('disabled-checkbox');
                    } else {
                        const isChecked = loadCheck(rowIdx, ch.id, effectiveDate, item.taskId);
                        cb.checked = isChecked;
                        cb.addEventListener('change', (function(r, cid, d) {
                            return function(e) {
                                saveCheck(r, cid, e.target.checked, d);
                            };
                        })(rowIdx, ch.id, effectiveDate));
                    }
                    tdChk.appendChild(cb);
                }
                row.appendChild(tdChk);
            }
            tbody.appendChild(row);
            rowIdx++;
        }

        appendLimitedRows();
    }

    // ===== 外部公開 =====
    global.DQXDailyChecker = {
        render: function(containerSelector) {
            const container = document.querySelector(containerSelector);
            if (!container) return;
            
            container.innerHTML = `
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #eef2f7; margin: 0; padding: 8px; color: #1e2f3f; }
.container { max-width: 100%; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.05); padding: 6px 0 10px; overflow-x: auto; }
.toolbar { display: flex; gap: 6px; padding: 6px 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #e2edf2; }
.toolbar input { padding: 5px 8px; font-size: 0.7rem; border: 1px solid #ccc; border-radius: 20px; width: 90px; }
.toolbar input[type="color"] { width: 32px; height: 30px; border-radius: 20px; cursor: pointer; }
.toolbar button { background: #eef2ff; border: none; padding: 5px 12px; border-radius: 30px; font-size: 0.7rem; font-weight: 500; cursor: pointer; transition: 0.1s; }
.add-btn { background: #0066cc !important; color: white !important; }
.edit-btn { background: #f59e0b !important; color: white !important; }
.edit-mode-active { background: #10b981 !important; color: white !important; }
.today-card { background: #fefce8; border-left: 3px solid #f5a623; margin: 6px 12px; padding: 4px 10px; border-radius: 10px; display: flex; justify-content: space-between; font-size: 0.65rem; flex-wrap: wrap; }
.update-notice { background: #dbeafe; border-left: 3px solid #2563eb; margin: 6px 12px; padding: 6px 10px; border-radius: 10px; font-size: 0.65rem; color: #1e40af; }
table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
th, td { border-bottom: 1px solid #e2edf2; padding: 5px 3px; text-align: center; vertical-align: middle; }
th { background: #e6edf4; font-weight: 600; font-size: 0.65rem; }
tbody tr td:first-child { position: sticky; left: 0; background-color: #fafcff; z-index: 1; }
thead tr th:first-child { position: sticky; left: 0; background-color: #e6edf4; z-index: 2; }
.task-name { font-weight: 600; text-align: left; padding-left: 6px; white-space: nowrap; font-size: 0.65rem; }
.status-cell { background: #f9fbfd; font-size: 0.62rem; white-space: nowrap; }
.status-chip { background: #eef2ff; padding: 1px 5px; border-radius: 16px; display: inline-block; }
.alert-badge { background: #e53e3e; color: white; padding: 1px 4px; border-radius: 16px; font-size: 0.5rem; margin-left: 3px; }
.konmeiku-closed { background-color: #f0f0f0 !important; }
.konmeiku-closed td { background-color: #f0f0f0 !important; }
.section-row { background: #e9edf2; }
.section-row td { padding: 3px; font-size: 0.55rem; color: #5a6e85; }
.section-row.section-highlight { border-left: 4px solid #dc2626; }
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
@media (max-width: 600px) { .char-name { font-size: 0.65rem; } .toolbar input { width: 70px; } .toolbar button { padding: 5px 8px; font-size: 0.65rem; } .edit-button { width: 24px; height: 24px; font-size: 12px; } }
body.dark-mode { background: #0f172a; color: #e5e7eb; }
body.dark-mode .container { background: #111827; }
body.dark-mode .toolbar { border-bottom-color: #2a3441; }
body.dark-mode .toolbar input { background: #374151; border-color: #4b5563; color: #e5e7eb; }
body.dark-mode .toolbar button { background: #374151; color: #e5e7eb; }
body.dark-mode .add-btn { background: #3399ff !important; }
body.dark-mode .edit-btn { background: #f59e0b !important; }
body.dark-mode .edit-mode-active { background: #10b981 !important; }
body.dark-mode .today-card { background: #1f2937; border-left-color: #f59e0b; }
body.dark-mode .update-notice { background: #1e3a8a; color: #dbeafe; border-left-color: #3b82f6; }
body.dark-mode table { background: #111827; }
body.dark-mode th { background: #1f2937; color: #e5e7eb; border-bottom-color: #374151; }
body.dark-mode td { color: #e5e7eb; border-bottom-color: #2a3441; }
body.dark-mode tbody tr td:first-child { background: #111827 !important; }
body.dark-mode thead tr th:first-child { background: #1f2937 !important; }
body.dark-mode .status-cell { background: #1a2332; }
body.dark-mode .status-chip { background: #374151; }
body.dark-mode .konmeiku-closed td { background-color: #1f2937 !important; }
body.dark-mode .section-row { background: #1f2937; }
body.dark-mode .section-row td { color: #9ca3af; }
body.dark-mode .section-row.section-highlight { border-left-color: #ef4444; }
body.dark-mode .section-row.section-highlight td { color: #fecaca; }
body.dark-mode .char-name { color: #e5e7eb; }
body.dark-mode .char-delete { color: #f88; }
body.dark-mode .edit-mode-cell { background-color: #2a2a2a; }
body.dark-mode .edit-button-enabled { background-color: #374151; border-color: #4b5563; color: #e5e7eb; }
body.dark-mode .edit-button-disabled { background-color: #f59e0b; border-color: #d97706; }
</style>
<div class="container">
<div id="toolbar" class="toolbar">
<input id="newCharName" type="text" placeholder="キャラ名" />
<input id="newCharColor" type="color" value="#d4eaf3" />
<button id="addCharBtn" class="add-btn">＋ 追加</button>
<button id="editModeBtn" class="edit-btn">✏️ 編集モード</button>
</div>
<div id="todayInfo" class="today-card"></div>
<div id="updateNotice" class="update-notice" style="display: none;"></div>
<div style="overflow-x: auto;">
<table id="mainTable">
<thead id="tableHeader">
<tr id="headerRow"><th>項目</th><th>状況</th></tr>
</thead>
<tbody id="tableBody"></tbody>
</table>
</div>
</div>
`;
            
            loadCharacters();
            loadDisabled();
            
            // イベントリスナー設定
            const addBtn = document.getElementById('addCharBtn');
            const editBtn = document.getElementById('editModeBtn');
            if (addBtn) addBtn.addEventListener('click', addCharacter);
            if (editBtn) editBtn.addEventListener('click', toggleEditMode);
            
            renderAll();
            
            // ダークモード監視
            const observer = new MutationObserver(() => {
                if (typeof renderAll === 'function') renderAll();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    };
})(window);
