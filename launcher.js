<div id="dqx-app"></div>

<script src="https://cdn.jsdelivr.net/gh/yuffy-1111/dqx-event-data@main/launcher.js?v=1"></script>

<script>
window.addEventListener('load', function() {
    DQXTools.register('daily-checker', {
        name: '📋 DQX日課チェッカー',
        url: 'https://cdn.jsdelivr.net/gh/yuffy-1111/dqx-event-data@main/tools/dqx-checker.js?v=1',
        renderFn: 'DQXDailyChecker.render'
    });
    DQXTools.init('dqx-app');
});
</script>
