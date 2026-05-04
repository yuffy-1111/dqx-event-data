window.DQXDailyChecker = {
    render: function(el) {
        const container = document.querySelector(el);
        container.innerHTML = `
            <div style="padding:16px;">
                <h2>DQX日課チェッカー</h2>
                <p>読み込み成功 👍</p>
            </div>
        `;
    }
};
