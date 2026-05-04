// tools/exp-calculator.js（簡易版）
(function(global) {
    global.ExpCalculator = {
        render: function(selector) {
            const container = document.querySelector(selector);
            // 元のHTMLをそのまま流し込む
            fetch('./tools/exp-calculator-standalone.html')
                .then(res => res.text())
                .then(html => container.innerHTML = html);
        }
    };
})(window);
