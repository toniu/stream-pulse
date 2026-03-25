/**
 * pyAux — Playlist Flow Doctor (index page)
 * Handles URL validation, form submission, loading states.
 */
(function () {
    'use strict';

    const PLAYLIST_RE = /^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9_-]+(\?si=[a-zA-Z0-9_-]+)?$/;

    const input     = document.getElementById('main-input');
    const btn       = document.getElementById('analyse-btn');
    const hint      = document.getElementById('input-hint');
    const errorEl   = document.getElementById('input-error');
    const overlay   = document.getElementById('loading-overlay');
    const loaderTxt = document.getElementById('loader-text');
    const fill      = document.getElementById('progress-fill');

    /* ---------- Validation ---------- */
    input.addEventListener('input', () => {
        const v = input.value.trim();
        errorEl.hidden = true;
        if (!v) {
            input.classList.remove('valid', 'invalid');
            btn.disabled = true;
            return;
        }
        if (PLAYLIST_RE.test(v)) {
            input.classList.add('valid');
            input.classList.remove('invalid');
            btn.disabled = false;
        } else {
            input.classList.add('invalid');
            input.classList.remove('valid');
            btn.disabled = true;
        }
    });

    /* ---------- Submit ---------- */
    btn.addEventListener('click', analyse);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !btn.disabled) analyse();
    });

    const STAGES = [
        'Fetching tracks…',
        'Reading audio features…',
        'Scoring transitions…',
        'Detecting rough spots…',
        'Computing flow score…',
        'Almost there…',
    ];

    async function analyse() {
        const url = input.value.trim();
        if (!PLAYLIST_RE.test(url)) return;

        btn.disabled = true;
        overlay.hidden = false;

        // --- smooth continuous progress ---
        let progress = 0;
        let stage = 0;
        const target = 88;              // max before response arrives
        fill.style.transition = 'none';
        fill.style.width = '0%';
        // force reflow so the 0% applies before we re-enable transition
        void fill.offsetWidth;
        fill.style.transition = 'width .4s ease';
        loaderTxt.textContent = STAGES[0];

        // tick every 120ms — fast enough to feel alive
        const tick = setInterval(() => {
            // ease-out: slows down as it nears target
            const remaining = target - progress;
            progress += remaining * 0.035;
            fill.style.width = `${Math.min(progress, target)}%`;

            // cycle stages based on progress
            const nextStage = Math.min(
                STAGES.length - 1,
                Math.floor((progress / target) * STAGES.length)
            );
            if (nextStage !== stage) {
                stage = nextStage;
                loaderTxt.textContent = STAGES[stage];
            }
        }, 120);

        try {
            const res = await fetch('/api/v1/analyze-flow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playlist_url: url }),
            });

            clearInterval(tick);
            fill.style.width = '100%';
            loaderTxt.textContent = 'Done!';

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || data.error || 'Analysis failed');
            }

            sessionStorage.setItem('flowResults', JSON.stringify(data));
            window.location.href = '/results';

        } catch (err) {
            clearInterval(tick);
            overlay.hidden = true;
            btn.disabled = false;
            errorEl.textContent = err.message || 'Something went wrong. Please try again.';
            errorEl.hidden = false;
        }
    }
})();
