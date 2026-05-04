(function(global) {
    global.TestTool = {
        render: function(selector) {
            document.querySelector(selector).innerHTML = '<h1>成功しました！</h1><p>ツールは正しく読み込めています。</p>';
        }
    };
})(window);
