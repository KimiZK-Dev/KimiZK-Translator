// Audio management module for KimiZK-Translator
const AudioManager = {
    // Audio cache for TTS
    ttsAudioCache: {},
    
    // Current audio instance
    currentAudio: null,
    currentAudioUrl: null,
    currentAudioContext: null,
    currentAudioBuffer: null,
    currentAudioSource: null,
    
    // Progress tracking variables
    _audioStartTime: null,
    _progressStartTime: null,
    _progressTotalPausedTime: 0,
    _progressInterval: null,
    _currentPlayPosition: 0, // Track current position in seconds
    _audioDuration: 0, // Track total duration
    
    // Seeking and interaction state
    _isSeeking: false,
    _isDraggingProgress: false,
    _isInteractingWithAudio: false,
    _wasPlayingBeforeSeek: false,
    _seekTargetTime: 0,
    _seekingTimeout: null,
    _isDragSeeking: false,
    
    // Current audio button reference
    _currentAudioButton: null,
    
    // Cleanup callback for an in-progress progress-bar drag (mouse or touch).
    // Set while dragging, cleared when the drag ends normally. stopCurrentAudio()
    // calls this if a new playback interrupts a drag in progress, so the
    // document-level mousemove/touchmove listeners from the old controls never leak.
    _activeDragCleanup: null,
    
    // Monotonically increasing token used to guard against race conditions
    // when the user rapidly clicks multiple "listen" buttons in a row.
    // Only the request that holds the latest token is allowed to apply its
    // result (insert controls / mutate button state) once its async work resolves.
    _playToken: 0,
    
    // Cache configuration
    MAX_CACHE_SIZE: 50,
    
    /**
     * Stop current audio playback
     */
    stopCurrentAudio() {
        try {
            // Cancel any in-flight progress-bar drag so its document-level
            // mousemove/touchmove listeners don't leak onto the next audio.
            if (this._activeDragCleanup) {
                try { this._activeDragCleanup(); } catch (e) {}
                this._activeDragCleanup = null;
            }

            this.detachFromPopup();
            // Stop AudioContext
            if (this.currentAudioSource) {
                this.currentAudioSource.stop();
                this.currentAudioSource = null;
            }
            
            if (this.currentAudioContext) {
                if (this.currentAudioContext.state && this.currentAudioContext.state !== 'closed') {
                    this.currentAudioContext.close();
                }
                this.currentAudioContext = null;
            }
            
            // Stop HTML Audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            }
            
            // Stop Web Speech Synthesis if active
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (e) {}
            }

            // Remove floating audio controls bar immediately
            const floatingControls = document.querySelector('.xt-audio-controls');
            if (floatingControls) {
                floatingControls.remove();
            }
            
            // Clean up URL
            if (this.currentAudioUrl && !Object.values(this.ttsAudioCache).includes(this.currentAudioUrl)) {
                URL.revokeObjectURL(this.currentAudioUrl);
            }
            this.currentAudioUrl = null;
            this.currentAudioBuffer = null;
            
            // Clean up progress tracking
            this._clearProgressTracking();
            
            // Clean up state
            this._resetSeekingState();
            
            // Remove controls if safe
            if (this.canRemoveAudioControls()) {
                this.forceRemoveAudioControls();
            }
            
            // Reset button state
            this._resetAudioButtonState();
            
        } catch (error) {
            console.error("Error stopping audio:", error);
        }
    },
    
    /**
     * Clear progress tracking
     * @private
     */
    _clearProgressTracking() {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }
        this._audioStartTime = null;
        this._progressStartTime = null;
        this._progressTotalPausedTime = 0;
        this._currentPlayPosition = 0;
        this._audioDuration = 0;
    },
    
    /**
     * Reset seeking state
     * @private
     */
    _resetSeekingState() {
        this._isSeeking = false;
        this._isDraggingProgress = false;
        this._isInteractingWithAudio = false;
        this._wasPlayingBeforeSeek = false;
        this._seekTargetTime = 0;
        this._isDragSeeking = false;
        if (this._seekingTimeout) {
            clearTimeout(this._seekingTimeout);
            this._seekingTimeout = null;
        }
    },
    
    /**
     * Update current play position
     * @private
     */
    _updateCurrentPosition() {
        if (this.currentAudio) {
            this._currentPlayPosition = this.currentAudio.currentTime;
        } else if (this.currentAudioContext && this._progressStartTime) {
            this._currentPlayPosition = (Date.now() - this._progressStartTime - this._progressTotalPausedTime) / 1000;
            if (this._currentPlayPosition >= this._audioDuration) {
                this._currentPlayPosition = this._audioDuration;
            }
        }
    },
    
    /**
     * Create audio controls HTML
     * @param {string} audioId - Unique audio ID
     * @returns {string} HTML string for audio controls
     */
    createAudioControls(audioId) {
        return `
            <div class="xt-audio-controls" id="audio-controls-${audioId}">
                <div class="xt-audio-header">
                    <span class="xt-audio-badge">
                        <span class="xt-audio-dot"></span>
                        AI Voice Player
                    </span>
                </div>
                <div class="xt-audio-player">
                    <div class="xt-audio-progress">
                        <div class="xt-progress-bar" role="slider" tabindex="0" aria-label="Tiến trình phát âm thanh" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                            <div class="xt-progress-fill" style="width: 0%"></div>
                            <div class="xt-progress-handle" style="left: 0%"></div>
                        </div>
                        <div class="xt-time-display">
                            <span class="xt-current-time">0:00</span>
                            <span class="xt-total-time">0:00</span>
                        </div>
                    </div>
                    <div class="xt-audio-volume">
                        <span class="xt-volume-icon" title="Âm lượng" role="button" tabindex="0" aria-label="Tắt/Bật âm thanh">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                        </span>
                        <div class="xt-volume-slider">
                            <input type="range" min="0" max="100" value="100" class="xt-volume-input" aria-label="Âm lượng">
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Attach audio controls to UIManager popup
     */
    attachToPopup(popup, controls) {
        this.currentPopup = popup;
        this.currentControls = controls;
        if (typeof UIManager !== 'undefined') {
            UIManager.attachedAudioControls = controls;
            UIManager.syncAttachedElements();
        }
    },

    /**
     * Detach audio controls from UIManager popup
     */
    detachFromPopup() {
        if (typeof UIManager !== 'undefined' && UIManager.attachedAudioControls === this.currentControls) {
            UIManager.attachedAudioControls = null;
        }
        this.currentPopup = null;
        this.currentControls = null;
    },

    /**
     * Setup audio controls for an audio element
     * @param {HTMLAudioElement|AudioBufferSourceNode} audio - Audio element or source node
     * @param {string} controlsId - Controls ID
     * @param {HTMLElement} popup - Popup element for positioning
     * @param {boolean} isAudioContext - Whether using AudioContext
     */
    setupAudioControls(audio, controlsId, popup, isAudioContext = false) {
        const controls = document.getElementById(`audio-controls-${controlsId}`);
        if (!controls) return;

        // Apply active theme to audio controls
        if (typeof UIManager !== 'undefined' && UIManager.applyTheme) {
            UIManager.applyTheme();
        } else if (popup && (popup.classList.contains('dark-theme') || popup.classList.contains('dark'))) {
            controls.classList.add('dark-theme', 'dark');
        } else if (typeof StorageManager !== 'undefined' && StorageManager.getTheme) {
            StorageManager.getTheme().then(theme => {
                let isDark = theme === 'dark';
                if (theme === 'auto') {
                    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                if (isDark) {
                    controls.classList.add('dark-theme', 'dark');
                } else {
                    controls.classList.add('light-theme');
                }
            });
        }

        // Register attachment with popup
        this.attachToPopup(popup, controls);

        // Get control elements
        const elements = {
            progressBar: controls.querySelector('.xt-progress-bar'),
            progressFill: controls.querySelector('.xt-progress-fill'),
            progressHandle: controls.querySelector('.xt-progress-handle'),
            currentTime: controls.querySelector('.xt-current-time'),
            totalTime: controls.querySelector('.xt-total-time'),
            volumeInput: controls.querySelector('.xt-volume-input'),
            volumeIcon: controls.querySelector('.xt-volume-icon')
        };

        let pauseStartTime = 0;

        // Progress update function
        const updateProgress = () => {
            if (this._audioDuration > 0 && !this._isSeeking && !this._isDraggingProgress) {
                this._updateCurrentPosition();
                
                // Update visual elements
                const progress = (this._currentPlayPosition / this._audioDuration) * 100;
                elements.progressFill.style.width = `${progress}%`;
                elements.progressHandle.style.left = `${progress}%`;
                elements.currentTime.textContent = Utils.formatTime(this._currentPlayPosition);
                elements.progressBar.setAttribute('aria-valuenow', Math.round(progress));
                
                // Check if audio ended
                if (this._currentPlayPosition >= this._audioDuration) {
                    this._clearProgressTracking();
                    this._handleAudioEnded();
                }
            }
        };

        // Setup based on audio type
        if (isAudioContext) {
            // AudioContext setup
            this._progressStartTime = this._audioStartTime || Date.now();
            this._audioDuration = audio.buffer.duration;
            elements.totalTime.textContent = Utils.formatTime(this._audioDuration);
            
            // Reset progress tracking
            this._progressTotalPausedTime = 0;
            this._currentPlayPosition = 0;
            
            // Start progress interval
            this._progressInterval = setInterval(updateProgress, 100);
            
        } else {
            // HTML Audio setup
            audio.addEventListener('loadedmetadata', () => {
                this._audioDuration = audio.duration;
                elements.totalTime.textContent = Utils.formatTime(this._audioDuration);
            });

            audio.addEventListener('timeupdate', () => {
                if (!this._isSeeking && !this._isDraggingProgress) {
                    this._currentPlayPosition = audio.currentTime;
                    updateProgress();
                }
            });
            
            audio.addEventListener('seeked', () => {
                this._isSeeking = false;
                this._isInteractingWithAudio = false;
                this._currentPlayPosition = audio.currentTime;
            });

            audio.addEventListener('ended', () => {
                this._handleAudioEnded();
            });

            audio.addEventListener('error', (e) => {
                console.error("Audio error:", e);
                NotificationManager.showAudioError(audio.error?.message || 'Nguồn không hợp lệ');
            });
        }

        // Progress bar interaction handlers
        let isDraggingProgress = false;

        // Works for both MouseEvent and TouchEvent so the same drag logic
        // powers desktop mouse dragging and mobile touch dragging.
        const getClientX = e => (e.touches && e.touches.length) ? e.touches[0].clientX
            : (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0].clientX
            : e.clientX;
        
        const startProgressDrag = e => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            isDraggingProgress = true;
            this._isDraggingProgress = true;
            this._isInteractingWithAudio = true;
            this._isDragSeeking = true;
            
            // Store playing state
            this._wasPlayingBeforeSeek = this.isAudioPlaying();
            
            // Pause audio immediately
            this._pauseAudioImmediate();
            
            document.addEventListener('mousemove', updateProgressDrag);
            document.addEventListener('mouseup', stopProgressDrag);
            document.addEventListener('touchmove', updateProgressDrag, { passive: false });
            document.addEventListener('touchend', stopProgressDrag);
            document.addEventListener('touchcancel', stopProgressDrag);

            // Let stopCurrentAudio() force-cancel an in-progress drag if a new
            // audio starts (e.g. user starts dragging then clicks another
            // "listen" button) instead of leaking these document listeners.
            this._activeDragCleanup = stopProgressDrag;
        };

        const updateProgressDrag = e => {
            if (!isDraggingProgress) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = Math.min(1, Math.max(0, (getClientX(e) - rect.left) / rect.width));
            const newTime = this._audioDuration * percentage;
            
            // Update visual immediately
            elements.progressFill.style.width = `${percentage * 100}%`;
            elements.progressHandle.style.left = `${percentage * 100}%`;
            elements.currentTime.textContent = Utils.formatTime(newTime);
            elements.progressBar.setAttribute('aria-valuenow', Math.round(percentage * 100));
            
            // Store target time for seeking
            this._seekTargetTime = newTime;
        };

        const stopProgressDrag = () => {
            isDraggingProgress = false;
            this._isDraggingProgress = false;
            this._activeDragCleanup = null;
            
            // Perform the actual seeking
            this._performSeek(this._seekTargetTime);
            
            // Resume audio if it was playing before drag
            if (this._wasPlayingBeforeSeek) {
                setTimeout(() => {
                    this._resumeAudioAfterSeek();
                }, 100);
            }
            
            // Reset interaction flags
            setTimeout(() => {
                this._isSeeking = false;
                this._isInteractingWithAudio = false;
                this._isDragSeeking = false;
            }, 200);
            
            document.removeEventListener('mousemove', updateProgressDrag);
            document.removeEventListener('mouseup', stopProgressDrag);
            document.removeEventListener('touchmove', updateProgressDrag);
            document.removeEventListener('touchend', stopProgressDrag);
            document.removeEventListener('touchcancel', stopProgressDrag);
        };

        // Click (or tap without drag) on progress bar to seek
        const seekFromPointerEvent = e => {
            if (isDraggingProgress) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            this._isInteractingWithAudio = true;
            this._isSeeking = true;
            this._isDragSeeking = false;
            
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = Math.min(1, Math.max(0, (getClientX(e) - rect.left) / rect.width));
            const newTime = this._audioDuration * percentage;
            
            // Store playing state
            this._wasPlayingBeforeSeek = this.isAudioPlaying();
            
            // Pause audio
            this._pauseAudioImmediate();
            
            // Update visual immediately
            elements.progressFill.style.width = `${percentage * 100}%`;
            elements.progressHandle.style.left = `${percentage * 100}%`;
            elements.currentTime.textContent = Utils.formatTime(newTime);
            elements.progressBar.setAttribute('aria-valuenow', Math.round(percentage * 100));
            
            // Perform seeking
            this._performSeek(newTime);
            
            // Don't auto-resume after click seeking - let user control with button
            setTimeout(() => {
                this._isSeeking = false;
                this._isInteractingWithAudio = false;
            }, 200);
        };
        elements.progressBar.addEventListener('click', seekFromPointerEvent);

        // Keyboard seeking: Left/Right (or Down/Up) nudge by 5 seconds, Home/End jump to start/end
        elements.progressBar.addEventListener('keydown', e => {
            if (this._audioDuration <= 0) return;
            let delta = 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 5;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -5;
            else if (e.key === 'Home') { delta = -this._audioDuration; }
            else if (e.key === 'End') { delta = this._audioDuration; }
            else return;

            e.preventDefault();
            e.stopPropagation();
            const newTime = Math.min(this._audioDuration, Math.max(0, this._currentPlayPosition + delta));
            const percentage = this._audioDuration > 0 ? (newTime / this._audioDuration) : 0;

            elements.progressFill.style.width = `${percentage * 100}%`;
            elements.progressHandle.style.left = `${percentage * 100}%`;
            elements.currentTime.textContent = Utils.formatTime(newTime);
            elements.progressBar.setAttribute('aria-valuenow', Math.round(percentage * 100));

            this._performSeek(newTime);
        });

        // Setup drag events (mouse + touch)
        elements.progressBar.addEventListener('mousedown', startProgressDrag);
        elements.progressHandle.addEventListener('mousedown', startProgressDrag);
        elements.progressBar.addEventListener('touchstart', startProgressDrag, { passive: false });
        elements.progressHandle.addEventListener('touchstart', startProgressDrag, { passive: false });

        // Volume control setup
        this._setupVolumeControl(elements, audio, isAudioContext);

        // Prevent popup closing when clicking controls
        controls.addEventListener('click', e => {
            e.stopPropagation();
        });
    },
    
    /**
     * Pause audio immediately without state changes
     * @private
     */
    _pauseAudioImmediate() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        if (this.currentAudioContext && this.currentAudioContext.state === 'running') {
            this.currentAudioContext.suspend();
        }
        // Stop progress tracking
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }
    },
    
    /**
     * Resume audio after seeking
     * @private
     */
    async _resumeAudioAfterSeek() {
        try {
            if (this.currentAudio) {
                await this.currentAudio.play();
            }
            if (this.currentAudioContext && this.currentAudioContext.state === 'suspended') {
                await this.currentAudioContext.resume();
            }
            // Restart progress tracking
            this._startProgressTracking();
        } catch (error) {
            console.error('Error resuming audio after seek:', error);
        }
    },
    
    /**
     * Start progress tracking
     * @private
     */
    _startProgressTracking() {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
        }
        
        if (this.currentAudioContext) {
            // For AudioContext, calculate new start time based on current position
            this._progressStartTime = Date.now() - (this._currentPlayPosition * 1000);
            this._progressTotalPausedTime = 0;
            
            this._progressInterval = setInterval(() => {
                if (this._audioDuration > 0 && !this._isSeeking && !this._isDraggingProgress) {
                    this._updateCurrentPosition();
                    
                    // Update visual elements
                    const controls = document.querySelector('.xt-audio-controls');
                    if (controls) {
                        const progressFill = controls.querySelector('.xt-progress-fill');
                        const progressHandle = controls.querySelector('.xt-progress-handle');
                        const currentTime = controls.querySelector('.xt-current-time');
                        
                        if (progressFill && progressHandle && currentTime) {
                            const progress = (this._currentPlayPosition / this._audioDuration) * 100;
                            progressFill.style.width = `${progress}%`;
                            progressHandle.style.left = `${progress}%`;
                            currentTime.textContent = Utils.formatTime(this._currentPlayPosition);
                        }
                    }
                    
                    // Check if audio ended
                    if (this._currentPlayPosition >= this._audioDuration) {
                        this._clearProgressTracking();
                        this._handleAudioEnded();
                    }
                }
            }, 100);
        }
    },
    
    /**
     * Perform seeking operation
     * @private
     */
    _performSeek(targetTime) {
        this._currentPlayPosition = targetTime;
        
        if (this.currentAudio) {
            // HTML Audio seeking
            if (this.currentAudio.readyState >= 2) {
                try {
                    this.currentAudio.currentTime = targetTime;
                } catch (error) {
                    console.error('Error seeking HTML audio:', error);
                }
            }
        } else if (this.currentAudioContext && this.currentAudioBuffer) {
            // AudioContext seeking
            this._seekAudioContext(targetTime);
        }
    },
    
    /**
     * Setup volume control
     * @private
     */
    _setupVolumeControl(elements, audio, isAudioContext) {
        let currentVolume = 1.0;
        // Remembers the last non-zero volume so the mute/unmute toggle on the
        // speaker icon always restores what the user actually had set, even if
        // they muted via the icon without ever touching the slider itself
        // (previously this fell back to a hardcoded 0.5 in that case).
        let lastNonZeroVolume = 1.0;
        
        // Set initial volume
        if (isAudioContext) {
            if (this.currentAudioSource && this.currentAudioSource.gain) {
                currentVolume = this.currentAudioSource.gain.gain.value;
                elements.volumeInput.value = currentVolume * 100;
            }
        } else {
            if (audio && typeof audio.volume !== 'undefined') {
                currentVolume = audio.volume;
                elements.volumeInput.value = currentVolume * 100;
            }
        }
        
        if (currentVolume > 0) lastNonZeroVolume = currentVolume;
        
        // Set initial volume icon
        this._updateVolumeIcon(elements.volumeIcon, currentVolume);
        
        // Volume input handler
        elements.volumeInput.addEventListener('input', e => {
            e.stopPropagation();
            e.preventDefault();
            const volume = e.target.value / 100;
            currentVolume = volume;
            if (volume > 0) lastNonZeroVolume = volume;
            
            if (isAudioContext) {
                if (this.currentAudioSource && this.currentAudioSource.gain) {
                    this.currentAudioSource.gain.gain.value = volume;
                }
            } else {
                if (audio && typeof audio.volume !== 'undefined') {
                    audio.volume = volume;
                }
            }
            
            this._updateVolumeIcon(elements.volumeIcon, volume);
        });

        // Volume icon click handler
        elements.volumeIcon.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            
            if (currentVolume > 0) {
                // Mute
                elements.volumeInput.value = 0;
                currentVolume = 0;
                this._updateVolumeIcon(elements.volumeIcon, 0);
                
                if (isAudioContext) {
                    if (this.currentAudioSource && this.currentAudioSource.gain) {
                        this.currentAudioSource.gain.gain.value = 0;
                    }
                } else {
                    if (audio && typeof audio.volume !== 'undefined') {
                        audio.volume = 0;
                    }
                }
            } else {
                // Unmute - restore the last volume the user actually chose
                const newVolume = lastNonZeroVolume > 0 ? lastNonZeroVolume : 1.0;
                elements.volumeInput.value = newVolume * 100;
                currentVolume = newVolume;
                
                if (isAudioContext) {
                    if (this.currentAudioSource && this.currentAudioSource.gain) {
                        this.currentAudioSource.gain.gain.value = newVolume;
                    }
                } else {
                    if (audio && typeof audio.volume !== 'undefined') {
                        audio.volume = newVolume;
                    }
                }
                
                this._updateVolumeIcon(elements.volumeIcon, newVolume);
            }
        });

        // Prevent the slider drag from bubbling up and closing the popup/controls
        elements.volumeInput.addEventListener('mousedown', e => {
            e.stopPropagation();
        });

        // Keyboard accessibility: Enter/Space on the speaker icon toggles mute,
        // matching the click handler above.
        elements.volumeIcon.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elements.volumeIcon.click();
            }
        });
    },
    
    /**
     * Update volume icon
     * @private
     */
    _updateVolumeIcon(volumeIcon, volume) {
        if (volume === 0) {
            volumeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
        } else if (volume < 0.3) {
            volumeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>`;
        } else if (volume < 0.7) {
            volumeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        } else {
            volumeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
        }
    },
    
    /**
     * Handle audio ended event
     * @private
     */
    _handleAudioEnded() {
        this._clearProgressTracking();
        this._resetSeekingState();
        this._resetAudioButtonState();
        
        // Clean up audio resources
        if (this.currentAudioContext && this.currentAudioContext.state !== 'closed') {
            this.currentAudioContext.close();
        }
        this.currentAudioSource = null;
        this.currentAudioContext = null;
        this.currentAudio = null;
        
        // Remove controls
        this.forceRemoveAudioControls();
    },
    
    /**
     * Play audio using AudioContext
     * @param {string} audioUrl - Blob URL of audio
     * @returns {Promise<boolean>} Success status
     */
    async playAudioWithContext(audioUrl) {
        try {
            this.currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.currentAudioContext.state === 'suspended') {
                await this.currentAudioContext.resume();
            }
            
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            this.currentAudioBuffer = await this.currentAudioContext.decodeAudioData(arrayBuffer);
            
            this.currentAudioSource = this.currentAudioContext.createBufferSource();
            this.currentAudioSource.buffer = this.currentAudioBuffer;
            
            const gainNode = this.currentAudioContext.createGain();
            gainNode.gain.value = 1;
            
            this.currentAudioSource.connect(gainNode);
            gainNode.connect(this.currentAudioContext.destination);
            this.currentAudioSource.gain = gainNode;
            
            this.currentAudioSource.start(0);
            this._audioStartTime = Date.now();
            this._currentPlayPosition = 0;
            
            // console.log("Audio playing with AudioContext:", audioUrl);
            return true;
            
        } catch (error) {
            console.error("AudioContext playback failed:", error);
            this._cleanupAudioContext();
            return false;
        }
    },
    
    /**
     * Play audio using HTML Audio element
     * @param {string} audioUrl - Blob URL of audio
     * @returns {Promise<boolean>} Success status
     */
    async playAudioWithElement(audioUrl) {
        try {
            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.volume = 1.0;
            this._currentPlayPosition = 0;
            
            this.currentAudio.addEventListener('error', (e) => {
                console.error("Audio playback error:", e);
                NotificationManager.showAudioError(this.currentAudio.error?.message || 'Nguồn không hợp lệ');
            });
            
            this.currentAudio.addEventListener('ended', () => {
                this._handleAudioEnded();
            });
            
            await this.currentAudio.play();
            // console.log("Audio playing with HTML Audio element:", audioUrl);
            return true;
            
        } catch (error) {
            console.error("HTML Audio element playback failed:", error);
            return false;
        }
    },
    
    /**
     * Play audio using data URL
     * @param {string} audioUrl - Blob URL of audio
     * @returns {Promise<boolean>} Success status
     */
    async playAudioWithDataUrl(audioUrl) {
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        this.currentAudio = new Audio(reader.result);
                        this._currentPlayPosition = 0;
                        
                        this.currentAudio.addEventListener('error', (e) => {
                            console.error("Data URL audio playback error:", e);
                            resolve(false);
                        });
                        
                        this.currentAudio.addEventListener('ended', () => {
                            this._handleAudioEnded();
                        });
                        
                        await this.currentAudio.play();
                        // console.log("Audio playing with data URL");
                        resolve(true);
                    } catch (error) {
                        console.error("Data URL audio playback failed:", error);
                        resolve(false);
                    }
                };
                reader.onerror = () => resolve(false);
                reader.readAsDataURL(blob);
            });
            
        } catch (error) {
            console.error("Data URL conversion failed:", error);
            return false;
        }
    },
    
    /**
     * Setup audio button with playback functionality
     * @param {HTMLElement} button - Audio button element
     * @param {string} text - Text to convert to speech
     * @param {boolean} isSingleWord - Whether text is a single word
     * @param {HTMLElement} popup - Popup element for positioning
     */
    setupAudioButton(button, text, isSingleWord, popup, isOriginal = false) {
        if (!button) return;
        
        const icon = button.querySelector('.xt-btn-icon') || button;
        const textSpan = button.querySelector('.xt-btn-text');
        if (icon && !button.dataset.origIcon) {
            button.dataset.origIcon = icon.innerHTML;
        }
        if (textSpan && !button.dataset.origText) {
            button.dataset.origText = textSpan.textContent;
        }
        const audioId = Utils.generateId();

        const toggleAudio = async (e) => {
            if (e && typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
            try {
                // Don't allow toggle during seeking
                if (this._isSeeking || this._isDraggingProgress) {
                    return;
                }
                
                // Check current audio state
                const isPlaying = this.isAudioPlaying();
                const isPaused = this.isAudioPaused();
                const isSameButton = (this._currentAudioButton === button);
                
                // Handle pause (only when clicking the same button that is currently playing)
                if (isSameButton && isPlaying) {
                    this._pauseAudio();
                    this._updateAudioButtonState(false);
                    return;
                }

                // Handle resume (only when clicking the same button that is currently paused)
                if (isSameButton && isPaused) {
                    await this._resumeAudio();
                    this._updateAudioButtonState(true);
                    return;
                }

                // Handle play new audio (when clicking a different button or starting fresh audio)
                // Claim a fresh token for this playback request. If the user
                // clicks another button before this one finishes loading,
                // that click will bump the token and this request will
                // discard its result instead of racing onto the DOM.
                const myToken = ++this._playToken;
                await this._playNewAudio(button, icon, textSpan, text, audioId, popup, isOriginal, myToken);
            } catch (error) {
                console.error("Audio setup error:", error);
                NotificationManager.showAudioError(error.message || "Lỗi khi thiết lập âm thanh");
                this._resetAudioButtonState();
            }
        };

        button.addEventListener('click', toggleAudio);
    },

    /**
     * Pause current audio
     * @private
     */
    _pauseAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this._currentPlayPosition = this.currentAudio.currentTime;
        }
        if (this.currentAudioContext && this.currentAudioContext.state === 'running') {
            this.currentAudioContext.suspend();
            this._updateCurrentPosition();
        }
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }
    },
    
    /**
     * Resume current audio
     * @private
     */
    async _resumeAudio() {
        if (this.currentAudio) {
            await this.currentAudio.play();
        } else if (this.currentAudioContext && this.currentAudioBuffer) {
            await this._seekAudioContext(this._currentPlayPosition);
            await this.currentAudioContext.resume();
        }
        this._startProgressTracking();
    },
    
    /**
     * Play new audio
     * @private
     */
    async _playNewAudio(button, icon, textSpan, text, audioId, popup, isOriginal = false, myToken = null) {
        this.stopCurrentAudio();
        // If no token was supplied (legacy callers), fall back to a fresh one
        if (myToken === null) myToken = ++this._playToken;
        this._currentAudioButton = button;

        const textToSpeak = (typeof text === 'function') ? text() : String(text || '').trim();
        if (!textToSpeak) {
            this._resetAudioButtonState();
            return;
        }

        if (icon && !button.dataset.origIcon) {
            button.dataset.origIcon = icon.innerHTML;
        }
        if (textSpan && !button.dataset.origText) {
            button.dataset.origText = textSpan.textContent;
        }
        button.disabled = true;
        button.title = "Đang tải âm thanh...";
        if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="xt-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>`;
        if (textSpan) textSpan.textContent = "Đang tải...";

        const savedVoice = isOriginal
            ? ((typeof StorageManager !== 'undefined' && StorageManager.getTtsVoiceOrig) ? await StorageManager.getTtsVoiceOrig() : 'en-US-JennyNeural')
            : ((typeof StorageManager !== 'undefined' && StorageManager.getTtsVoiceTrans) ? await StorageManager.getTtsVoiceTrans() : await StorageManager.getTtsVoice());
            
        const savedDirection = (typeof StorageManager !== 'undefined' && StorageManager.getTtsDirection) ? await StorageManager.getTtsDirection() : 'none';
        const cacheKey = `${isOriginal ? 'orig' : 'trans'}_${savedVoice}_${savedDirection}_${textToSpeak}`;

        // Get audio URL
        let audioUrl = this.ttsAudioCache[cacheKey];
        
        if (!audioUrl) {
            audioUrl = await ApiService.textToSpeech(textToSpeak, isOriginal);
            if (audioUrl && audioUrl !== 'WEB_SPEECH_PLAYING') {
                this._addToCache(cacheKey, audioUrl);
            }
        } else {
            // console.log("Audio found in cache for:", text);
        }

        // A newer click superseded this request while we were awaiting the
        // network/TTS call above. Bail out silently instead of stealing
        // focus/state from whichever button the user is now waiting on.
        if (myToken !== this._playToken) {
            return;
        }

        if (audioUrl === 'WEB_SPEECH_PLAYING') {
            this._resetAudioButtonState();
            return;
        }

        if (audioUrl) {
            this.currentAudioUrl = audioUrl;
            
            // Try playback methods
            let playbackSuccess = false;
            let playbackMethod = '';
            
            // Method 1: AudioContext
            playbackSuccess = await this.playAudioWithContext(audioUrl);
            if (playbackSuccess) {
                playbackMethod = 'AudioContext';
            }
            
            // Method 2: HTML Audio
            if (!playbackSuccess) {
                playbackSuccess = await this.playAudioWithElement(audioUrl);
                if (playbackSuccess) {
                    playbackMethod = 'HTML Audio';
                }
            }
            
            // Method 3: Data URL
            if (!playbackSuccess) {
                playbackSuccess = await this.playAudioWithDataUrl(audioUrl);
                if (playbackSuccess) {
                    playbackMethod = 'Data URL';
                }
            }
            
            // Another click superseded us while the audio element/context was
            // still spinning up (network fetch + decode can take a moment).
            // Stop whatever we just started and let the newer request own the UI.
            if (myToken !== this._playToken) {
                if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
                if (this.currentAudioSource) { try { this.currentAudioSource.stop(); } catch (e) {} this.currentAudioSource = null; }
                if (this.currentAudioContext && this.currentAudioContext.state !== 'closed') { this.currentAudioContext.close(); }
                this.currentAudioContext = null;
                return;
            }

            if (playbackSuccess) {
                // console.log(`Audio playback successful using: ${playbackMethod}`);
                
                // Create and setup controls
                document.body.insertAdjacentHTML('beforeend', this.createAudioControls(audioId));
                
                if (this.currentAudioSource) {
                    this.setupAudioControls(this.currentAudioSource, audioId, popup, true);
                } else if (this.currentAudio) {
                    this.setupAudioControls(this.currentAudio, audioId, popup, false);
                }
                
                this._updateAudioButtonState(true);
                button.disabled = false;
            } else {
                throw new Error("Không thể phát âm thanh do hạn chế bảo mật của trang web. Vui lòng thử lại sau.");
            }
        } else {
            this._resetAudioButtonState();
        }
    },
    
    /**
     * Add audio to cache
     * @private
     */
    _addToCache(text, audioUrl) {
        this.ttsAudioCache[text] = audioUrl;
        
        const cacheKeys = Object.keys(this.ttsAudioCache);
        if (cacheKeys.length > this.MAX_CACHE_SIZE) {
            const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.MAX_CACHE_SIZE);
            keysToRemove.forEach(key => {
                const url = this.ttsAudioCache[key];
                // Never revoke the blob URL that's currently loaded/playing -
                // doing so would silently break the active player (pausing
                // and reloading it would fail with a decode error).
                if (url === this.currentAudioUrl) return;
                URL.revokeObjectURL(url);
                delete this.ttsAudioCache[key];
            });
            // console.log(`Cache size limit reached. Removed ${keysToRemove.length} old entries.`);
        }
    },
    
    /**
     * Seek AudioContext to specific time
     * @private
     */
    async _seekAudioContext(targetTime) {
        if (!this.currentAudioContext || !this.currentAudioBuffer) {
            console.warn('Cannot seek: AudioContext not available');
            return;
        }
        
        if (this.currentAudioContext.state === 'closed') {
            console.warn('Cannot seek: AudioContext is closed');
            return;
        }
        
        try {
            // Preserve volume and playing state
            let currentVolume = 1;
            const wasRunning = this.currentAudioContext.state === 'running';
            
            if (this.currentAudioSource && this.currentAudioSource.gain) {
                currentVolume = this.currentAudioSource.gain.gain.value;
            }
            
            // Stop current source
            if (this.currentAudioSource) {
                const originalOnEnded = this.currentAudioSource.onended;
                this.currentAudioSource.onended = null;
                try {
                    this.currentAudioSource.stop();
                } catch (e) {
                    // Source might already be stopped
                }
                this.currentAudioSource.disconnect();
                this.currentAudioSource.onended = originalOnEnded;
            }
            
            // Create new source
            this.currentAudioSource = this.currentAudioContext.createBufferSource();
            this.currentAudioSource.buffer = this.currentAudioBuffer;
            
            const gainNode = this.currentAudioContext.createGain();
            gainNode.gain.value = currentVolume;
            
            this.currentAudioSource.connect(gainNode);
            gainNode.connect(this.currentAudioContext.destination);
            this.currentAudioSource.gain = gainNode;
            
            // Set up ended handler
            this.currentAudioSource.onended = () => {
                if (!this._isSeeking) {
                    this._handleAudioEnded();
                }
            };
            
            // Start from target time
            this.currentAudioSource.start(0, targetTime);
            
            // Update position tracking
            this._currentPlayPosition = targetTime;
            this._progressStartTime = Date.now() - (targetTime * 1000);
            this._progressTotalPausedTime = 0;
            
            // console.log('AudioContext seeked to:', targetTime, 'seconds');
            
        } catch (error) {
            console.error('Error seeking AudioContext:', error);
        }
    },
    
    /**
     * Update audio button state
     * @private
     */
    _updateAudioButtonState(isPlaying) {
        if (this._currentAudioButton) {
            const icon = this._currentAudioButton.querySelector('.xt-btn-icon') || this._currentAudioButton;
            const textSpan = this._currentAudioButton.querySelector('.xt-btn-text');
            
            if (isPlaying) {
                if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
                if (textSpan) textSpan.textContent = "Dừng";
            } else {
                if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
                if (textSpan) textSpan.textContent = "Tiếp tục";
            }
        }
    },
    
    /**
     * Reset audio button state
     * @private
     */
    _resetAudioButtonState() {
        if (this._currentAudioButton) {
            const icon = this._currentAudioButton.querySelector('.xt-btn-icon') || this._currentAudioButton;
            const textSpan = this._currentAudioButton.querySelector('.xt-btn-text');
            
            if (icon) {
                if (this._currentAudioButton.dataset.origIcon) {
                    icon.innerHTML = this._currentAudioButton.dataset.origIcon;
                } else if (this._currentAudioButton.classList.contains('xt-listen-orig-btn') || this._currentAudioButton.id === 'popup-listen-orig-btn' || this._currentAudioButton.id === 'pg-tts-orig-btn') {
                    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
                } else {
                    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
                }
            }
            if (textSpan) {
                textSpan.textContent = this._currentAudioButton.dataset.origText || (this._currentAudioButton.id === 'pg-tts-orig-btn' ? 'Nghe Gốc' : 'Nghe');
            }
            this._currentAudioButton.disabled = false;
        }
    },
    
    /**
     * Cleanup AudioContext
     * @private
     */
    _cleanupAudioContext() {
        if (this.currentAudioContext && this.currentAudioContext.state !== 'closed') {
            this.currentAudioContext.close();
        }
        this.currentAudioContext = null;
        this.currentAudioSource = null;
        this.currentAudioBuffer = null;
    },
    
    /**
     * Clear audio cache
     */
    clearCache() {
        Object.values(this.ttsAudioCache).forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.ttsAudioCache = {};
        // console.log("Audio cache cleared");
    },
    
    /**
     * Get cache size
     * @returns {number} Number of cached audio files
     */
    getCacheSize() {
        return Object.keys(this.ttsAudioCache).length;
    },
    
    /**
     * Get cache info for debugging
     * @returns {object} Cache information
     */
    getCacheInfo() {
        return {
            size: this.getCacheSize(),
            maxSize: this.MAX_CACHE_SIZE,
            keys: Object.keys(this.ttsAudioCache),
            totalSize: Object.values(this.ttsAudioCache).length
        };
    },
    
    /**
     * Check if currently interacting with audio controls
     * @returns {boolean} True if interacting with audio
     */
    isInteractingWithAudio() {
        return this._isInteractingWithAudio || this._isDraggingProgress;
    },
    
    /**
     * Check if audio controls should be removed
     * @returns {boolean} True if controls can be removed
     */
    canRemoveAudioControls() {
        const shouldNotRemove = this._isSeeking || 
                               this._isInteractingWithAudio || 
                               this._isDraggingProgress ||
                               (this.currentAudio && !this.currentAudio.ended) ||
                               (this.currentAudioSource && this.currentAudioContext && this.currentAudioContext.state !== 'closed');
        
        return !shouldNotRemove;
    },
    
    /**
     * Force remove audio controls
     */
    forceRemoveAudioControls() {
        document.querySelectorAll('.xt-audio-controls').forEach(control => control.remove());
    },
    
    /**
     * Check if audio is currently playing
     * @returns {boolean} True if audio is playing
     */
    isAudioPlaying() {
        return (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) ||
               (this.currentAudioSource && this.currentAudioContext && this.currentAudioContext.state === 'running');
    },
    
    /**
     * Check if audio is currently paused
     * @returns {boolean} True if audio is paused
     */
    isAudioPaused() {
        return (this.currentAudio && this.currentAudio.paused && !this.currentAudio.ended) ||
               (this.currentAudioContext && this.currentAudioContext.state === 'suspended' && this.currentAudioSource);
    },

    /**
     * Clear all cached TTS audio URLs
     */
    clearAudioCache() {
        Object.values(this.ttsAudioCache).forEach(url => {
            if (url && typeof url === 'string' && url.startsWith('blob:')) {
                try { URL.revokeObjectURL(url); } catch (e) {}
            }
        });
        this.ttsAudioCache = {};
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
}