// Ensure AUDIO_TRACKS is available from implementation.js
var GLOBAL_AUDIO_TRACKS = typeof AUDIO_TRACKS !== 'undefined' ? AUDIO_TRACKS : [];

/** Load a given track index into a player element. Plays intro first if available. */
function loadTrackForPlayerElement(playerEl, trackIndex, autoplay) {
    if (!playerEl) return;
    const audio = playerEl.querySelector('audio');
    if (!audio) return;
    const idx = trackIndex % (GLOBAL_AUDIO_TRACKS.length || 1);
    playerEl.setAttribute('data-player-num', idx);
    playerEl._currentTrackIndex = idx;
    const track = GLOBAL_AUDIO_TRACKS[idx] || null;
    playerEl._playingIntro = false;
    if (track && track.audio_intro && track.audio_intro.trim() !== '') {
        playerEl._playingIntro = true;
        audio.src = track.audio_intro;
    } else if (track) {
        audio.src = track.audio;
    }
    // update displayed info to main track info (intro not shown separately)
    if (track) updatePlayerTrackInfo(playerEl, track);
    const playBtn = playerEl.querySelector('.control-btn[data-control="play-pause"]');
    if (autoplay) {
        audio.currentTime = 0;
        audio.play().then(() => {
            if (playBtn) playBtn.innerHTML = '<span class="material-icons">pause</span>';
        }).catch(() => {
            if (playBtn) playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
        });
    } else {
        if (playBtn) playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    }
}

function initPlayers() {
    document.querySelectorAll('.custom-player').forEach(function(playerEl) {
        // ensure an audio element exists
        let audio = playerEl.querySelector('audio');
        if (!audio) {
            audio = document.createElement('audio');
            playerEl.appendChild(audio);
        }
        const playerNumAttr = parseInt(playerEl.getAttribute('data-player-num') || '0', 10);
        // if the player has a player-data-num mapping, respect it; else use data-player-num
        let idx = playerNumAttr;
        if (playerEl.hasAttribute('player-data-num')) {
            idx = parseInt(playerEl.getAttribute('player-data-num'), 10) || idx;
            playerEl.setAttribute('data-player-num', idx);
        }
        // determine autoplay flag from attribute
        const autoplayFlag = (playerEl.getAttribute('data-autoplay') === 'true');
        // load initial track for this player-num (handles intro)
        if (GLOBAL_AUDIO_TRACKS.length > 0) {
            loadTrackForPlayerElement(playerEl, idx, autoplayFlag);
        }

        // If there's only one (or zero) track available, hide the "next" button
        if ((GLOBAL_AUDIO_TRACKS.length || 0) <= 1) {
            playerEl.querySelectorAll('.control-btn[data-control="next"]').forEach(function(btn) {
                btn.style.display = 'none';
            });
        }

        // bind controls
        playerEl.querySelectorAll('.control-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                const control = btn.getAttribute('data-control');
                if (control === 'play-pause') {
                    if (audio.paused) { audio.play(); btn.innerHTML = '<span class="material-icons">pause</span>'; }
                    else { audio.pause(); btn.innerHTML = '<span class="material-icons">play_arrow</span>'; }
                } else if (control === 'restart') {
                    // Restart should play the intro (if present) then the main loop
                    try {
                        const currentIndex = parseInt(playerEl.getAttribute('data-player-num') || playerEl._currentTrackIndex || '0', 10);
                        if (GLOBAL_AUDIO_TRACKS.length > 0) {
                            loadTrackForPlayerElement(playerEl, currentIndex, true);
                        } else {
                            audio.currentTime = 0; // fallback
                        }
                    } catch (e) {
                        audio.currentTime = 0;
                    }
                } else if (control === 'next') {
                    // advance data-player-num on the element
                    let current = parseInt(playerEl.getAttribute('data-player-num') || '0', 10);
                    if (GLOBAL_AUDIO_TRACKS.length === 0) return;
                    current = (current + 1) % GLOBAL_AUDIO_TRACKS.length;
                    // load and autoplay the next track (intro handled inside)
                    loadTrackForPlayerElement(playerEl, current, true);
                }
            });
        });

        // progress update
        audio.addEventListener('timeupdate', function() {
            const timeDisplay = playerEl.querySelector('.time-display');
            if (timeDisplay) {
                const sec = Math.floor(audio.currentTime % 60).toString().padStart(2,'0');
                const min = Math.floor(audio.currentTime/60);
                timeDisplay.textContent = `${min}:${sec}`;
            }
            const progress = playerEl.querySelector('.progress');
            if (progress && audio.duration) {
                const pct = (audio.currentTime / audio.duration) * 100;
                progress.style.width = `${pct}%`;
            }
        });

        // enable click-to-seek on progress bar
        (function() {
            const progressBar = playerEl.querySelector('.progress-bar');
            if (!progressBar) return;
            const seek = (clientX) => {
                if (!audio.duration || isNaN(audio.duration) || audio.duration === Infinity) return;
                const rect = progressBar.getBoundingClientRect();
                const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                audio.currentTime = x * audio.duration;
            };
            progressBar.addEventListener('click', function(ev) {
                seek(ev.clientX);
            });
            // support touch
            progressBar.addEventListener('touchstart', function(ev) {
                if (ev.touches && ev.touches[0]) seek(ev.touches[0].clientX);
            }, {passive: true});
        })();

        audio.addEventListener('ended', function() {
            try {
                // If we were playing an intro, switch to main track and play
                if (playerEl._playingIntro) {
                    playerEl._playingIntro = false;
                    const mainTrack = GLOBAL_AUDIO_TRACKS[playerEl._currentTrackIndex % GLOBAL_AUDIO_TRACKS.length];
                    if (mainTrack && mainTrack.audio) {
                        audio.src = mainTrack.audio;
                        audio.currentTime = 0;
                        audio.play().catch(()=>{});
                        updatePlayerTrackInfo(playerEl, mainTrack);
                    }
                } else {
                    // Finished main track: loop it
                    audio.currentTime = 0;
                    audio.play().catch(()=>{});
                }
                // update UI to show pause state
                const playBtn = playerEl.querySelector('.control-btn[data-control="play-pause"]');
                if (playBtn) playBtn.innerHTML = '<span class="material-icons">pause</span>';
            } catch (e) {}
        });

        // ensure the audio element does not rely on native loop (handled above)
        audio.loop = false;

    });
}

function updatePlayerTrackInfo(playerEl, track) {
    try {
        const title = playerEl.querySelector('.track-title');
        const artist = playerEl.querySelector('.track-artist');
        if (title) title.textContent = track.title || '';
        if (artist) artist.textContent = track.artist || '';
    } catch (e) {}
}

// initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayers);
} else {
    initPlayers();
}

