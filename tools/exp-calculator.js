// ========== DQX経験値計算機 ==========
(function(global) {
    // 既存のツールと変数が被らないように、独自の名前空間でラップ
    const ExpCalc = {
        timer: null,
        startTime: 0,
        pauseSec: 0,
        lastLap: 0,
        jobOffset: 0,
        passbookOffset: 0,
        count: 0,
        optCount: 1,
        calcLockedUntil: 0,

        // ユーティリティ
        L: ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
        RX: { none: 0, mk: 48240, hm: 12060, gn: 2240, sn: 1120, zucchini: 9010 },
        LV: 1589326,

        // DOM要素取得
        $: function(id) { return document.getElementById(id); },

        // 時間フォーマット
        formatTime: function(sec) {
            if (isNaN(sec) || sec < 0 || sec === Infinity) return "00:00.00";
            let m = Math.floor(sec / 60);
            let s = (sec % 60).toFixed(2).padStart(5, "0");
            return `${m.toString().padStart(2, "0")}:${s}`;
        },

        // レート計算
        getRate: function() {
            let r = 1.0;
            if (this.$("fd").checked) r += 0.3;
            const e = document.querySelector('input[name="e_exp"]:checked')?.value || "none";
            if (e === "genki") r += 1;
            if (e === "bakushin") r += 2;
            if (this.$("tr").checked) r += 1;
            if (this.$("em").checked) r += 1;
            return r;
        },

        // 上限適用
        applyLimit: function(val, lim) {
            let rnd = Math.round(val);
            let isInt = Math.abs(val - rnd) < 0.1;
            let rounded = this.$("fd").checked && isInt ? rnd + 1 : Math.ceil(val);
            return Math.min(rounded, lim);
        },

        // 経験値計算
        exp: function(c, rk = "none") {
            const sel = this.$("ms").options[this.$("ms").selectedIndex];
            const b = parseInt(sel.dataset.base) || 0;
            const bon = parseInt(sel.dataset.bonus) || 0;
            const rate = this.getRate();
            const rkVal = this.RX[rk] || 0;
            const isAngel = this.$("ag").checked;
            const pv = parseInt(this.$("pb").value) || 0;
            const hasPassbook = pv > 0;
            const isHighLimit = (document.querySelector('input[name="e_exp"]:checked')?.value === "bakushin") || this.$("tr").checked;
            const lim = isHighLimit ? 1499999 : 599999;
            const angelLim = 599999;

            let rawCommonPer = b * rate + bon;
            let rawAngelPer = isAngel ? b * 2 : 0;
            let rawRkCommon = rkVal * rate;
            let rawRkAngel = isAngel ? rkVal * 2 : 0;
            let rawTotalCommon = rawCommonPer * c + rawRkCommon;
            let rawTotalAngel = rawAngelPer * c + rawRkAngel;
            let rawTotal = rawTotalCommon + rawTotalAngel;

            if (hasPassbook) {
                let commonPart = Math.min(rawTotalCommon, lim);
                let angelPart = Math.min(rawTotalAngel, angelLim);
                let totalOverflow = (rawTotalCommon - commonPart) + (rawTotalAngel - angelPart);
                let common = this.applyLimit(commonPart, lim);
                let angel = Math.min(Math.ceil(angelPart), angelLim);
                return { total: common + angel, common: common, angel: angel, overflow: Math.ceil(totalOverflow), rawTotalCapped: commonPart + angelPart, rawCommonCapped: commonPart, rawAngelCapped: angelPart };
            } else {
                let finalTotal = Math.min(rawTotal, lim);
                let total = this.applyLimit(finalTotal, lim);
                return { total: total, common: total, angel: 0, overflow: Math.ceil(rawTotal - finalTotal), rawTotalCapped: finalTotal, rawCommonCapped: finalTotal, rawAngelCapped: 0 };
            }
        },

        // 最適呼び数計算
        calcOpt: function() {
            let en = document.querySelector('input[name="e_exp"]:checked')?.value || "none";
            let hl = en === "bakushin" || this.$("tr").checked;
            let lim = hl ? 1499999 : 599999;
            this.optCount = 1;
            for (let i = 1; i <= 12; i++) {
                if (this.exp(i).common < lim) this.optCount = i;
                else break;
            }
        },

        // UI更新
        updateUI: function(auto = false) {
            let pl = parseInt(this.$("pb").value) || 0;
            const passArea = this.$("passbookArea");
            if (pl > 0) {
                passArea.classList.remove("hidden");
                this.$("plt").textContent = pl.toLocaleString();
            } else {
                passArea.classList.add("hidden");
            }
            this.calcOpt();
            if (auto) this.$("cn").value = this.optCount;
            let c = parseInt(this.$("cn").value);
            let e = this.exp(c);
            this.$("ce").textContent = e.total.toLocaleString();
            this.$("of").style.visibility = e.overflow > 0 ? "visible" : "hidden";
            this.$("of").textContent = `溢れ:${e.overflow.toLocaleString()}`;
        },

        // 合計表示更新
        updateTotal: function() {
            let sumVal = 0, accVal = 0, lps = [], penaltyMin = 0, penaltyMax = 0;
            document.querySelectorAll(".exp-row").forEach(el => {
                let val = parseInt(el.dataset.val) || 0;
                if (!isNaN(val)) {
                    sumVal += val;
                    if (el.dataset.type === "pass") accVal += val;
                }
                if (el.dataset.lap && el.dataset.lap !== '-1' && el.dataset.type !== "lap_only" && el.dataset.type !== "job" && el.dataset.main === "true") {
                    lps.push(parseFloat(el.dataset.lap));
                }
                if (el.dataset.desp === "true" && el.dataset.lap && el.dataset.lap !== '-1' && el.dataset.type !== "lap_only" && el.dataset.type !== "job") {
                    let expVal = parseFloat(el.dataset.rawValCapped) || parseInt(el.dataset.val) || 0;
                    let lapSec = parseFloat(el.dataset.lap);
                    if (lapSec > 6.45) {
                        penaltyMin += expVal * (6.45 / lapSec);
                        penaltyMax += expVal * (2.58 / lapSec);
                    }
                }
            });
            this.$("hs").textContent = Math.ceil(sumVal).toLocaleString();
            let pl = parseInt(this.$("pb").value) || 0;
            if (pl > 0) {
                let disp = Math.max(0, accVal - this.passbookOffset);
                this.$("te").textContent = Math.ceil(disp).toLocaleString();
            }
            let hasPenalty = document.querySelectorAll('.exp-row[data-desp="true"]').length > 0;
            const penaltyRef = this.$("penaltyRef");
            if (hasPenalty && penaltyMin > 0) {
                penaltyRef.style.display = "block";
                penaltyRef.innerHTML = `デスペナ想定:<br>${Math.ceil(penaltyMax).toLocaleString()}～${Math.ceil(penaltyMin).toLocaleString()}`;
            } else {
                penaltyRef.style.display = "none";
            }
            if (lps.length > 0) {
                let avg = lps.reduce((a, b) => a + b, 0) / lps.length;
                this.$("at").textContent = this.formatTime(avg);
                if (avg > 0.01) {
                    let b30 = Math.floor(1800 / avg);
                    let ep = sumVal / (lps.length || 1);
                    this.$("fc").textContent = `${Math.round(ep * b30 / 1e4)}万～${Math.round(ep * (b30 + 1) / 1e4)}万`;
                } else {
                    this.$("fc").textContent = "--";
                }
            } else {
                this.$("at").textContent = "--:--.--";
                this.$("fc").textContent = "--";
            }
        },

        // お供オプションHTML
        getPartnerOptions: function(mid) {
            const base = `<option value="none">お供無</option><option value="hm">はぐメタ</option><option value="mk">メタキン</option><option value="gn">ゲノミー</option><option value="sn">仙人</option>`;
            return mid === "dearthlicant" ? base + `<option value="zucchini">ズッキ祖</option>` : base;
        },

        // 行追加
        addRow: function(bid, c, xp, type, ts, lap, main = false, rawValCapped = null, mid = null, desp = false) {
            let d = document.createElement("div");
            d.className = "exp-row h";
            d.dataset.val = xp;
            d.dataset.rawValCapped = rawValCapped !== null ? rawValCapped : xp;
            const snapshot = {
                fd: this.$("fd").checked,
                tr: this.$("tr").checked,
                ag: this.$("ag").checked,
                em: this.$("em").checked,
                e: document.querySelector('input[name="e_exp"]:checked')?.value || "none",
                pb: this.$("pb").value,
                ms: mid || this.$("ms").value
            };
            d.dataset.snapshot = JSON.stringify(snapshot);
            d.dataset.type = type;
            d.dataset.sec = ts;
            d.dataset.lap = lap != null ? lap : -1;
            d.dataset.main = main;
            d.dataset.count = c;
            d.dataset.bid = bid;
            d.dataset.monsterId = mid || this.$("ms").value;
            d.dataset.desp = desp ? "true" : "false";

            let tm = { pass: "[通]", angel: "[エ]", overflow: "[溢]", normal: "", lap_only: "[LAP]", job: "転職" };
            let cm = { pass: "#f88", angel: "#5a9eff", overflow: "#aaa", lap_only: "#2cc9ff", job: "#00bcd4" };
            let nl = bid === "LAP" ? `<span style="color:#2cc9ff;font-weight:bold;width:26px;font-size:10px">LAP</span>` : `<span style="color:#999;width:26px;font-size:10px">#${bid}</span>`;
            let tdEl = `<div style="font-family:'Verdana',system-ui,sans-serif;font-variant-numeric:tabular-nums;width:65px"><div style="font-size:11px;font-weight:bold">${this.formatTime(ts)}</div>${lap != null && lap >= 0 ? `<div style="color:#2cc9ff;font-size:10px">L ${this.formatTime(lap)}</div>` : ""}</div>`;
            let ea = bid === "LAP" ? `<div style="width:95px;color:#aaa;font-size:10px">LAP MARK</div>` : type === "job" ? `<div style="width:95px"><span style="color:${cm[type]};font-size:10px">${tm[type]}</span></div>` : `<div style="width:95px"><strong class="ev" style="font-size:13px;min-width:62px;text-align:right;font-family:'Verdana',system-ui,sans-serif;font-variant-numeric:tabular-nums">${xp.toLocaleString()}</strong><span style="color:${cm[type]};font-size:10px">${tm[type]}</span></div>`;
            let despHtml = `<label style="margin:0 2px;display:inline-flex;align-items:center"><input type="checkbox" class="desp-tgl" ${desp ? "checked" : ""}><span style="font-size:9px">💀</span></label>`;
            let ca = bid !== "LAP" && type !== "job" ? `<div style="display:flex;gap:3px;flex:1"><select class="rs" style="font-size:12px;border:1px solid #7ab8ff;border-radius:2px;padding:3px">${this.getPartnerOptions(d.dataset.monsterId)}</select><select class="cs" style="font-size:12px;border:1px solid #7ab8ff;border-radius:2px;padding:3px">${this.L.map((l, i) => i > 0 ? `<option value="${i}" ${i == c ? "selected" : ""}>${l}</option>` : "").join("")}</select></div>` : `<div style="flex:1;color:#aaa;text-align:center;font-size:10px">----------</div>`;

            d.innerHTML = nl + tdEl + ea + despHtml + `<button class="del" style="border:none;background:none;color:#aaa;cursor:pointer;font-size:19px;padding:0 4px">×</button>` + ca;

            if (bid !== "LAP" && type !== "job") {
                let self = this;
                let upd = () => {
                    let snap = JSON.parse(d.dataset.snapshot);
                    let origFd = self.$("fd").checked;
                    let origTr = self.$("tr").checked;
                    let origAg = self.$("ag").checked;
                    let origEm = self.$("em").checked;
                    let origE = document.querySelector('input[name="e_exp"]:checked')?.value;
                    let origPb = self.$("pb").value;
                    let origMs = self.$("ms").value;

                    self.$("fd").checked = snap.fd;
                    self.$("tr").checked = snap.tr;
                    self.$("ag").checked = snap.ag;
                    self.$("em").checked = snap.em;
                    let eRadio = document.querySelector(`input[name="e_exp"][value="${snap.e}"]`);
                    if (eRadio) eRadio.checked = true;
                    self.$("pb").value = snap.pb;
                    self.$("ms").value = snap.ms;

                    let nc = parseInt(d.querySelector(".cs").value);
                    let nr = d.querySelector(".rs").value;
                    d.dataset.count = nc;
                    let res = self.exp(nc, nr);
                    let nv = d.dataset.type === "angel" ? res.angel : d.dataset.type === "pass" ? res.common : res.total;
                    d.dataset.val = nv;
                    d.dataset.rawValCapped = nv;
                    d.querySelector(".ev").textContent = nv.toLocaleString();

                    self.$("fd").checked = origFd;
                    self.$("tr").checked = origTr;
                    self.$("ag").checked = origAg;
                    self.$("em").checked = origEm;
                    let origERadio = document.querySelector(`input[name="e_exp"][value="${origE}"]`);
                    if (origERadio) origERadio.checked = true;
                    self.$("pb").value = origPb;
                    self.$("ms").value = origMs;

                    self.updateTotal();
                };
                d.querySelector(".cs").onchange = upd;
                d.querySelector(".rs").onchange = upd;
                let despChk = d.querySelector(".desp-tgl");
                if (despChk) {
                    despChk.onchange = () => {
                        d.dataset.desp = despChk.checked ? "true" : "false";
                        this.updateTotal();
                    };
                }
            }

            d.querySelector(".del").onclick = () => {
                d.remove();
                this.updateTotal();
            };
            this.$("rh").prepend(d);
            this.updateTotal();
        },

        // 時間表示更新
        updateTimerDisplay: function(now) {
            this.$("td").textContent = this.formatTime(now);
            this.$("ld").textContent = this.formatTime(now - this.lastLap);
            let sync = Math.max(0, now - this.jobOffset);
            this.$("syncDisplay").innerHTML = sync > 0 ? `オプション持続: ${this.formatTime(sync)}` : "&nbsp;";
        },

        render: function(containerSelector) {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            const self = this;

            // HTMLを設定
            container.innerHTML = `
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;padding:0}
.c{max-width:none;width:100%;margin:0;padding:0;background:transparent;border:none;border-radius:0;font-family:sans-serif;color:#333;line-height:1.25}
select,input,button{font-family:inherit}
.h{display:flex;align-items:center;padding:6px 4px;border-bottom:1px solid #eee;font-size:12px;white-space:nowrap;gap:4px}
.b1{background:#0066cc;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.2)}
.b2{background:#e74c3c;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer}
.b3{background:#3498db;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer}
.b4{background:#fff1f0;border:1px solid #ffa39e;color:#cf1322;border-radius:4px;font-weight:bold;cursor:pointer}
.b5{background:#00bcd4;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer}
.bg{background:#f9f9f9;border:1px solid #eee;border-radius:6px}
.rs,.cs{font-size:12px!important;padding:2px 4px!important;min-width:52px}
.rs{flex:1.45!important}
.cs{flex:0.9!important}
#td,#ld,#at,#te,#plt{font-family:'Verdana',system-ui,sans-serif!important;font-variant-numeric:tabular-nums}
#te,#plt{font-size:15px!important;font-weight:bold}
#timer-row{background:#f8f9fc!important;border-radius:6px;padding:6px 8px!important;margin-bottom:6px!important}
label{color:#000!important}
.ac{color:#f39c12}
.fc{color:#27ae60}
.ln{color:#2cc9ff}
.sync-small{font-size:9px;color:#888;text-align:right;height:14px;line-height:14px}
.lap-normal{font-size:18px;font-weight:bold;color:#2cc9ff;line-height:24px}
.timer-right{text-align:right}
.penalty-ref{font-size:11px;color:#ff6666;margin-top:4px;white-space:pre-line}
.passbook-area{background:#f0f7ff;border-radius:6px;padding:4px 8px;display:flex;flex-direction:column;gap:3px}
.passbook-area.hidden{display:none}
.passbook-info{font-size:13px;text-align:center;font-weight:bold}
.passbook-buttons{display:flex;gap:6px;justify-content:center}
.passbook-buttons button{background:#06c;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;flex:1}
#ms{text-align:center}
#ms, #pb, #cn, .rs, .cs,
[style*="border: 1px solid #b3d9ff"],
[style*="border:1px solid #b3d9ff"],
[style*="border: 1px solid #06c"],
[style*="border:1px solid #06c"] { border-color: #7ab8ff !important; }
#ts { background: #008888 !important; color: #fff !important; border: 1px solid #00aaaa !important; border-radius: 4px; cursor: pointer; font-weight: bold; padding: 2px; }
.copy-btn { background: #008888 !important; color: #fff !important; border: none !important; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; padding: 4px 8px; font-size: 12px; }
.oc-btn { background: #fff1f0 !important; border: 1px solid #ffa39e !important; color: #cf1322 !important; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; margin-right: 8px; }
body.dark-mode{background:#0a0a0f}
body.dark-mode .c{background:#1a1a2a;color:#e8e8f0}
body.dark-mode select,body.dark-mode input,body.dark-mode button{background:#2a2a3a!important;color:#e8e8f0!important}
body.dark-mode .h{border-bottom-color:#2a2a3a!important}
body.dark-mode .bg{background:#0f0f17!important;border-color:#2a2a3a!important}
body.dark-mode #ce{color:#5a9eff!important}
body.dark-mode .ac{color:#ffaa66!important}
body.dark-mode .fc{color:#66ffaa!important}
body.dark-mode .pt{color:#ff8888!important}
body.dark-mode #hs{color:#fff!important}
body.dark-mode #timer-row{background:#2a2f45!important}
body.dark-mode label{color:#e8e8f0!important}
body.dark-mode .b1{background:#1a6eaa!important;color:#fff!important;border:1px solid #3399cc!important}
body.dark-mode .b2{background:#aa3333!important;color:#fff!important;border:1px solid #cc5555!important}
body.dark-mode .b3{background:#1a77aa!important;color:#fff!important;border:1px solid #3399cc!important}
body.dark-mode .b4{background:#2a1515!important;border:1px solid #883333!important;color:#cc7777!important}
body.dark-mode .b5{background:#1a8899!important;color:#fff!important;border:1px solid #33aabb!important}
body.dark-mode .passbook-area{background:#1e2a44!important}
body.dark-mode .passbook-buttons button{background:#1a73e8!important}
body.dark-mode #ts{background:#006666!important;border:1px solid #008888!important}
body.dark-mode .copy-btn{background:#006666!important}
body.dark-mode .oc-btn{background:#2a1515!important;border:1px solid #883333!important;color:#cc7777!important}
body.dark-mode #ms, body.dark-mode #pb, body.dark-mode #cn,
body.dark-mode .rs, body.dark-mode .cs { border-color: #7ab8ff !important; }
body.dark-mode [style*="background: #f0f7ff"],
body.dark-mode [style*="background:#f0f7ff"],
body.dark-mode #ms { background-color: #2a2f45 !important; }
body.dark-mode #ms,
body.dark-mode #ce,
body.dark-mode #pob div { color: #5a9eff !important; }
</style>
<div class="c">
<div style="display: flex; gap: 6px; margin-bottom: 8px;">
<select id="ms" style="flex: 2; padding: 6px; font-size: 15px; border: 1px solid #7ab8ff; border-radius: 4px; font-weight: bold; background: #f0f7ff;">
<option value="returner" data-base="13118" data-bonus="0">リターナーモア</option>
<option selected="selected" value="durahan" data-base="22802" data-bonus="4561">デュラハーン</option>
<option value="hell" data-base="23990" data-bonus="4798">ヘルガーディアン</option>
<option value="scare" data-base="22904" data-bonus="4581">スケアフレイル</option>
<option value="dearthlicant" data-base="15191" data-bonus="0">ダースリカント</option>
<option value="golem_strong" data-base="20350" data-bonus="0">ゴーレム強</option>
</select>
<select id="pb" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #7ab8ff; border-radius: 4px;">
<option selected="selected" value="0">通帳なし</option>
<option value="5000000">通帳1(500万)</option>
<option value="10000000">通帳2(1000万)</option>
</select>
</div>
<div style="display: flex; gap: 4px; margin-bottom: 8px;">
<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f0f7ff; border: 1px solid #7ab8ff; border-radius: 6px; padding: 4px;"><span id="ce" style="font-size: 22px; font-weight: bold; color: #06c;">0</span> <span id="of" style="font-size: 9px; color: #999; margin-top: 2px; visibility: hidden;">溢れ:0</span></div>
<div id="pob" style="width: 46px; cursor: pointer; background: #f0f7ff; border: 1px solid #7ab8ff; border-radius: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
<div style="font-size: 8px; color: #06c;">最適</div>
<div style="font-size: 13px; font-weight: bold; color: #06c;">+1</div>
</div>
<div style="width: 60px;">
<div style="font-size: 7px; color: #666; text-align: center;">討伐数</div>
<select id="cn" style="width: 100%; padding: 2px; font-size: 18px; font-weight: bold; border: 1px solid #7ab8ff; border-radius: 4px; text-align: center;">
<option value="1">A</option><option value="2">B</option><option value="3">C</option><option value="4">D</option><option value="5">E</option>
<option value="6">F</option><option value="7">G</option><option value="8">H</option><option value="9">I</option><option value="10">J</option>
<option selected="selected" value="11">K</option><option value="12">L</option>
</select>
</div>
</div>
<div id="timer-row" style="padding: 6px 8px; margin-bottom: 8px; display: flex; gap: 6px;">
<div style="flex: 1; font-size: 12px; display: flex; flex-direction: column; align-items: flex-end; padding-right: 50px; justify-content: center;">
<div style="margin-bottom: 3px; display: flex; gap: 8px;"><label><input name="e_exp" type="radio" value="none" />無</label> <label><input checked="checked" name="e_exp" type="radio" value="genki" />元気</label> <label><input name="e_exp" type="radio" value="bakushin" />爆伸</label></div>
<div style="border-top: 1px solid #ddd; padding-top: 3px; width: 100%; display: flex; justify-content: flex-end; gap: 14px; font-size: 11px; align-items: center;"><button id="buffReset" class="oc-btn">OC</button>
<div style="display: flex; flex-direction: column; gap: 2px;"><label><input id="fd" checked="checked" type="checkbox" />料理</label> <label><input id="tr" type="checkbox" />修練</label></div>
<div style="display: flex; flex-direction: column; gap: 2px;"><label><input id="ag" type="checkbox" />エンゼル</label> <label><input id="em" type="checkbox" />皇帝</label></div>
</div>
</div>
<button id="ts" style="width: 72px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; padding: 2px;">タイマー<br />開始</button>
</div>
<div style="display: flex; gap: 6px; margin-bottom: 8px;">
<div class="bg" style="flex: 6; padding: 6px 8px; border-radius: 6px; text-align: center;">
<div><span style="font-size: 12px; font-weight: bold;">総獲得</span><span id="hs" style="font-size: 22px; font-weight: bold; font-family: 'Verdana',system-ui,sans-serif; font-variant-numeric: tabular-nums;">0</span></div>
<div id="penaltyRef" class="penalty-ref" style="display: none;"></div>
<div style="font-size: 11px; border-top: 1px solid #ddd; margin-top: 4px; padding-top: 4px;">
<div>平均:<strong id="at" class="ac" style="font-family: monospace; font-size: 22px; font-weight: bold;">--:--.--</strong></div>
</div>
</div>
<button id="calc" class="b1" style="flex: 4; font-size: 21px; border-radius: 6px;">加算</button>
</div>
<div class="bg" style="padding: 6px; border-radius: 6px; margin-bottom: 8px;">
<div style="display: flex; gap: 6px; margin-bottom: 6px; align-items: flex-start; justify-content: space-between;">
<div id="td" style="font-size: 28px; font-weight: bold;">00:00.00</div>
<div class="timer-right">
<div id="syncDisplay" class="sync-small"></div>
<div><span style="font-size: 10px;">LAP:</span><span id="ld" class="lap-normal">00:00.00</span></div>
</div>
</div>
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; margin-top: 4px;"><button id="ra" class="b4" style="padding: 7px; font-size: 11px;">AC</button> <button id="tsp" class="b2" style="padding: 7px; font-size: 11px;">停止</button> <button id="job" class="b5" style="padding: 7px; font-size: 11px;">転職</button> <button id="lp" class="b3" style="padding: 7px; font-size: 11px;">LAP</button></div>
</div>
<div style="display: flex; gap: 6px; margin-bottom: 6px; align-items: center;"><button id="copyHistory" class="copy-btn" style="flex: 3; white-space: nowrap;">履歴コピー</button>
<div id="estimatedReward" style="flex: 7; background: #f0f7ff; border-radius: 6px; padding: 3px 6px; text-align: center; font-size: 12px; display: flex; align-items: center; justify-content: center;">想定玉給:<span id="fc" class="fc" style="font-weight: bold; font-size: 13px; margin-left: 4px;">--</span></div>
</div>
<div id="passbookArea" class="passbook-area hidden" style="margin-bottom: 6px;">
<div class="passbook-info" style="font-size: 11px;">通帳:<strong id="te" class="pt" style="font-size: 13px;">0</strong>/<span id="plt" style="font-size: 13px;">0</span></div>
<div class="passbook-buttons"><button id="pr">リセット</button> <button id="ml">1Lv分引出</button></div>
</div>
<div id="rh" style="margin-top: 4px; max-height: 250px; overflow-y: auto; border-top: 1px solid #eee;"></div>
</div>
`;

            // イベントハンドラを設定（thisをバインド）
            const init = () => {
                // バインディング
                self.$ = (id) => document.getElementById(id);
                self.formatTime = ExpCalc.formatTime.bind(self);
                self.getRate = ExpCalc.getRate.bind(self);
                self.applyLimit = ExpCalc.applyLimit.bind(self);
                self.exp = ExpCalc.exp.bind(self);
                self.calcOpt = ExpCalc.calcOpt.bind(self);
                self.updateUI = ExpCalc.updateUI.bind(self);
                self.updateTotal = ExpCalc.updateTotal.bind(self);
                self.getPartnerOptions = ExpCalc.getPartnerOptions.bind(self);
                self.addRow = ExpCalc.addRow.bind(self);
                self.updateTimerDisplay = ExpCalc.updateTimerDisplay.bind(self);

                // 初期変数
                self.timer = null;
                self.startTime = 0;
                self.pauseSec = 0;
                self.lastLap = 0;
                self.jobOffset = 0;
                self.passbookOffset = 0;
                self.count = 0;
                self.optCount = 1;
                self.calcLockedUntil = 0;

                // イベントリスナー
                document.getElementById('calc').onclick = () => {
                    if (Date.now() < self.calcLockedUntil) return;
                    self.count++;
                    let now = self.timer ? (Date.now() - self.startTime) / 1000 : self.pauseSec;
                    let lap = self.timer ? (now - self.lastLap) : null;
                    let c = parseInt(self.$("cn").value);
                    let res = self.exp(c);
                    let pl = parseInt(self.$("pb").value) || 0;

                    if (pl > 0) {
                        if (res.angel > 0) self.addRow(self.count, c, res.angel, "angel", now, lap, false, res.angel, null, false);
                        let accRaw = 0;
                        document.querySelectorAll('.exp-row[data-type="pass"]').forEach(el => {
                            let r = parseFloat(el.dataset.rawValCapped);
                            if (!isNaN(r)) accRaw += r;
                        });
                        let remRaw = Math.max(0, pl - (accRaw - self.passbookOffset));
                        let rem = Math.ceil(remRaw);
                        if (rem >= res.common) self.addRow(self.count, c, res.common, "pass", now, lap, true, res.common, null, false);
                        else if (rem > 0) {
                            self.addRow(self.count, c, res.common - rem, "overflow", now, lap, false, res.common - rem, null, false);
                            self.addRow(self.count, c, rem, "pass", now, lap, true, rem, null, false);
                        } else self.addRow(self.count, c, res.common, "overflow", now, lap, true, res.common, null, false);
                    } else {
                        self.addRow(self.count, c, res.total, "normal", now, lap, true, res.total, null, false);
                    }
                    self.lastLap = now;
                    self.updateTimerDisplay(now);

                    self.calcLockedUntil = Date.now() + 3000;
                    let btn = self.$("calc");
                    btn.disabled = true;
                    btn.style.opacity = "0.5";
                    let cb = 3;
                    let iv = setInterval(() => {
                        cb--;
                        if (cb > 0) {
                            btn.textContent = `(${cb})`;
                        } else {
                            clearInterval(iv);
                            btn.disabled = false;
                            btn.style.opacity = "1";
                            btn.textContent = "加算";
                            self.updateUI();
                        }
                    }, 1000);
                };

                document.getElementById('ra').onclick = () => {
                    if (self.timer) { clearInterval(self.timer); self.timer = null; }
                    self.pauseSec = 0;
                    self.startTime = 0;
                    self.lastLap = 0;
                    self.count = 0;
                    self.jobOffset = 0;
                    self.passbookOffset = 0;
                    document.getElementById('rh').innerHTML = "";
                    self.updateTimerDisplay(0);
                    self.updateTotal();
                    self.updateUI();
                };

                document.getElementById('ml').onclick = () => {
                    let accRaw = 0;
                    document.querySelectorAll('.exp-row[data-type="pass"]').forEach(el => {
                        let r = parseFloat(el.dataset.rawValCapped);
                        if (!isNaN(r)) accRaw += r;
                    });
                    let bal = accRaw - self.passbookOffset;
                    if (bal <= 0) return;
                    let wd = Math.min(self.LV, bal);
                    self.passbookOffset += wd;
                    self.updateTotal();
                };

                document.getElementById('lp').onclick = () => {
                    let now = self.timer ? (Date.now() - self.startTime) / 1000 : self.pauseSec;
                    self.addRow("LAP", 0, 0, "lap_only", now, now - self.lastLap);
                    self.lastLap = now;
                    self.updateTimerDisplay(now);
                };

                document.getElementById('job').onclick = () => {
                    if (!self.timer && self.pauseSec === 0) return;
                    let now = self.timer ? (Date.now() - self.startTime) / 1000 : self.pauseSec;
                    self.jobOffset += 20;
                    if (self.jobOffset > now) self.jobOffset = now;
                    self.updateTimerDisplay(now);
                    if (self.timer) {
                        self.addRow("JOB", 0, 0, "job", now, now - self.lastLap);
                        self.lastLap = now;
                    }
                };

                document.getElementById('pob').onclick = () => {
                    self.$("cn").value = Math.min(12, self.optCount + 1);
                    self.updateUI(false);
                };

                document.getElementById('ts').onclick = () => {
                    if (!self.timer) {
                        self.startTime = Date.now() - self.pauseSec * 1000;
                        self.timer = setInterval(() => {
                            let now = (Date.now() - self.startTime) / 1000;
                            self.updateTimerDisplay(now);
                        }, 30);
                        self.calcLockedUntil = Math.max(self.calcLockedUntil, Date.now()) + 100;
                        self.$("calc").disabled = true;
                        self.$("calc").style.opacity = "0.5";
                        setTimeout(() => {
                            if (Date.now() >= self.calcLockedUntil) {
                                self.$("calc").disabled = false;
                                self.$("calc").style.opacity = "1";
                            }
                        }, 100);
                    }
                };

                document.getElementById('tsp').onclick = () => {
                    if (self.timer) {
                        clearInterval(self.timer);
                        self.timer = null;
                        self.pauseSec = (Date.now() - self.startTime) / 1000;
                        self.updateTimerDisplay(self.pauseSec);
                    }
                };

                document.getElementById('pr').onclick = () => {
                    let accRaw = 0;
                    document.querySelectorAll('.exp-row[data-type="pass"]').forEach(el => {
                        let r = parseFloat(el.dataset.rawValCapped);
                        if (!isNaN(r)) accRaw += r;
                    });
                    self.passbookOffset = Math.ceil(accRaw);
                    self.updateTotal();
                };

                document.getElementById('copyHistory').onclick = () => {
                    try {
                        let lines = [];
                        lines.push(`モンスター/${self.$("ms").options[self.$("ms").selectedIndex].text}`);
                        lines.push(`総獲得/平均タイム/想定玉給`);
                        lines.push(`${self.$("hs").textContent.replace(/,/g, '')}/${self.$("at").textContent}/${self.$("fc").textContent}`);
                        lines.push(``);
                        lines.push(`#/戦闘時間/獲得exp/呼び数/お供/種類`);

                        document.querySelectorAll(".exp-row").forEach(el => {
                            let type = el.dataset.type || "";
                            let bid = el.dataset.bid || "-";

                            if (type === "lap_only") {
                                lines.push(`${bid}/LAPMARK////`);
                                return;
                            }
                            if (type === "job") {
                                let time = self.formatTime(parseFloat(el.dataset.sec) || 0);
                                lines.push(`${bid}/${time}////転職`);
                                return;
                            }

                            let time = self.formatTime(parseFloat(el.dataset.sec) || 0);
                            let expVal = parseInt(el.dataset.val) || 0;
                            let exp = expVal.toLocaleString().replace(/,/g, '');
                            let count = parseInt(el.dataset.count);
                            let call = !isNaN(count) ? (self.L[count] || "--") : "--";
                            let partner = "お供無";
                            let rs = el.querySelector(".rs");
                            if (rs) partner = rs.options[rs.selectedIndex]?.text || "お供無";
                            let tname = type === "pass" ? "通帳" : type === "angel" ? "エンゼル" : type === "overflow" ? "溢れ" : "通常";

                            lines.push(`${bid}/${time}/${exp}/${call}/${partner}/${tname}`);
                        });

                        navigator.clipboard.writeText(lines.join("\n")).then(() => alert("履歴をコピーしました"));
                    } catch (e) { alert("コピー失敗"); }
                };

                document.getElementById('buffReset').onclick = () => {
                    self.$("fd").checked = true;
                    self.$("tr").checked = false;
                    self.$("ag").checked = false;
                    self.$("em").checked = false;
                    let gr = document.querySelector('input[name="e_exp"][value="genki"]');
                    if (gr) gr.checked = true;
                    self.$("pb").value = "0";
                    self.updateUI(true);
                };

                document.querySelectorAll('input[name="e_exp"], #fd, #tr, #ag, #em, #ms, #pb').forEach(el => {
                    el.onchange = () => self.updateUI(true);
                });
                document.getElementById('cn').onchange = () => self.updateUI(false);

                self.updateUI(true);
            };

            init();
        }
    };

    global.ExpCalculator = {
        render: ExpCalc.render.bind(ExpCalc)
    };
})(window);
