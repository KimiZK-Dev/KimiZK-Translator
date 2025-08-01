/**
 * Audio Player Module
 * Handles audio playback and controls
 */

import { CONFIG } from '../core/config.js';
import { formatTime, safeRemoveElement, safeSetStyle, log } from '../core/utils.js';
import apiService from '../services/api.js';
import notificationManager from './notification.js';

class AudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentAudioUrl = null;
        this.audioControls = null;
        this.isPlaying = false;
        this.volume = CONFIG.AUDIO.DEFAULT_VOLUME;
    }

    /**
     * Stop current audio and cleanup
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        if (this.currentAudioUrl && this.currentAudioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentAudioUrl);
        }
        
        this.currentAudioUrl = null;
        this.isPlaying = false;
        
        // Remove audio controls
        if (this.audioControls) {
            safeRemoveElement(this.audioControls);
            this.audioControls = null;
        }
        
        log('Audio stopped and cleaned up', 'info');
    }

    /**
     * Create audio controls element
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
    }

    /**
     * Setup audio controls
     * @param {HTMLAudioElement} audio - Audio element
     * @param {string} controlsId - Controls ID
     * @param {HTMLElement} popup - Popup element for positioning
     */
    setupAudioControls(audio, controlsId, popup) {
        const controls = document.getElementById(`audio-controls-${controlsId}`);
        if (!controls) return;

        this.audioControls = controls;
        
        // Position controls
        this.positionAudioControls(controls, popup);

        const elements = this.getAudioControlElements(controls);
        this.setupAudioEventListeners(audio, elements, controlsId);
        this.setupProgressControls(audio, elements);
        this.setupVolumeControls(audio, elements);
    }

    /**
     * Position audio controls relative to popup
     * @param {HTMLElement} controls - Audio controls element
     * @param {HTMLElement} popup - Popup element
     */
    positionAudioControls(controls, popup) {
        const popupRect = popup?.getBoundingClientRect();
        if (!popupRect) return;

        safeSetStyle(controls, 'position', 'fixed');
        safeSetStyle(controls, 'zIndex', CONFIG.UI.Z_INDEX.POPUP.toString());
        safeSetStyle(controls, 'left', `${popupRect.right + 10}px`);
        safeSetStyle(controls, 'top', `${popupRect.top}px`);
    }

    /**
     * Get audio control elements
     * @param {HTMLElement} controls - Audio controls element
     * @returns {Object} Control elements
     */
    getAudioControlElements(controls) {
        return {
            progressBar: controls.querySelector('.xt-progress-bar'),
            progressFill: controls.querySelector('.xt-progress-fill'),
            progressHandle: controls.querySelector('.xt-progress-handle'),
            currentTime: controls.querySelector('.xt-current-time'),
            totalTime: controls.querySelector('.xt-total-time'),
            volumeInput: controls.querySelector('.xt-volume-input'),
            volumeIcon: controls.querySelector('.xt-volume-icon')
        };
    }

    /**
     * Setup audio event listeners
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Object} elements - Control elements
     * @param {string} controlsId - Controls ID
     */
    setupAudioEventListeners(audio, elements, controlsId) {
        // Load metadata
        audio.addEventListener('loadedmetadata', () => {
            log(`Audio metadata loaded: duration=${audio.duration}, src=${audio.src}`, 'info');
            if (elements.totalTime) {
                elements.totalTime.textContent = formatTime(audio.duration);
            }
        });

        // Time update
        audio.addEventListener('timeupdate', () => {
            this.updateProgress(audio, elements);
        });

        // Audio ended
        audio.addEventListener('ended', () => {
            this.handleAudioEnded(elements);
        });

        // Audio error
        audio.addEventListener('error', (e) => {
            this.handleAudioError(e, audio);
        });

        // Prevent event bubbling
        this.audioControls?.addEventListener('click', e => e.stopPropagation());
    }

    /**
     * Update progress bar
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Object} elements - Control elements
     */
    updateProgress(audio, elements) {
        if (audio.duration && elements.progressFill && elements.progressHandle) {
            const progress = (audio.currentTime / audio.duration) * 100;
            safeSetStyle(elements.progressFill, 'width', `${progress}%`);
            safeSetStyle(elements.progressHandle, 'left', `${progress}%`);
            
            if (elements.currentTime) {
                elements.currentTime.textContent = formatTime(audio.currentTime);
            }
        }
    }

    /**
     * Handle audio ended event
     * @param {Object} elements - Control elements
     */
    handleAudioEnded(elements) {
        if (elements.progressFill) {
            safeSetStyle(elements.progressFill, 'width', '0%');
        }
        if (elements.progressHandle) {
            safeSetStyle(elements.progressHandle, 'left', '0%');
        }
        if (elements.currentTime) {
            elements.currentTime.textContent = '0:00';
        }
        
        this.isPlaying = false;
        
        // Update listen button if exists
        const listenBtn = document.querySelector('.xt-listen-btn');
        if (listenBtn) {
            const icon = listenBtn.querySelector('.xt-btn-icon');
            const text = listenBtn.querySelector('.xt-btn-text');
            if (icon) icon.textContent = "🔊";
            if (text) text.textContent = "Nghe";
        }
    }

    /**
     * Handle audio error
     * @param {Event} e - Error event
     * @param {HTMLAudioElement} audio - Audio element
     */
    handleAudioError(e, audio) {
        log(`Audio error: ${audio.error?.message || 'Unknown error'}`, 'error');
        notificationManager.audioError(audio.error?.message || 'Nguồn không hợp lệ');
    }

    /**
     * Setup progress controls
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Object} elements - Control elements
     */
    setupProgressControls(audio, elements) {
        let isDraggingProgress = false;

        const startProgressDrag = e => {
            e.preventDefault();
            isDraggingProgress = true;
            document.addEventListener('mousemove', updateProgressDrag);
            document.addEventListener('mouseup', stopProgressDrag);
        };

        const updateProgressDrag = e => {
            if (!isDraggingProgress || !elements.progressBar) return;
            
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            audio.currentTime = audio.duration * percentage;
            this.updateProgress(audio, elements);
        };

        const stopProgressDrag = () => {
            isDraggingProgress = false;
            document.removeEventListener('mousemove', updateProgressDrag);
            document.removeEventListener('mouseup', stopProgressDrag);
        };

        if (elements.progressBar) {
            elements.progressBar.addEventListener('mousedown', startProgressDrag);
        }
        if (elements.progressHandle) {
            elements.progressHandle.addEventListener('mousedown', startProgressDrag);
        }
    }

    /**
     * Setup volume controls
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Object} elements - Control elements
     */
    setupVolumeControls(audio, elements) {
        // Volume slider
        if (elements.volumeInput) {
            elements.volumeInput.addEventListener('input', e => {
                e.stopPropagation();
                const volume = e.target.value / 100;
                audio.volume = volume;
                this.volume = volume;
                this.updateVolumeIcon(elements.volumeIcon, volume);
            });
        }

        // Volume icon click
        if (elements.volumeIcon) {
            elements.volumeIcon.addEventListener('click', e => {
                e.stopPropagation();
                audio.volume = audio.volume > 0 ? 0 : 1;
                this.volume = audio.volume;
                
                if (elements.volumeInput) {
                    elements.volumeInput.value = audio.volume * 100;
                }
                
                this.updateVolumeIcon(elements.volumeIcon, audio.volume);
            });
        }
    }

    /**
     * Update volume icon based on volume level
     * @param {HTMLElement} volumeIcon - Volume icon element
     * @param {number} volume - Current volume (0-1)
     */
    updateVolumeIcon(volumeIcon, volume) {
        if (!volumeIcon) return;
        
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    }

    /**
     * Setup audio button
     * @param {HTMLElement} button - Listen button
     * @param {string} text - Text to play
     * @param {boolean} isSingleWord - Whether text is single word
     */
    setupAudioButton(button, text, isSingleWord) {
        if (!button) return;

        const icon = button.querySelector('.xt-btn-icon');
        const textSpan = button.querySelector('.xt-btn-text');
        const audioId = Date.now();

        const toggleAudio = async () => {
            try {
                // Handle pause/resume
                if (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) {
                    this.currentAudio.pause();
                    this.isPlaying = false;
                    if (icon) icon.textContent = "▶️";
                    if (textSpan) textSpan.textContent = "Tiếp tục";
                    return;
                }

                // Handle resume
                if (this.currentAudio && !this.currentAudio.ended) {
                    try {
                        await this.currentAudio.play();
                        this.isPlaying = true;
                        if (icon) icon.textContent = "⏸️";
                        if (textSpan) textSpan.textContent = "Dừng";
                    } catch (err) {
                        log(`Resume playback failed: ${err.message}`, 'error');
                        notificationManager.audioError(err.message || 'Lỗi không xác định');
                    }
                    return;
                }

                // Start new audio
                await this.startNewAudio(text, button, icon, textSpan, audioId);

            } catch (error) {
                log(`Audio setup error: ${error.message}`, 'error');
                notificationManager.audioError("Lỗi khi thiết lập âm thanh");
                this.resetButtonState(icon, textSpan);
            }
        };

        button.addEventListener('click', toggleAudio);
    }

    /**
     * Start new audio playback
     * @param {string} text - Text to play
     * @param {HTMLElement} button - Listen button
     * @param {HTMLElement} icon - Button icon
     * @param {HTMLElement} textSpan - Button text
     * @param {string} audioId - Audio ID
     */
    async startNewAudio(text, button, icon, textSpan, audioId) {
        // Stop current audio
        this.stop();
        
        // Disable button and show loading
        button.disabled = true;
        if (icon) icon.textContent = "⏳";
        if (textSpan) textSpan.textContent = "Đang tải...";

        try {
            // Get audio URL
            const audioUrl = await apiService.textToSpeech(text);
            if (!audioUrl) {
                this.resetButtonState(icon, textSpan);
                return;
            }

            // Create audio element
            this.currentAudioUrl = audioUrl;
            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.volume = this.volume;

            // Setup audio controls
            document.body.insertAdjacentHTML('beforeend', this.createAudioControls(audioId));
            this.setupAudioControls(this.currentAudio, audioId, document.querySelector('.xt-translator-popup'));

            // Play audio
            await this.currentAudio.play();
            this.isPlaying = true;
            
            if (icon) icon.textContent = "⏸️";
            if (textSpan) textSpan.textContent = "Dừng";
            button.disabled = false;

            log('Audio playback started successfully', 'info');

        } catch (error) {
            log(`Audio playback failed: ${error.message}`, 'error');
            notificationManager.audioError(error.message || 'Lỗi không xác định');
            this.resetButtonState(icon, textSpan);
        }
    }

    /**
     * Reset button state
     * @param {HTMLElement} icon - Button icon
     * @param {HTMLElement} textSpan - Button text
     */
    resetButtonState(icon, textSpan) {
        if (icon) icon.textContent = "🔊";
        if (textSpan) textSpan.textContent = "Nghe";
    }

    /**
     * Get current audio state
     * @returns {Object} Audio state
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            hasAudio: !!this.currentAudio,
            volume: this.volume,
            currentTime: this.currentAudio?.currentTime || 0,
            duration: this.currentAudio?.duration || 0
        };
    }

    /**
     * Set volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.currentAudio) {
            this.currentAudio.volume = this.volume;
        }
    }

    /**
     * Get volume
     * @returns {number} Current volume
     */
    getVolume() {
        return this.volume;
    }
}

// Create singleton instance
const audioPlayer = new AudioPlayer();

// Export for backward compatibility
export function stopCurrentAudio() {
    audioPlayer.stop();
}

export function createAudioControls(audioId) {
    return audioPlayer.createAudioControls(audioId);
}

export function setupAudioControls(audio, controlsId, popup) {
    audioPlayer.setupAudioControls(audio, controlsId, popup);
}

export function setupAudioButton(button, text, isSingleWord) {
    audioPlayer.setupAudioButton(button, text, isSingleWord);
}

export default audioPlayer; 