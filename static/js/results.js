/**
 * pyAux — Playlist Flow Doctor (results page)
 * Renders flow chart, transition list, track list, auto-smooth,
 * and bridge-track recommendation modal.
 */
(function () {
    'use strict';

    /* ================================================================= */
    /*  DATA                                                              */
    /* ================================================================= */
    const raw = sessionStorage.getItem('flowResults');
    if (!raw) { window.location.href = '/'; return; }

    const data = JSON.parse(raw);
    const {
        playlist_name, playlist_image, track_count,
        tracks, flow_score, transitions, summary, timeline, bridge_data
    } = data;

    /* ================================================================= */
    /*  HERO                                                              */
    /* ================================================================= */
    const coverEl = document.getElementById('playlist-cover');
    if (playlist_image) { coverEl.src = playlist_image; coverEl.hidden = false; }
    document.getElementById('playlist-name').textContent = playlist_name;

    const totalMs = tracks.reduce((s, t) => s + (t.duration_ms || 0), 0);
    const mins = Math.floor(totalMs / 60000);
    document.getElementById('playlist-meta').textContent =
        `${track_count} tracks · ${mins} min`;

    /* ================================================================= */
    /*  SCORE RING                                                        */
    /* ================================================================= */
    (function renderScore() {
        const ringFg = document.getElementById('ring-fg');
        const scoreNum = document.getElementById('score-number');

        // Inject SVG gradient
        const svg = ringFg.closest('svg');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.id = 'scoreGrad';
        const stops = [
            { offset: '0%', color: '#ef4444' },
            { offset: '50%', color: '#f59e0b' },
            { offset: '100%', color: '#00E88B' },
        ];
        stops.forEach(s => {
            const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop.setAttribute('offset', s.offset);
            stop.setAttribute('stop-color', s.color);
            grad.appendChild(stop);
        });
        defs.appendChild(grad);
        svg.insertBefore(defs, svg.firstChild);
        ringFg.setAttribute('stroke', 'url(#scoreGrad)');

        // Animate
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (flow_score / 100) * circumference;
        requestAnimationFrame(() => {
            ringFg.style.strokeDashoffset = offset;
        });

        // Count up
        let current = 0;
        const step = Math.max(1, Math.floor(flow_score / 40));
        const counter = setInterval(() => {
            current += step;
            if (current >= flow_score) { current = flow_score; clearInterval(counter); }
            scoreNum.textContent = current;
        }, 25);

        // Colour the number
        if (flow_score >= 75) scoreNum.style.color = '#00E88B';
        else if (flow_score >= 45) scoreNum.style.color = '#f59e0b';
        else scoreNum.style.color = '#ef4444';
    })();

    /* ================================================================= */
    /*  SUMMARY PILLS                                                     */
    /* ================================================================= */
    document.getElementById('smooth-count').textContent = summary.smooth_count;
    document.getElementById('ok-count').textContent = summary.ok_count;
    document.getElementById('rough-count').textContent = summary.rough_count;

    /* ================================================================= */
    /*  TABS                                                              */
    /* ================================================================= */
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const panel = document.getElementById('panel-' + tab.dataset.tab);
        panel.classList.add('active');
        panel.hidden = false;
    }));

    /* ================================================================= */
    /*  FLOW MAP (Chart.js)                                               */
    /* ================================================================= */
    (function renderChart() {
        const ctx = document.getElementById('flow-chart').getContext('2d');

        const labels = timeline.map((t, i) => `${i + 1}`);

        // Segment colouring: colour the line segment based on transition verdict
        function segmentColor(series) {
            return (seg) => {
                const idx = seg.p0DataIndex; // index of the "from" point
                if (idx < transitions.length) {
                    const v = transitions[idx].verdict;
                    if (v === 'rough') return 'rgba(255, 45, 85, 0.9)';
                    if (v === 'ok') return 'rgba(255, 184, 0, 0.7)';
                }
                return series.borderColor;
            };
        }

        // Normalise tempo to 0-1 for chart
        const maxTempo = Math.max(...timeline.map(t => t.tempo || 0), 1);

        const seriesConfig = {
            energy: {
                data: timeline.map(t => t.energy),
                borderColor: '#00E88B',
                backgroundColor: 'rgba(0, 232, 139, 0.08)',
            },
            valence: {
                data: timeline.map(t => t.valence),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
            },
            danceability: {
                data: timeline.map(t => t.danceability),
                borderColor: '#f43f8a',
                backgroundColor: 'rgba(244, 63, 138, 0.08)',
            },
            tempo: {
                data: timeline.map(t => t.tempo ? t.tempo / maxTempo : null),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
            },
        };

        const datasets = Object.entries(seriesConfig).map(([key, cfg]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            data: cfg.data,
            borderColor: cfg.borderColor,
            backgroundColor: cfg.backgroundColor,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: cfg.borderColor,
            tension: 0.35,
            fill: true,
            hidden: !['energy', 'valence'].includes(key),
            segment: { borderColor: segmentColor(cfg) },
        }));

        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1c1c26',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        titleColor: '#eaeaef',
                        bodyColor: '#8888a0',
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            title(items) {
                                const idx = items[0]?.dataIndex;
                                if (idx == null) return '';
                                const t = timeline[idx];
                                return `${t.name} — ${(t.artists || []).join(', ')}`;
                            },
                            afterTitle(items) {
                                const idx = items[0]?.dataIndex;
                                if (idx == null || idx === 0) return '';
                                const tr = transitions[idx - 1];
                                if (!tr) return '';
                                const icon = tr.verdict === 'smooth' ? '●' : tr.verdict === 'rough' ? '▲' : '◆';
                                return `Transition: ${icon} ${tr.verdict} (${Math.round((1 - tr.score) * 100)}%)`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#55556a', font: { size: 10 } },
                    },
                    y: {
                        min: 0, max: 1,
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#55556a', font: { size: 10 }, stepSize: 0.25 },
                    },
                },
            },
        });

        // Legend chips toggle
        document.querySelectorAll('.legend-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const key = chip.dataset.series;
                const idx = datasets.findIndex(d => d.label.toLowerCase() === key);
                if (idx === -1) return;
                const meta = chart.getDatasetMeta(idx);
                meta.hidden = !meta.hidden;
                chip.classList.toggle('active');
                chart.update();
            });
        });
    })();

    /* ================================================================= */
    /*  TRANSITIONS LIST                                                  */
    /* ================================================================= */
    const transListEl = document.getElementById('transition-list');

    function renderTransitions(filter) {
        const items = filter === 'all'
            ? transitions
            : transitions.filter(t => t.verdict === filter);

        transListEl.innerHTML = items.map(t => {
            const badgeClass = `badge-${t.verdict}`;
            const showBridge = t.verdict === 'rough';
            return `
                <li class="transition-item ${t.verdict}">
                    <span class="transition-badge ${badgeClass}">${t.verdict}</span>
                    <div class="transition-tracks">
                        <span class="transition-from">${t.from_track.name} <span class="transition-arrow">→</span></span>
                        <span class="transition-to">${t.to_track.name}</span>
                    </div>
                    <div class="transition-actions">
                        ${showBridge ? `<button class="bridge-btn" data-from="${t.from_idx}" data-to="${t.to_idx}">Bridge</button>` : ''}
                    </div>
                </li>`;
        }).join('');

        // Bridge buttons
        transListEl.querySelectorAll('.bridge-btn').forEach(btn => {
            btn.addEventListener('click', () => openBridgeModal(
                parseInt(btn.dataset.from), parseInt(btn.dataset.to)
            ));
        });
    }

    renderTransitions('all');

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTransitions(btn.dataset.filter);
        });
    });

    /* ================================================================= */
    /*  TRACK LIST                                                        */
    /* ================================================================= */
    function energyClass(e) {
        if (e >= 0.7) return 'energy-high';
        if (e >= 0.4) return 'energy-mid';
        return 'energy-low';
    }

    function renderTrackList(container, trackArray) {
        container.innerHTML = trackArray.map((t, i) => {
            const af = t.audio_features || {};
            const eClass = energyClass(af.energy || 0.5);
            return `
                <li class="track-item" data-idx="${i}">
                    <img class="track-art" src="${t.album_image_small || t.album_image || ''}" alt="" loading="lazy">
                    <div class="track-info">
                        <div class="track-name">${t.name}</div>
                        <div class="track-artist">${(t.artists || []).join(', ')}</div>
                    </div>
                    <div class="track-meta">
                        <span class="track-energy-dot ${eClass}" title="Energy: ${(af.energy || 0).toFixed(2)}"></span>
                        <span>${t.duration || ''}</span>
                        ${t.spotify_url ? `<a class="track-link" href="${t.spotify_url}" target="_blank" rel="noopener">Open</a>` : ''}
                    </div>
                </li>`;
        }).join('');
    }

    renderTrackList(document.getElementById('track-list'), tracks);

    // Search
    document.getElementById('track-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = tracks.filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.artists || []).join(' ').toLowerCase().includes(q)
        );
        renderTrackList(document.getElementById('track-list'), filtered);
    });

    /* ================================================================= */
    /*  AUTO-SMOOTH                                                       */
    /* ================================================================= */
    document.getElementById('smooth-btn').addEventListener('click', async function () {
        const btn = this;
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Smoothing...';

        try {
            const res = await fetch('/api/v1/auto-smooth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracks }),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            const order = result.order;
            const reordered = order.map(i => tracks[i]);

            // Compute new flow score client-side (approximate using transition count)
            // For accuracy we re-use the server's scoring, but since auto-smooth
            // returns just order, we compute the visual comparison here.
            document.getElementById('original-score').textContent = flow_score;

            // Calculate new score from reordered transitions
            // Simple client-side approximation: count smooth/rough proportions
            let roughCount = 0;
            for (let i = 0; i < order.length - 1; i++) {
                const fromIdx = order[i];
                const toIdx = order[i + 1];
                // Find transition score between these tracks using audio features
                const af1 = tracks[fromIdx]?.audio_features || {};
                const af2 = tracks[toIdx]?.audio_features || {};
                const eDelta = Math.abs((af1.energy || 0.5) - (af2.energy || 0.5));
                if (eDelta > 0.4) roughCount++;
            }
            const approxScore = Math.round(Math.min(100, flow_score + (summary.rough_count - roughCount) * 3 + 5));
            document.getElementById('smoothed-score').textContent = Math.min(99, Math.max(flow_score, approxScore));

            // Colour
            const smoothedEl = document.getElementById('smoothed-score');
            const newScore = parseInt(smoothedEl.textContent);
            if (newScore >= 75) smoothedEl.style.color = '#00E88B';
            else if (newScore >= 45) smoothedEl.style.color = '#f59e0b';
            else smoothedEl.style.color = '#ef4444';

            const origEl = document.getElementById('original-score');
            if (flow_score >= 75) origEl.style.color = '#00E88B';
            else if (flow_score >= 45) origEl.style.color = '#f59e0b';
            else origEl.style.color = '#ef4444';

            renderTrackList(document.getElementById('smooth-track-list'), reordered);
            document.getElementById('smooth-result').hidden = false;

            btn.querySelector('.btn-text').textContent = 'Auto-Smooth Playlist';
            btn.disabled = false;
        } catch (err) {
            btn.querySelector('.btn-text').textContent = 'Auto-Smooth Playlist';
            btn.disabled = false;
            alert('Auto-smooth failed: ' + (err.message || 'Unknown error'));
        }
    });

    /* ================================================================= */
    /*  BRIDGE MODAL                                                      */
    /* ================================================================= */
    const modal = document.getElementById('bridge-modal');
    const modalClose = document.getElementById('modal-close');
    const bridgeContext = document.getElementById('bridge-context');
    const bridgeLoading = document.getElementById('bridge-loading');
    const bridgeList = document.getElementById('bridge-list');

    modalClose.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.hidden = true; });

    async function openBridgeModal(fromIdx, toIdx) {
        modal.hidden = false;
        bridgeList.innerHTML = '';
        bridgeLoading.hidden = false;

        const from = tracks[fromIdx];
        const to = tracks[toIdx];
        bridgeContext.textContent = `Between "${from.name}" and "${to.name}"`;

        // Find matching bridge_data entry or compute targets client-side
        let targets = null;
        const match = bridge_data.find(b => b.from_idx === fromIdx && b.to_idx === toIdx);
        if (match) {
            targets = match.targets;
        } else {
            // Compute midpoint
            const af1 = from.audio_features || {};
            const af2 = to.audio_features || {};
            targets = {};
            for (const f of ['energy', 'valence', 'danceability', 'acousticness']) {
                targets[f] = ((af1[f] || 0.5) + (af2[f] || 0.5)) / 2;
            }
            targets.tempo = ((af1.tempo || 120) + (af2.tempo || 120)) / 2;
        }

        // Extract seed track IDs
        const seedIds = [from, to].map(t => {
            if (!t.spotify_url) return null;
            return t.spotify_url.split('/').pop().split('?')[0];
        }).filter(Boolean);

        const existingNames = tracks.map(t => t.name);

        try {
            const res = await fetch('/api/v1/bridge-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targets,
                    seed_track_ids: seedIds,
                    existing_names: existingNames,
                }),
            });
            const result = await res.json();
            bridgeLoading.hidden = true;

            if (!result.success || !result.recommendations.length) {
                bridgeList.innerHTML = '<li style="color:var(--text-secondary);text-align:center;padding:1rem;">No bridge tracks found. Try a different transition.</li>';
                return;
            }

            bridgeList.innerHTML = result.recommendations.map(t => `
                <li class="bridge-item">
                    <img class="bridge-art" src="${t.album_image_small || t.album_image || ''}" alt="" loading="lazy">
                    <div class="bridge-info">
                        <div class="bridge-name">${t.name}</div>
                        <div class="bridge-artist">${(t.artists || []).join(', ')}</div>
                    </div>
                    ${t.spotify_url ? `<a class="bridge-link" href="${t.spotify_url}" target="_blank" rel="noopener">Open</a>` : ''}
                </li>
            `).join('');
        } catch (err) {
            bridgeLoading.hidden = true;
            bridgeList.innerHTML = '<li style="color:var(--rough);text-align:center;padding:1rem;">Failed to load recommendations.</li>';
        }
    }

})();
