/* ============================================================
   HOLLOW FROST — LEVEL PROGRESSION BRIDGE
   Runs inside game.html and talks to index.html with postMessage.
   ============================================================ */

(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var level = Number.parseInt(params.get('level') || '1', 10);
    if (!Number.isFinite(level) || level < 1) level = 1;

    var STORAGE_KEY = 'hollow_frost_unlocked_level';
    var reported = false;

    function readUnlocked() {
        try {
            var value = Number.parseInt(localStorage.getItem(STORAGE_KEY) || '1', 10);
            return Number.isFinite(value) && value >= 1 ? value : 1;
        } catch (error) {
            return 1;
        }
    }

    function writeUnlocked(value) {
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
        } catch (error) {
            console.warn('Could not save Hollow Frost progression.', error);
        }
    }

    function reportCompletion() {
        if (reported) return;
        reported = true;

        var nextLevel = level + 1;
        var unlocked = Math.max(readUnlocked(), nextLevel);
        writeUnlocked(unlocked);

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'hollow-frost-level-complete',
                level: level,
                nextLevel: nextLevel,
                unlockedLevel: unlocked
            }, window.location.origin);
        }
    }

    function checkCompletion() {
        var title = document.getElementById('titleText');
        if (!title) return;

        /* game.js currently uses this title when the treasure is reached. */
        if (title.textContent.trim() === 'Next level coming soon') {
            reportCompletion();
        }
    }

    /* Start/restart a level without navigating away from the preloaded game iframe. */
    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'hollow-frost-start-level') {
            var requested = Number.parseInt(event.data.level, 10);
            if (requested !== level) return;

            var startButton = document.getElementById('startBtn');
            if (startButton && !startButton.classList.contains('hidden')) {
                startButton.click();
            }
        }
    });

    var observer = new MutationObserver(checkCompletion);
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true
    });

    window.addEventListener('load', checkCompletion);
    setInterval(checkCompletion, 250);
})();
