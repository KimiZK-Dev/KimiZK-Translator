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
    
    // Cache configuration
    MAX_CACHE_SIZE: 50,
    
    /**
     * Stop current audio playback
     */
    stopCurrentAudio() {
        try {
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
                <div class="xt-audio-player">
                    <div class="xt-audio-progress">
                        <div class="xt-progress-bar">
                            <div class="xt-progress-fill" style="width: 0%"></div>
                            <div class="xt-progress-handle"></div>
                        </div>
                        <div class="xt-time-display">
                            <span class="xt-current-time">0:00</span>
                            <span class="xt-total-time">0:00</span>
                        </div>
                    </div>
                    <div class="xt-audio-volume">
                        <span class="xt-volume-icon">🔊</span>
                        <div class="xt-volume-slider">
                            <input type="range" min="0" max="100" value="100" class="xt-volume-input">
                        </div>
                    </div>
                </div>
            </div>
        `;
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

        // Position controls
        const popupRect = popup.getBoundingClientRect();
        Object.assign(controls.style, {
            position: 'fixed',
            zIndex: '2147483647',
            left: `${popupRect.right + 10}px`,
            top: `${popupRect.top}px`
        });

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
        };

        const updateProgressDrag = e => {
            if (!isDraggingProgress) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const newTime = this._audioDuration * percentage;
            
            // Update visual immediately
            elements.progressFill.style.width = `${percentage * 100}%`;
            elements.progressHandle.style.left = `${percentage * 100}%`;
            elements.currentTime.textContent = Utils.formatTime(newTime);
            
            // Store target time for seeking
            this._seekTargetTime = newTime;
        };

        const stopProgressDrag = () => {
            isDraggingProgress = false;
            this._isDraggingProgress = false;
            
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
        };

        // Click on progress bar to seek
        elements.progressBar.addEventListener('click', e => {
            if (isDraggingProgress) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            this._isInteractingWithAudio = true;
            this._isSeeking = true;
            this._isDragSeeking = false;
            
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const newTime = this._audioDuration * percentage;
            
            // Store playing state
            this._wasPlayingBeforeSeek = this.isAudioPlaying();
            
            // Pause audio
            this._pauseAudioImmediate();
            
            // Update visual immediately
            elements.progressFill.style.width = `${percentage * 100}%`;
            elements.progressHandle.style.left = `${percentage * 100}%`;
            elements.currentTime.textContent = Utils.formatTime(newTime);
            
            // Perform seeking
            this._performSeek(newTime);
            
            // Don't auto-resume after click seeking - let user control with button
            setTimeout(() => {
                this._isSeeking = false;
                this._isInteractingWithAudio = false;
            }, 200);
        });

        // Setup drag events
        elements.progressBar.addEventListener('mousedown', startProgressDrag);
        elements.progressHandle.addEventListener('mousedown', startProgressDrag);

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
        
        // Set initial volume icon
        this._updateVolumeIcon(elements.volumeIcon, currentVolume);
        
        // Volume input handler
        elements.volumeInput.addEventListener('input', e => {
            e.stopPropagation();
            e.preventDefault();
            const volume = e.target.value / 100;
            currentVolume = volume;
            
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
                // Unmute
                const newVolume = Math.max(0.5, parseFloat(elements.volumeInput.getAttribute('data-last-volume') || 0.5));
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

        // Store last volume before muting
        elements.volumeInput.addEventListener('mousedown', e => {
            e.stopPropagation();
            if (currentVolume > 0) {
                elements.volumeInput.setAttribute('data-last-volume', currentVolume.toString());
            }
        });
    },
    
    /**
     * Update volume icon
     * @private
     */
    _updateVolumeIcon(volumeIcon, volume) {
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.3) {
            volumeIcon.textContent = '🔈';
        } else if (volume < 0.7) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
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
    setupAudioButton(button, text, isSingleWord, popup) {
        if (!button) return;
        
        this._currentAudioButton = button;
        const icon = button.querySelector('.xt-btn-icon');
        const textSpan = button.querySelector('.xt-btn-text');
        const audioId = Utils.generateId();

        const toggleAudio = async () => {
            try {
                // Don't allow toggle during seeking
                if (this._isSeeking || this._isDraggingProgress) {
                    // console.log('Cannot toggle audio during seeking');
                    return;
                }
                
                // Check current audio state
                const isPlaying = this.isAudioPlaying();
                const isPaused = this.isAudioPaused();
                
                // Handle pause
                if (isPlaying) {
                    // console.log("Pausing audio...");
                    this._pauseAudio();
                    this._updateAudioButtonState(false);
                    return;
                }

                // Handle resume
                if (isPaused) {
                    // console.log("Resuming audio...");
                    await this._resumeAudio();
                    this._updateAudioButtonState(true);
                    return;
                }

                // Handle play new audio
                if (!this.currentAudio && !this.currentAudioSource) {
                    await this._playNewAudio(button, icon, textSpan, text, audioId, popup);
                }
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
        // Stop progress tracking
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
            // For HTML Audio, just resume from current position
            await this.currentAudio.play();
        } else if (this.currentAudioContext && this.currentAudioBuffer) {
            // For AudioContext, need to restart from current position
            await this._seekAudioContext(this._currentPlayPosition);
            await this.currentAudioContext.resume();
        }
        
        // Restart progress tracking
        this._startProgressTracking();
    },
    
    /**
     * Play new audio
     * @private
     */
    async _playNewAudio(button, icon, textSpan, text, audioId, popup) {
        this.stopCurrentAudio();
        button.disabled = true;
        icon.textContent = "⏳";
        textSpan.textContent = "Đang tải...";

        // Get audio URL
        let audioUrl = this.ttsAudioCache[text];
        
        if (!audioUrl) {
            // console.log("Audio not cached, making API request for:", text);
            audioUrl = await ApiService.textToSpeech(text);
            if (audioUrl) {
                this._addToCache(text, audioUrl);
                // console.log("Audio cached for:", text);
            }
        } else {
            // console.log("Audio found in cache for:", text);
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
            const icon = this._currentAudioButton.querySelector('.xt-btn-icon');
            const textSpan = this._currentAudioButton.querySelector('.xt-btn-text');
            
            if (isPlaying) {
                if (icon) icon.textContent = "⏸️";
                if (textSpan) textSpan.textContent = "Dừng";
            } else {
                if (icon) icon.textContent = "▶️";
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
            const icon = this._currentAudioButton.querySelector('.xt-btn-icon');
            const textSpan = this._currentAudioButton.querySelector('.xt-btn-text');
            
            if (icon) icon.textContent = "🔊";
            if (textSpan) textSpan.textContent = "Nghe";
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
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
}