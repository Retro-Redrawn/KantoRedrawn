class AudioPlayer {
    updateTrackInfo() {
        this.trackTitleElement.textContent = this.trackTitle;
        this.trackArtistElement.textContent = this.trackArtist;
        
        // Get elements within this player's container
        const trackInfo = this.element.querySelector('.track-info');
        const container = this.element.querySelector('.track-info-container');
        
        // Wait for next frame to ensure text width is calculated
        requestAnimationFrame(() => {
            // Force reflow to ensure accurate measurements
            void trackInfo.offsetWidth;
            
            // Check if content needs to scroll
            const contentWidth = trackInfo.offsetWidth;
            const containerWidth = container.offsetWidth;
            
            if (contentWidth > containerWidth) {
                trackInfo.classList.add('scrolling');
            } else {
                trackInfo.classList.remove('scrolling');
            }
        });
    }

    constructor(element) {
        if (!element) throw new Error('Player element is required');
        
        this.element = element;
    // Defer creating AudioContext until user gesture to avoid autoplay warnings
    this.audioContext = null;
    this.gainNode = null;

    // Buffers may be fetched before an AudioContext exists; keep raw ArrayBuffers
    this._loopArrayBuffer = null;
    this._introArrayBuffer = null;
        
        this.introBuffer = null;
        this.loopBuffer = null;
        this.currentSource = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isIntroPlaying = false;
        
        // Get player number from HTML data attribute, default to 0 if not specified
        this.playerNum = parseInt(element.dataset.playerNum || '0', 10);
        
        // Get elements within this player's container
        this.playPauseBtn = element.querySelector('.control-btn[data-control="play-pause"]');
        this.restartBtn = element.querySelector('.control-btn[data-control="restart"]');
        this.progressBar = element.querySelector('.progress');
        this.timeDisplay = element.querySelector('.time-display');
        this.progressContainer = element.querySelector('.progress-bar');
        this.trackTitleElement = element.querySelector('.track-title');
        this.trackArtistElement = element.querySelector('.track-artist');
        
        // Track information
        this.trackTitle = AUDIO_TRACKS[this.playerNum].title;
        this.trackArtist = AUDIO_TRACKS[this.playerNum].artist;
        
        this.setupEventListeners();
        // Start loading audio bytes (fetch) but decoding will wait for an AudioContext
        this.loadAudio();
        this.updateTrackInfo();
    }
    
    async loadAudio() {
        try {
            // Always load the main loop audio
            const loopResponse = await fetch(AUDIO_TRACKS[this.playerNum].audio);
            const loopArrayBuffer = await loopResponse.arrayBuffer();
            // Try to pre-decode using OfflineAudioContext to avoid decode latency when play is pressed
            var decoded = false;
            try {
                const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                if (OfflineCtx) {
                    // create a very small offline context; decodeAudioData will return an AudioBuffer
                    const offline = new OfflineCtx(1, 1, 44100);
                    try {
                        this.loopBuffer = await offline.decodeAudioData(loopArrayBuffer.slice(0));
                        decoded = true;
                    } catch (e) {
                        // decode failed on OfflineAudioContext; fall through to store raw buffer
                        decoded = false;
                    }
                }
            } catch (e) {
                decoded = false;
            }

            if (!decoded) {
                // store raw buffer; decode later when AudioContext exists
                this._loopArrayBuffer = loopArrayBuffer;
            }
            
            // Try to load intro if it exists
            if (AUDIO_TRACKS[this.playerNum].audio_intro) {
                try {
                    const introResponse = await fetch(AUDIO_TRACKS[this.playerNum].audio_intro);
                    const introArrayBuffer = await introResponse.arrayBuffer();
                    // Try decoding intro via OfflineAudioContext as well
                    var introDecoded = false;
                    try {
                        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
                        if (OfflineCtx && !this.introBuffer) {
                            const offline = new OfflineCtx(1, 1, 44100);
                            try {
                                this.introBuffer = await offline.decodeAudioData(introArrayBuffer.slice(0));
                                introDecoded = true;
                            } catch (e) { introDecoded = false; }
                        }
                    } catch (e) { introDecoded = false; }

                    if (!introDecoded) {
                        this._introArrayBuffer = introArrayBuffer;
                    }
                } catch (introError) {
                    console.log('No intro audio available, using loop only');
                    this.introBuffer = null;
                }
            }
            
            // Only auto-play if data-autoplay is true
                    if (this.element.dataset.autoplay === 'true') {
                // Mark desire to autoplay. Try to start immediately; if blocked by
                // browser autoplay policies, fall back to the overlay/first-gesture flow.
                this._wantAutoplay = true;
                try {
                    // Attempt to ready and play right away. If this is blocked, the
                    // promise will reject and we will silently keep _wantAutoplay=true
                    this.ensureAudioReady().then(() => {
                        // Only attempt play if still wanted
                        if (this._wantAutoplay) {
                            this.play().catch(() => {});
                        }
                    }).catch(() => {});
                } catch (e) {
                    // ignore - will show overlay later
                }
            }
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }

    // Create AudioContext and decode any fetched buffers. Returns a promise that
    // resolves when ready to play.
    async ensureAudioReady() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error('Unable to create AudioContext:', e);
                throw e;
            }
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        }

        // Decode stored ArrayBuffers if we haven't decoded yet
        try {
            if (!this.loopBuffer && this._loopArrayBuffer) {
                this.loopBuffer = await this.audioContext.decodeAudioData(this._loopArrayBuffer.slice(0));
                // free raw buffer
                this._loopArrayBuffer = null;
            }
            if (!this.introBuffer && this._introArrayBuffer) {
                try {
                    this.introBuffer = await this.audioContext.decodeAudioData(this._introArrayBuffer.slice(0));
                } catch (e) {
                    // If decode fails, ignore intro
                    console.warn('Failed to decode intro buffer', e);
                    this.introBuffer = null;
                }
                this._introArrayBuffer = null;
            }
        } catch (e) {
            console.error('Error decoding audio buffers:', e);
            throw e;
        }

        // If autoplay was desired (dataset.autoplay) and user just created/resumed context,
        // attempt to play now
        if (this._wantAutoplay) {
            this._wantAutoplay = false;
            try { await this.play(); } catch (e) { /* ignore play errors */ }
        }
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.restartBtn.addEventListener('click', () => this.restart());
        
        this.progressContainer.addEventListener('click', (e) => {
            const rect = this.progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.seek(pos);
        });
        
        // Update progress bar
        setInterval(() => this.updateProgress(), 50);
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            // ensureAudioReady may be async; call and ignore returned promise here
            this.play().catch(e => {});
        }
    }

    async play() {
        // Ensure AudioContext exists and buffers decoded
        try {
            await this.ensureAudioReady();
        } catch (e) {
            console.error('Audio cannot be started:', e);
            return;
        }

        // resume if suspended
        try { if (this.audioContext.state === 'suspended') await this.audioContext.resume(); } catch(e) {}

        // Pause any other players
        try { this.pauseAllOthers(); } catch (e) {}

        const offset = this.pauseTime;
        const currentBuffer = this.isIntroPlaying ? this.introBuffer : this.loopBuffer;
        
        // Ensure offset is within valid range
        if (offset >= (currentBuffer?.duration || 0)) {
            this.pauseTime = 0;
        }
        
        // If we have an intro and we're either playing it or starting fresh
        if (this.introBuffer && (this.isIntroPlaying || this.pauseTime === 0)) {
            this.playIntro(this.isIntroPlaying ? this.pauseTime : 0);
        } else {
            // No intro or continuing with loop
            this.playLoop(this.pauseTime);
        }
        
        this.startTime = this.audioContext.currentTime - this.pauseTime;
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<span class="material-icons">pause</span>';
    }
    
    stopCurrentSource() {
        if (this.currentSource) {
            try {
                this.currentSource.onended = null; // Remove the event listener
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) {
                // Ignore errors if source was already stopped
            }
            this.currentSource = null;
        }
    }

    playIntro(offset = 0) {
        this.stopCurrentSource();
        
        // If seeking very close to the end, just skip to loop
        if (offset >= this.introBuffer.duration - 0.1) {
            this.isIntroPlaying = false;
            this.startTime = this.audioContext.currentTime;
            this.pauseTime = 0;
            this.playLoop(0);
            return;
        }

        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = this.introBuffer;
        this.currentSource.connect(this.gainNode);
        
        this.isIntroPlaying = true;
        this.currentSource.start(0, offset);
        
        // When intro ends, start the loop
        this.currentSource.onended = () => {
            if (this.isPlaying) {  // Only transition if still playing
                this.stopCurrentSource(); // Clean up before starting loop
                this.isIntroPlaying = false;
                this.startTime = this.audioContext.currentTime; // Reset time for loop
                this.pauseTime = 0;
                this.playLoop(0);
            }
        };
    }
    
    playLoop(offset = 0) {
        this.stopCurrentSource();
        
        // If seeking very close to the end, wrap to beginning
        offset = offset % this.loopBuffer.duration;
        
        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = this.loopBuffer;
        this.currentSource.loop = true;
        this.currentSource.connect(this.gainNode);
        
        this.currentSource.start(0, offset);
    }
    
    pause() {
        if (this.currentSource) {
            const currentTime = this.audioContext.currentTime - this.startTime;
            const currentBuffer = this.isIntroPlaying ? this.introBuffer : this.loopBuffer;
            
            // Calculate correct pause time within the current buffer
            this.pauseTime = currentTime % currentBuffer.duration;
            
            this.stopCurrentSource();
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
        }
    }

    // Pause all other players on the page when this one starts
    pauseAllOthers() {
        if (!window.audioPlayers) return;
        for (const p of window.audioPlayers) {
            try {
                if (p !== this && p.isPlaying) {
                    p.pause();
                }
            } catch (e) {}
        }
    }
    
    restart() {
        this.pauseTime = 0;
        this.isIntroPlaying = false;
        this.play();
    }
    
    seek(pos) {
        const currentBuffer = this.isIntroPlaying ? this.introBuffer : this.loopBuffer;
        // Calculate pause time based on the current section's duration
        this.pauseTime = pos * currentBuffer.duration;
        
        if (this.isIntroPlaying && this.introBuffer && this.pauseTime >= this.introBuffer.duration) {
            // If we're in intro and seek past it, switch to loop
            this.isIntroPlaying = false;
            this.pauseTime = 0;
        }
        
        if (this.isPlaying) {
            this.play();
        } else {
            // Update visuals even when paused
            this.updateProgressVisuals(this.pauseTime);
        }
    }
    
    updateProgressVisuals(time) {
        const currentBuffer = this.isIntroPlaying ? this.introBuffer : this.loopBuffer;
        if (!currentBuffer) return;
        
        // Show progress relative to current section only
        const progress = (time / currentBuffer.duration) * 100;
        this.progressBar.style.width = `${progress}%`;
        
        // Update time display
        const timeInSeconds = Math.floor(time);
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateProgress() {
        if (!this.isPlaying) return;
        
        const currentTime = this.audioContext.currentTime - this.startTime;
        let effectiveTime;
        
        if (this.isIntroPlaying && this.introBuffer) {
            effectiveTime = currentTime;
            if (effectiveTime >= this.introBuffer.duration) {
                this.isIntroPlaying = false;
                effectiveTime = 0;
            }
        } else {
            effectiveTime = currentTime % this.loopBuffer.duration;
        }
        
        this.updateProgressVisuals(effectiveTime);
    }
}

// Initialize all audio players when the page loads (robust to script timing)
function initAudioPlayers() {
    const playerElements = document.querySelectorAll('.custom-player');
    // Create players only once; overwrite to ensure correct state
    window.audioPlayers = Array.from(playerElements).map(element => new AudioPlayer(element));
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initAudioPlayers);
} else {
    // Document already ready - initialize immediately
    initAudioPlayers();
}

