let currentAudio = null;
let currentAudioUrl = null;
const ttsAudioCache = {};

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (currentAudioUrl && !Object.values(ttsAudioCache).includes(currentAudioUrl)) {
        URL.revokeObjectURL(currentAudioUrl);
    }
    currentAudioUrl = null;
    document.querySelectorAll('.xt-audio-controls').forEach(control => control.remove());
}

function createAudioControls(audioId) {
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

function setupAudioControls(audio, controlsId, popup) {
    const controls = document.getElementById(`audio-controls-${controlsId}`);
    if (!controls) return;

    const popupRect = popup.getBoundingClientRect();
    Object.assign(controls.style, {
        position: 'fixed',
        zIndex: '2147483647',
        left: `${popupRect.right + 10}px`,
        top: `${popupRect.top}px`
    });

    const elements = {
        progressBar: controls.querySelector('.xt-progress-bar'),
        progressFill: controls.querySelector('.xt-progress-fill'),
        progressHandle: controls.querySelector('.xt-progress-handle'),
        currentTime: controls.querySelector('.xt-current-time'),
        totalTime: controls.querySelector('.xt-total-time'),
        volumeInput: controls.querySelector('.xt-volume-input'),
        volumeIcon: controls.querySelector('.xt-volume-icon')
    };

    const formatTime = seconds => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const updateProgress = () => {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            elements.progressFill.style.width = `${progress}%`;
            elements.progressHandle.style.left = `${progress}%`;
            elements.currentTime.textContent = formatTime(audio.currentTime);
        }
    };

    audio.addEventListener('loadedmetadata', () => {
        console.log("Audio metadata:", {
            duration: audio.duration,
            src: audio.src,
            readyState: audio.readyState
        });
        elements.totalTime.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', updateProgress);

    audio.addEventListener('ended', () => {
        elements.progressFill.style.width = '0%';
        elements.progressHandle.style.left = '0%';
        elements.currentTime.textContent = '0:00';
        const button = popup?.querySelector('.xt-listen-btn');
        if (button) {
            button.querySelector('.xt-btn-icon').textContent = "🔊";
            button.querySelector('.xt-btn-text').textContent = "Nghe";
        }
    });

    audio.addEventListener('error', (e) => {
        console.error("Audio error:", {
            error: e,
            code: audio.error?.code,
            message: audio.error?.message
        });
        showNotification(`Lỗi phát âm thanh: ${audio.error?.message || 'Nguồn không hợp lệ'}`, "error");
    });

    let isDraggingProgress = false;
    const startProgressDrag = e => {
        e.preventDefault();
        isDraggingProgress = true;
        document.addEventListener('mousemove', updateProgressDrag);
        document.addEventListener('mouseup', stopProgressDrag);
    };

    const updateProgressDrag = e => {
        if (!isDraggingProgress) return;
        const rect = elements.progressBar.getBoundingClientRect();
        const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        audio.currentTime = audio.duration * percentage;
        updateProgress();
    };

    const stopProgressDrag = () => {
        isDraggingProgress = false;
        document.removeEventListener('mousemove', updateProgressDrag);
        document.removeEventListener('mouseup', stopProgressDrag);
    };

    elements.progressBar.addEventListener('mousedown', startProgressDrag);
    elements.progressHandle.addEventListener('mousedown', startProgressDrag);

    elements.volumeInput.addEventListener('input', e => {
        e.stopPropagation();
        const volume = e.target.value / 100;
        audio.volume = volume;
        elements.volumeIcon.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
    });

    elements.volumeIcon.addEventListener('click', e => {
        e.stopPropagation();
        audio.volume = audio.volume > 0 ? 0 : 1;
        elements.volumeInput.value = audio.volume * 100;
        elements.volumeIcon.textContent = audio.volume === 0 ? '🔇' : '🔊';
    });

    controls.addEventListener('click', e => e.stopPropagation());
}

function setupAudioButton(button, text, isSingleWord) {
    if (!button) return;
    const icon = button.querySelector('.xt-btn-icon');
    const textSpan = button.querySelector('.xt-btn-text');
    const audioId = Date.now();

    const toggleAudio = async () => {
        if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
            currentAudio.pause();
            icon.textContent = "▶️";
            textSpan.textContent = "Tiếp tục";
            return;
        }

        if (!currentAudio || currentAudio.ended) {
            stopCurrentAudio();
            button.disabled = true;
            icon.textContent = "⏳";
            textSpan.textContent = "Đang tải...";

            const audioUrl = await textToSpeech(text);
            if (audioUrl) {
                console.log("Audio URL received:", audioUrl);
                currentAudioUrl = audioUrl;
                currentAudio = new Audio(audioUrl);
                currentAudio.addEventListener('ended', () => {
                    icon.textContent = "🔊";
                    textSpan.textContent = "Nghe";
                });
                currentAudio.addEventListener('error', (e) => {
                    console.error("Audio playback error:", {
                        error: e,
                        code: currentAudio.error?.code,
                        message: currentAudio.error?.message
                    });
                    showNotification(`Lỗi phát âm thanh: ${currentAudio.error?.message || 'Nguồn không hợp lệ'}`, "error");
                    icon.textContent = "🔊";
                    textSpan.textContent = "Nghe";
                    button.disabled = false;
                });
                currentAudio.addEventListener('loadedmetadata', () => {
                    console.log("Audio metadata loaded:", {
                        duration: currentAudio.duration,
                        src: currentAudio.src,
                        readyState: currentAudio.readyState
                    });
                });
                document.body.insertAdjacentHTML('beforeend', createAudioControls(audioId));
                setupAudioControls(currentAudio, audioId, popup);
                try {
                    console.log("Attempting to play audio:", audioUrl);
                    await currentAudio.play();
                    console.log("Audio playing:", audioUrl);
                    icon.textContent = "⏸️";
                    textSpan.textContent = "Dừng";
                    button.disabled = false;
                } catch (err) {
                    console.error("Playback failed:", {
                        error: err,
                        message: err.message
                    });
                    showNotification(`Không thể phát âm thanh: ${err.message || 'Lỗi không xác định'}`, "error");
                    icon.textContent = "🔊";
                    textSpan.textContent = "Nghe";
                    button.disabled = false;
                    return;
                }
            } else {
                icon.textContent = "🔊";
                textSpan.textContent = "Nghe";
                button.disabled = false;
                return;
            }
        } else {
            try {
                console.log("Resuming audio:", currentAudio.src);
                await currentAudio.play();
                icon.textContent = "⏸️";
                textSpan.textContent = "Dừng";
                button.disabled = false;
            } catch (err) {
                console.error("Resume playback failed:", {
                    error: err,
                    message: err.message
                });
                showNotification(`Không thể tiếp tục âm thanh: ${err.message || 'Lỗi không xác định'}`, "error");
                return;
            }
        }
    };

    button.addEventListener('click', toggleAudio);
}