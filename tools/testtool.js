// ========== DQX構成保存ツール Ver 1.9 (testtool.js) ==========
(function(global) {
    // 職業データ
    const JOB_DATA = {
        "戦士":         {w:["片手剣","両手剣","オノ"],               s:"both",  t:["鎧"]},
        "僧侶":         {w:["スティック","棍","ヤリ"],               s:"light", t:["ローブ"]},
        "武闘家":       {w:["ツメ","棍","扇","ヤリ"],                s:"none",  t:["道着"]},
        "魔法使い":     {w:["両手杖","短剣","ムチ"],                 s:"light", t:["ローブ"]},
        "盗賊":         {w:["ツメ","短剣","ムチ","ハンマー"],        s:"light", t:["装束"]},
        "旅芸人":       {w:["短剣","棍","扇","ブーメラン"],          s:"light", t:["軽装"]},
        "パラディン":   {w:["ハンマー","ヤリ","スティック","片手剣"],s:"both",  t:["鎧"]},
        "レンジャー":   {w:["ブーメラン","オノ","弓","ツメ"],        s:"light", t:["軽装"]},
        "魔法戦士":     {w:["片手剣","両手杖","弓"],                 s:"both",  t:["鎧","装束"]},
        "スーパースター":{w:["スティック","扇","ムチ","鎌"],         s:"light", t:["軽装"]},
        "バトルマスター":{w:["両手剣","片手剣","ハンマー"],          s:"none",  t:["道着"]},
        "賢者":         {w:["両手杖","ブーメラン","弓","扇"],        s:"light", t:["ローブ"]},
        "まもの使い":   {w:["両手剣","オノ","ツメ","ムチ"],          s:"none",  t:["道着"]},
        "どうぐ使い":   {w:["ハンマー","ブーメラン","ヤリ","弓"],    s:"light", t:["装束"]},
        "踊り子":       {w:["短剣","スティック","扇"],                s:"none",  t:["道着","軽装"]},
        "占い師":       {w:["片手剣","棍","弓","ムチ"],              s:"light", t:["ローブ"]},
        "天地雷鳴士":   {w:["両手杖","スティック","扇"],             s:"light", t:["ローブ"]},
        "遊び人":       {w:["片手剣","短剣","ハンマー","ブーメラン"],s:"light", t:["軽装"]},
        "デスマスター": {w:["鎌","オノ","棍","弓"],                  s:"none",  t:["ローブ"]},
        "魔剣士":       {w:["片手剣","両手剣","短剣","鎌"],          s:"both",  t:["鎧"]},
        "海賊":         {w:["短剣","弓","ブーメラン","オノ"],        s:"light", t:["装束"]},
        "ガーディアン": {w:["片手剣","両手剣","ヤリ"],               s:"both",  t:["鎧"]},
        "竜術士":       {w:["両手杖","鎌","スティック","弓"],        s:"light", t:["ローブ"]},
        "隠者":         {w:["弓","ブーメラン","スティック","扇"],     s:"light", t:["ローブ"]}
    };

    const ARMOR_PARTS_KEY = { head:"頭", body:"上", legs:"下", arms:"腕", feet:"足" };
    const ALL_PARTS = ["head","body","legs","arms","feet"];
    const ACC_LABELS = ["顔","首","指","胸","腰","札","他","紋","証","心"];
    const SKILL_LABELS = ["スキル1","スキル2","スキル3","スキル4"];
    const ORB_LABELS = ["宝珠(火)","宝珠(水)","宝珠(風)","宝珠(光)","宝珠(闇)"];
    const TWO_HAND_TYPES = ["両手剣","両手杖","ヤリ","オノ","棍","ツメ","ムチ","弓","鎌"];
    const DUAL_WIELD_JOBS = ["踊り子","バトルマスター"];

    let masterData = { armors: [], weapons: [], shields: [] };
    let savedConfigs = [];

    function escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function showToast(message, isError = false) {
        const toastId = isError ? 'dqt-error-toast' : 'dqt-success-toast';
        let toast = document.getElementById(toastId);
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'dqt-toast ' + (isError ? 'dqt-toast-error' : 'dqt-toast-success');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:20px;font-size:12px;z-index:10000;opacity:1;transition:opacity 0.3s;pointer-events:none;' + (isError ? 'background:#dc3545;color:#fff;' : 'background:#28a745;color:#fff;');
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 2000);
    }

    async function loadMasterData() {
        try {
            const res = await fetch("equip_master.json");
            masterData = await res.json();
            return true;
        } catch(e) {
            console.error("データ読み込み失敗", e);
            return false;
        }
    }

    function hasMultipleArmorTypes(job) {
        if (!job) return false;
        const info = JOB_DATA[job];
        return info && info.t.length > 1;
    }

    function updateArmorLists() {
        const job = document.getElementById('dqt-job-select').value;
        if (!job || !masterData.armors.length) return;
        const info = JOB_DATA[job];
        const armorType = document.getElementById('dqt-armor-type-select')?.value || "";

        let filtered = masterData.armors.filter(a => info.t.includes(a.type));
        if (armorType) filtered = filtered.filter(a => a.type === armorType);

        for (let key in ARMOR_PARTS_KEY) {
            const label = ARMOR_PARTS_KEY[key];
            const el = document.getElementById(`dqt-a-${label}-name`);
            if (!el) continue;
            const oldV = el.value;
            el.innerHTML = '<option value="">未選択</option>';
            filtered.forEach(a => {
                const parts = a.parts || ALL_PARTS;
                if (parts.includes(key)) el.add(new Option(a.name, a.name));
            });
            if ([...el.options].some(o => o.value === oldV)) el.value = oldV;
        }
    }

    function updateRightWeaponList() {
        const job = document.getElementById('dqt-job-select').value;
        if (!job || !masterData.weapons.length) return;
        const info = JOB_DATA[job];
        const typeFilter = document.getElementById('dqt-w-right-type').value;

        const wepSel = document.getElementById('dqt-w-右手-name');
        const oldVal = wepSel.value;
        wepSel.innerHTML = '<option value="">未選択</option>';
        let filtered = masterData.weapons.filter(w => info.w.includes(w.type));
        if (typeFilter) filtered = filtered.filter(w => w.type === typeFilter);
        filtered.forEach(w => wepSel.add(new Option(w.name, w.name)));
        if ([...wepSel.options].some(o => o.value === oldVal)) wepSel.value = oldVal;
        updateLeftHand();
    }

    function updateLeftHandList() {
        const job = document.getElementById('dqt-job-select').value;
        if (!job || !masterData.weapons.length) return;
        const info = JOB_DATA[job];
        const canShield = (info.s === "both" || info.s === "light");
        const isDualWield = DUAL_WIELD_JOBS.includes(job);

        const typeFilter = document.getElementById('dqt-w-left-type')?.value;
        const equipSel = document.getElementById('dqt-w-左手-name');
        if (!equipSel || equipSel.disabled) return;

        const oldVal = equipSel.value;
        equipSel.innerHTML = '<option value="">未選択</option>';

        if (!typeFilter) {
            if (canShield) {
                masterData.shields.forEach(sh => {
                    if (info.s === "both") {
                        if (sh.type === "大盾" || sh.type === "小盾") equipSel.add(new Option(sh.name, sh.name));
                    } else if (info.s === "light" && sh.type === "小盾") {
                        equipSel.add(new Option(sh.name, sh.name));
                    }
                });
            }
            if (isDualWield) {
                masterData.weapons.forEach(w => {
                    if (info.w.includes(w.type) && !TWO_HAND_TYPES.includes(w.type)) {
                        equipSel.add(new Option(w.name, w.name));
                    }
                });
            }
        } else if (typeFilter === "大盾" || typeFilter === "小盾") {
            masterData.shields.forEach(sh => {
                if (sh.type === typeFilter) equipSel.add(new Option(sh.name, sh.name));
            });
        } else {
            if (isDualWield) {
                masterData.weapons.forEach(w => {
                    if (w.type === typeFilter && info.w.includes(w.type) && !TWO_HAND_TYPES.includes(w.type)) {
                        equipSel.add(new Option(w.name, w.name));
                    }
                });
            }
        }
        if ([...equipSel.options].some(o => o.value === oldVal)) equipSel.value = oldVal;
    }

    function updateLeftHand() {
        const job = document.getElementById('dqt-job-select').value;
        if (!job) return;
        const info = JOB_DATA[job];
        const rWepSel = document.getElementById('dqt-w-右手-name');
        const curRW = masterData.weapons.find(w => w.name === rWepSel.value);
        const isTwoHand = curRW && TWO_HAND_TYPES.includes(curRW.type);

        const leftRow = document.getElementById('dqt-left-row');
        const canShield = (info.s === "both" || info.s === "light");
        const isDualWield = DUAL_WIELD_JOBS.includes(job);

        if (isTwoHand) {
            leftRow.innerHTML = '<span>左手</span><select disabled><option>（両手持ち）</option></select><input type="text" placeholder="詳細" disabled>';
            return;
        }
        if (!canShield && !isDualWield) {
            leftRow.innerHTML = '<span>左手</span><div class="dqt-no-left-label">（この職業は左手装備不可）</div>';
            return;
        }

        const oldTypeVal = document.getElementById('dqt-w-left-type')?.value || "";
        const oldEquipVal = document.getElementById('dqt-w-左手-name')?.value || "";
        const oldDetailVal = document.getElementById('dqt-w-左手-detail')?.value || "";

        leftRow.innerHTML = '<span>左手</span><select id="dqt-w-left-type"><option value="">すべて</option></select><select id="dqt-w-左手-name"><option value="">未選択</option></select><input type="text" id="dqt-w-左手-detail" placeholder="詳細">';
        
        const lTypeSel = document.getElementById('dqt-w-left-type');
        if (info.s === "both") {
            lTypeSel.add(new Option("大盾", "大盾"));
            lTypeSel.add(new Option("小盾", "小盾"));
        } else if (info.s === "light") {
            lTypeSel.add(new Option("小盾", "小盾"));
        }
        if (isDualWield) {
            info.w.forEach(wType => {
                if (!TWO_HAND_TYPES.includes(wType)) lTypeSel.add(new Option(wType, wType));
            });
        }
        if ([...lTypeSel.options].some(o => o.value === oldTypeVal)) lTypeSel.value = oldTypeVal;
        
        document.getElementById('dqt-w-左手-detail').value = oldDetailVal;
        document.getElementById('dqt-w-left-type').onchange = updateLeftHandList;
        updateLeftHandList();
        
        const lEquipSel = document.getElementById('dqt-w-左手-name');
        if (oldEquipVal && [...lEquipSel.options].some(o => o.value === oldEquipVal)) {
            lEquipSel.value = oldEquipVal;
        }
    }

    function updateSelects() {
        updateRightWeaponList();
        updateArmorLists();
    }

    function getCurrentConfig() {
        const job = document.getElementById('dqt-job-select').value;
        if (!job) return null;
        const conf = { job };
        const memo = document.getElementById('dqt-memo-name').value;
        if (memo) conf.memo = memo;

        const wRN = document.getElementById('dqt-w-右手-name')?.value;
        const wRD = document.getElementById('dqt-w-右手-detail')?.value;
        if (wRN || wRD) {
            conf.wR = {};
            if (wRN) conf.wR.n = wRN;
            if (wRD) conf.wR.d = wRD;
        }

        const wLSel = document.getElementById('dqt-w-左手-name');
        const wLDEl = document.getElementById('dqt-w-左手-detail');
        const wLN = wLSel?.value;
        const wLD = (!wLDEl?.disabled) ? wLDEl?.value : "";
        if (wLN && wLN !== "（両手持ち）") {
            conf.wL = { n: wLN };
            if (wLD) conf.wL.d = wLD;
        } else if (!wLN && wLD) {
            conf.wL = { d: wLD };
        }

        const armorObj = {};
        let hasArmor = false;
        for (let key in ARMOR_PARTS_KEY) {
            const label = ARMOR_PARTS_KEY[key];
            const n = document.getElementById(`dqt-a-${label}-name`)?.value;
            const d = document.getElementById(`dqt-a-${label}-detail`)?.value;
            if (n || d) {
                hasArmor = true;
                armorObj[label] = {};
                if (n) armorObj[label].n = n;
                if (d) armorObj[label].d = d;
            }
        }
        if (hasArmor) conf.armor = armorObj;

        const accObj = {};
        let hasAcc = false;
        ACC_LABELS.forEach(l => {
            const n = document.getElementById(`dqt-acc-${l}-name`)?.value;
            const d = document.getElementById(`dqt-acc-${l}-detail`)?.value;
            if (n || d) {
                hasAcc = true;
                accObj[l] = {};
                if (n) accObj[l].n = n;
                if (d) accObj[l].d = d;
            }
        });
        if (hasAcc) conf.acc = accObj;

        const skillObj = {};
        let hasSkill = false;
        const SP_STEPS = [160, 170, 180, 190, 200];
        SKILL_LABELS.forEach(l => {
            const n = document.getElementById(`dqt-ex-${l}-name`)?.value;
            const spVals = {};
            SP_STEPS.forEach(sp => {
                const v = document.getElementById(`dqt-ex-${l}-sp${sp}`)?.value;
                if (v) spVals[sp] = v;
            });
            if (n || Object.keys(spVals).length) {
                hasSkill = true;
                skillObj[l] = {};
                if (n) skillObj[l].n = n;
                if (Object.keys(spVals).length) skillObj[l].sp = spVals;
            }
        });
        if (hasSkill) conf.skill = skillObj;

        const orbObj = {};
        let hasOrb = false;
        ORB_LABELS.forEach(l => {
            const v = document.getElementById(`dqt-ex-${l}`)?.value;
            if (v) { hasOrb = true; orbObj[l] = v; }
        });
        if (hasOrb) conf.orb = orbObj;

        return conf;
    }

    function setCurrentConfig(conf) {
        if (!conf) return;
        const jSel = document.getElementById('dqt-job-select');
        if (conf.job && [...jSel.options].some(o => o.value === conf.job)) {
            jSel.value = conf.job;
            updateSelects();
        }
        document.getElementById('dqt-memo-name').value = conf.memo || "";
        if (conf.wR) {
            const wRSel = document.getElementById('dqt-w-右手-name');
            if (conf.wR.n && [...wRSel.options].some(o => o.value === conf.wR.n)) wRSel.value = conf.wR.n;
            document.getElementById('dqt-w-右手-detail').value = conf.wR.d || "";
        }
        updateLeftHand();
        if (conf.wL) {
            const wLSel = document.getElementById('dqt-w-左手-name');
            if (wLSel && !wLSel.disabled && conf.wL.n && [...wLSel.options].some(o => o.value === conf.wL.n)) {
                wLSel.value = conf.wL.n;
            }
            const wLDEl = document.getElementById('dqt-w-左手-detail');
            if (wLDEl && !wLDEl.disabled) wLDEl.value = conf.wL.d || "";
        }
        if (conf.armor) {
            for (let key in ARMOR_PARTS_KEY) {
                const label = ARMOR_PARTS_KEY[key];
                const data = conf.armor[label];
                if (data) {
                    const sel = document.getElementById(`dqt-a-${label}-name`);
                    if (sel && data.n && [...sel.options].some(o => o.value === data.n)) sel.value = data.n;
                    const det = document.getElementById(`dqt-a-${label}-detail`);
                    if (det) det.value = data.d || "";
                }
            }
        }
        if (conf.acc) {
            ACC_LABELS.forEach(l => {
                const data = conf.acc[l];
                if (data) {
                    const sel = document.getElementById(`dqt-acc-${l}-name`);
                    if (sel && data.n && [...sel.options].some(o => o.value === data.n)) sel.value = data.n;
                    const det = document.getElementById(`dqt-acc-${l}-detail`);
                    if (det) det.value = data.d || "";
                }
            });
        }
        if (conf.skill) {
            const SP_STEPS = [160, 170, 180, 190, 200];
            SKILL_LABELS.forEach(l => {
                const data = conf.skill[l];
                if (data) {
                    const sel = document.getElementById(`dqt-ex-${l}-name`);
                    if (sel && data.n && [...sel.options].some(o => o.value === data.n)) sel.value = data.n;
                    if (data.sp) {
                        SP_STEPS.forEach(sp => {
                            const el = document.getElementById(`dqt-ex-${l}-sp${sp}`);
                            if (el && data.sp[sp]) el.value = data.sp[sp];
                        });
                    }
                }
            });
        }
        if (conf.orb) {
            ORB_LABELS.forEach(l => {
                const el = document.getElementById(`dqt-ex-${l}`);
                if (el && conf.orb[l]) el.value = conf.orb[l];
            });
        }
    }

    function formatCell(name, detail) {
        if (name && detail) return `${name} | ${detail}`;
        if (name) return name;
        if (detail) return detail;
        return "";
    }

    function compressConfigs() {
        return btoa(unescape(encodeURIComponent(JSON.stringify(savedConfigs))));
    }

    function decompressConfigs(compressed) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(compressed))));
        } catch(e) {
            throw new Error("データ解凍失敗");
        }
    }

    function renderTable() {
        const head = document.getElementById('dqt-table-head');
        const body = document.getElementById('dqt-table-body');
        if (!head || !body) return;
        head.innerHTML = "";
        body.innerHTML = "";
        if (!savedConfigs.length) return;

        const allRowDefs = [
            {l:"職業",  getValue: c => c.job || ""},
            {l:"右手",  getValue: c => formatCell(c.wR?.n, c.wR?.d)},
            {l:"左手",  getValue: c => formatCell(c.wL?.n, c.wL?.d)},
            ...Object.values(ARMOR_PARTS_KEY).map(l => ({l, getValue: c => formatCell(c.armor?.[l]?.n, c.armor?.[l]?.d)})),
            ...ACC_LABELS.map(l => ({l, getValue: c => formatCell(c.acc?.[l]?.n, c.acc?.[l]?.d)})),
            ...SKILL_LABELS.flatMap(l => [
                {l, getValue: c => c.skill?.[l]?.n || ""},
                ...[160,170,180,190,200].map(sp => ({l:`${l}-${sp}`, getValue: c => c.skill?.[l]?.sp?.[sp] || ""}))
            ]),
            ...ORB_LABELS.map(l => ({l, getValue: c => c.orb?.[l] || ""})),
            {l:"メモ",  getValue: c => c.memo || ""}
        ];

        const visibleRows = allRowDefs.filter(r => savedConfigs.some(c => r.getValue(c)));
        if (!visibleRows.length) return;

        let headTr = "<tr><th>項目</th>";
        savedConfigs.forEach((_, i) => { headTr += `<th>Slot ${i+1}<button class="dqt-del-btn" data-idx="${i}">消</button></th>`; });
        headTr += "</table>";
        head.innerHTML = headTr;

        visibleRows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<th>${r.l}</th>`;
            savedConfigs.forEach(conf => {
                tr.innerHTML += `<td class="dqt-cell-content">${escapeHtml(r.getValue(conf))}</td>`;
            });
            body.appendChild(tr);
        });

        document.querySelectorAll('.dqt-del-btn').forEach(btn => {
            btn.onclick = () => { savedConfigs.splice(parseInt(btn.dataset.idx), 1); renderTable(); };
        });
    }

    async function render(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">装備マスターデータ読み込み中...</div>';

        const loaded = await loadMasterData();
        if (!loaded) {
            container.innerHTML = '<div style="color:red;text-align:center;padding:40px;">データ読み込み失敗しました</div>';
            return;
        }

        container.innerHTML = `
<style>
.dqt-container *{box-sizing:border-box}
.dqt-container{max-width:100%;margin:5px auto;background:#fff;padding:10px;border-radius:10px;font-family:sans-serif;font-size:11px}
.dqt-section{margin-bottom:8px;padding:8px;border:1px solid #dee2e6;border-radius:6px;background:#fff}
.dqt-section h3{margin:0 0 5px;font-size:13px;color:#007bff;border-bottom:2px solid #007bff;display:inline-block}
.dqt-input-pair{display:grid;grid-template-columns:60px 1.2fr 1.5fr 1.5fr;gap:3px;align-items:center;margin-bottom:3px}
.dqt-input-pair-2col{display:grid;grid-template-columns:60px 1fr 2fr;gap:3px;align-items:center;margin-bottom:3px}
.dqt-input-pair-orb{display:grid;grid-template-columns:60px 4fr;gap:3px;align-items:center;margin-bottom:3px}
.dqt-container select,.dqt-container input{height:34px;padding:0 8px;border-radius:4px;border:1px solid #ced4da;font-size:12px;width:100%}
.dqt-btn-group-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0}
.dqt-btn{padding:12px;border:none;border-radius:6px;color:#fff;font-weight:bold;cursor:pointer;font-size:13px;text-align:center}
.dqt-btn-add{background:#28a745}
.dqt-btn-img{background:#007bff}
.dqt-btn-copy{background:#17a2b8}
.dqt-btn-paste{background:#fd7e14}
.dqt-table-wrap{overflow-x:auto;margin-top:10px;border:2px solid #343a40;border-radius:6px}
.dqt-compare-table{width:auto;border-collapse:collapse;background:#fff}
.dqt-compare-table th{background:#343a40;color:#fff;font-size:10px;padding:6px;border:1px solid #454d55;min-width:60px}
.dqt-compare-table td{border:1px solid #dee2e6;padding:6px;font-size:11px;min-width:150px;vertical-align:top}
.dqt-del-btn{background:#dc3545;color:#fff;border:none;padding:2px 5px;border-radius:3px;font-size:10px;margin-left:5px;cursor:pointer}
.dqt-skill-block{margin-bottom:6px;border:1px solid #e9ecef;border-radius:4px;padding:5px;background:#fdfdfd}
.dqt-skill-name-row{display:grid;grid-template-columns:60px 1fr;gap:3px;align-items:center;margin-bottom:3px}
.dqt-skill-sp-row{display:grid;grid-template-columns:60px 1fr;gap:3px;align-items:center;margin-bottom:2px}
.dqt-skill-sp-label{color:#6c757d;font-size:11px;text-align:right;padding-right:4px}
.dqt-no-left-label{height:34px;line-height:34px;padding:0 8px;color:#6c757d;font-size:12px;background:#f8f9fa;border-radius:4px;text-align:center}
body.dark-mode .dqt-container{background:#1e293b}
body.dark-mode .dqt-section{background:#0f172a;border-color:#334155}
body.dark-mode .dqt-section h3{color:#60a5fa;border-bottom-color:#60a5fa}
body.dark-mode .dqt-container select,body.dark-mode .dqt-container input{background:#334155;border-color:#475569;color:#f1f5f9}
body.dark-mode .dqt-compare-table th{background:#0f172a;color:#f1f5f9;border-color:#334155}
body.dark-mode .dqt-compare-table td{border-color:#334155}
body.dark-mode .dqt-cell-content{color:#e2e8f0}
body.dark-mode .dqt-skill-block{background:#0f172a;border-color:#334155}
body.dark-mode .dqt-skill-sp-label{color:#94a3b8}
body.dark-mode .dqt-no-left-label{background:#1e293b;color:#94a3b8}
</style>
<div class="dqt-container">
    <div class="dqt-section">
        <div class="dqt-input-pair-2col"><span>職業</span><select id="dqt-job-select" style="grid-column:span 2"></select><span id="dqt-data-status">✅ 読込完了</span></div>
        <div id="dqt-weapon-inputs"></div>
    </div>
    <div class="dqt-section">
        <h3>Armor Set</h3>
        <div id="dqt-armor-inputs"></div>
    </div>
    <div class="dqt-section"><h3>Accessories</h3><div id="dqt-acc-inputs"></div></div>
    <div class="dqt-section">
        <h3>Extra Settings</h3>
        <details style="border:1px solid #eee;padding:5px;"><summary style="cursor:pointer;font-weight:bold;color:#666;">スキル・宝珠設定を開く</summary><div id="dqt-extra-inputs"></div></details>
        <div class="dqt-input-pair-2col" style="margin-top:10px;border-top:1px dashed #ccc;padding-top:10px;">
            <span>メモ</span><input type="text" id="dqt-memo-name" placeholder="自由入力" style="grid-column:span 2">
        </div>
    </div>
    <div class="dqt-btn-group-3">
        <button id="dqt-add-btn" class="dqt-btn dqt-btn-add">構成を追加</button>
        <button id="dqt-gen-img-btn" class="dqt-btn dqt-btn-img">📷 画像保存</button>
        <button id="dqt-copy-text-btn" class="dqt-btn dqt-btn-copy">📋 テキストコピー</button>
        <button id="dqt-paste-text-btn" class="dqt-btn dqt-btn-paste" style="grid-column:span 3">📋 クリップボードから貼付</button>
    </div>
    <div class="dqt-table-wrap"><table id="dqt-main-table" class="dqt-compare-table"><thead id="dqt-table-head"></thead><tbody id="dqt-table-body"></tbody></table></div>
</div>
<canvas id="dqt-hidden-canvas" style="display:none;"></canvas>
`;

        // 武器入力エリア構築
        const weaponDiv = document.getElementById('dqt-weapon-inputs');
        weaponDiv.innerHTML = '<div class="dqt-input-pair"><span>右手</span><select id="dqt-w-right-type"><option value="">すべて</option></select><select id="dqt-w-右手-name"><option value="">未選択</option></select><input type="text" id="dqt-w-右手-detail" placeholder="詳細"></div><div id="dqt-left-row" class="dqt-input-pair"></div>';

        // 防具入力エリア構築
        const armorDiv = document.getElementById('dqt-armor-inputs');
        armorDiv.innerHTML = '';
        for (let key in ARMOR_PARTS_KEY) {
            const label = ARMOR_PARTS_KEY[key];
            armorDiv.innerHTML += `<div class="dqt-input-pair-2col"><span>${label}</span><select id="dqt-a-${label}-name"><option value="">未選択</option></select><input type="text" id="dqt-a-${label}-detail" placeholder="詳細"></div>`;
        }

        // アクセサリ入力エリア構築
        const accDiv = document.getElementById('dqt-acc-inputs');
        accDiv.innerHTML = '';
        ACC_LABELS.forEach(l => {
            accDiv.innerHTML += `<div class="dqt-input-pair-2col"><span>${l}</span><select id="dqt-acc-${l}-name"><option value="">未選択</option></select><input type="text" id="dqt-acc-${l}-detail" placeholder="詳細"></div>`;
        });

        // スキル・宝珠入力エリア構築
        const extraDiv = document.getElementById('dqt-extra-inputs');
        extraDiv.innerHTML = '';
        const SP_STEPS = [160, 170, 180, 190, 200];
        SKILL_LABELS.forEach(l => {
            let block = `<div class="dqt-skill-block">`;
            block += `<div class="dqt-skill-name-row"><span>${l}</span><select id="dqt-ex-${l}-name"><option value="">未選択</option></select></div>`;
            SP_STEPS.forEach(sp => {
                block += `<div class="dqt-skill-sp-row"><span class="dqt-skill-sp-label">${sp}</span><input type="text" id="dqt-ex-${l}-sp${sp}" placeholder="振り分け内容"></div>`;
            });
            block += `</div>`;
            extraDiv.innerHTML += block;
        });
        ORB_LABELS.forEach(l => {
            extraDiv.innerHTML += `<div class="dqt-input-pair-orb"><span>${l}</span><input type="text" id="dqt-ex-${l}" placeholder="自由入力"></div>`;
        });

        // 職業選択肢設定
        const jobSel = document.getElementById('dqt-job-select');
        Object.keys(JOB_DATA).forEach(j => jobSel.add(new Option(j, j)));
        jobSel.onchange = () => { updateSelects(); };

        // 右手装備の種別フィルタ変更時
        document.getElementById('dqt-w-right-type').onchange = updateRightWeaponList;
        document.getElementById('dqt-w-右手-name').onchange = updateLeftHand;

        // 初期化
        const initialJob = Object.keys(JOB_DATA)[0];
        jobSel.value = initialJob;
        
        // 右手種別選択肢を設定
        const rightTypeSel = document.getElementById('dqt-w-right-type');
        const info = JOB_DATA[initialJob];
        info.w.forEach(wType => rightTypeSel.add(new Option(wType, wType)));
        
        updateRightWeaponList();
        updateArmorLists();

        // 構成追加ボタン
        document.getElementById('dqt-add-btn').onclick = () => {
            if (savedConfigs.length >= 8) {
                showToast("最大8枠です", true);
                return;
            }
            const conf = getCurrentConfig();
            if (!conf) {
                showToast("職業を選んでください", true);
                return;
            }
            savedConfigs.push(conf);
            renderTable();
            showToast("構成を追加しました");
        };

        // 画像保存ボタン
        document.getElementById('dqt-gen-img-btn').onclick = () => {
            if (!savedConfigs.length) {
                showToast("データがありません", true);
                return;
            }
            const canvas = document.getElementById('dqt-hidden-canvas');
            const ctx = canvas.getContext('2d');

            const allRowDefs = [
                {l:"職業",  getValue: c => c.job || ""},
                {l:"右手",  getValue: c => formatCell(c.wR?.n, c.wR?.d)},
                {l:"左手",  getValue: c => formatCell(c.wL?.n, c.wL?.d)},
                ...Object.values(ARMOR_PARTS_KEY).map(l => ({l, getValue: c => formatCell(c.armor?.[l]?.n, c.armor?.[l]?.d)})),
                ...ACC_LABELS.map(l => ({l, getValue: c => formatCell(c.acc?.[l]?.n, c.acc?.[l]?.d)})),
                ...SKILL_LABELS.flatMap(l => [
                    {l, getValue: c => c.skill?.[l]?.n || ""},
                    ...[160,170,180,190,200].map(sp => ({l:`${l}-${sp}`, getValue: c => c.skill?.[l]?.sp?.[sp] || ""}))
                ]),
                ...ORB_LABELS.map(l => ({l, getValue: c => c.orb?.[l] || ""})),
                {l:"メモ",  getValue: c => c.memo || ""}
            ];

            const visibleRows = allRowDefs.filter(r => savedConfigs.some(c => r.getValue(c)));
            if (!visibleRows.length) return;

            canvas.width = 100 + savedConfigs.length * 180;
            canvas.height = visibleRows.length * 40 + 70;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            visibleRows.forEach((r, ri) => {
                const y = ri * 40 + 60;
                ctx.fillStyle = "#343a40";
                ctx.fillRect(5, y, 90, 38);
                ctx.fillStyle = "#fff";
                ctx.font = "bold 11px sans-serif";
                ctx.fillText(r.l, 10, y + 23);

                savedConfigs.forEach((conf, ci) => {
                    const x = 100 + ci * 180;
                    const value = r.getValue(conf);
                    ctx.strokeStyle = "#eee";
                    ctx.strokeRect(x, y, 175, 38);
                    ctx.fillStyle = "#000";
                    ctx.font = "11px sans-serif";
                    ctx.fillText(String(value), x + 5, y + 23, 165);
                });
            });

            const imageData = canvas.toDataURL("image/png");
            const win = window.open();
            if (!win) {
                showToast("ポップアップがブロックされました", true);
                return;
            }
            win.document.write(`<body style="margin:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;"><p style='margin:10px;color:#ccc;font-size:12px;'>⬇️ 画像を長押し/右クリックで保存できます</p><img src="${imageData}" style="max-width:100%;height:auto;display:block;"></body>`);
            win.document.close();
        };

        // テキストコピーボタン
        document.getElementById('dqt-copy-text-btn').onclick = async () => {
            if (!savedConfigs.length) {
                showToast("コピーするデータがありません", true);
                return;
            }
            try {
                await navigator.clipboard.writeText(compressConfigs());
                showToast("クリップボードにコピーしました");
            } catch(err) {
                showToast("コピーに失敗しました", true);
            }
        };

        // 貼付ボタン
        document.getElementById('dqt-paste-text-btn').onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (!text) {
                    showToast("クリップボードが空です", true);
                    return;
                }
                const configs = decompressConfigs(text);
                if (configs && Array.isArray(configs)) {
                    savedConfigs = configs;
                    renderTable();
                    showToast("復元完了");
                } else {
                    showToast("データ形式が正しくありません", true);
                }
            } catch(err) {
                if (err.name === 'NotAllowedError') {
                    showToast("クリップボードの読み取り許可が必要です", true);
                } else {
                    showToast("貼付失敗: " + err.message, true);
                }
            }
        };
    }

    global.DQtool = { render };
})(window);
