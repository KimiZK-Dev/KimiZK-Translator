// Configuration constants for KimiZK-Translator
const CONFIG = {
    // API Configuration
    API: {
        MODEL: "meta-llama/llama-4-scout-17b-16e-instruct",
        ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
        TTS_ENDPOINT: "https://api.groq.com/openai/v1/audio/speech",
        GITHUB_RELEASES_URL: 'https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest'
    },
    
    // UI Configuration
    UI: {
        POPUP_WIDTH: 400,
        POPUP_HEIGHT: 350,
        PADDING: 15,
        Z_INDEX: 2147483647,
        ANIMATION_DURATION: 300,
        TRIGGER_DELAY: 200
    },
    
    // Audio Configuration
    AUDIO: {
        MAX_TEXT_LENGTH: 10000,
        DEFAULT_VOLUME: 1.0,
        CACHE_SIZE: 50
    },
    
    // Update Configuration
    UPDATE: {
        CHECK_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
        STARTUP_DELAY: 2000,
        INSTALL_DELAY: 3000
    },
    
    // Language Detection Patterns
    LANGUAGES: {
        chinese: /[\u4e00-\u9fff]/,
        japanese: /[\u3040-\u309f\u30a0-\u30ff]/,
        korean: /[\uac00-\ud7af]/,
        russian: /[\u0400-\u04ff]/,
        arabic: /[\u0600-\u06ff]/,
        thai: /[\u0e00-\u0e7f]/,
        vietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/,
        french: /[àâäéèêëïîôöùûüÿç]/,
        german: /[äöüß]/,
        spanish: /[ñáéíóúü]/,
        portuguese: /[ãâáàçéêíóôõú]/,
        italian: /[àèéìíîòóù]/,
        english: /^[a-zA-Z\s.,!?;:'"()-]+$/
    },
    
    // Language Names Mapping
    LANGUAGE_NAMES: {
        chinese: 'tiếng Trung',
        japanese: 'tiếng Nhật', 
        korean: 'tiếng Hàn',
        russian: 'tiếng Nga',
        arabic: 'tiếng Ả Rập',
        thai: 'tiếng Thái',
        vietnamese: 'tiếng Việt',
        french: 'tiếng Pháp',
        german: 'tiếng Đức',
        spanish: 'tiếng Tây Ban Nha',
        portuguese: 'tiếng Bồ Đào Nha',
        italian: 'tiếng Ý',
        english: 'tiếng Anh'
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
} 