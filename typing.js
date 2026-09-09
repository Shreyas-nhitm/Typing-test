// ============================================================
//  HippoType — Clean, Streamlined Application Script
//  Features: Minimal UI, Google Sheets / Offline Backend,
//  Meaningful Sentences, Code Snippets, Stenography, Leaderboard
// ============================================================

// Google Apps Script Web App URL (Google Sheets Backend)
const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDTeGx_jvQTOjBNy8fdGOu_fVn9VUZm5v2pWVKBavgsvoXJ__Ixqrs7WFOuRorOX6X/exec';

function getGoogleScriptUrl() {
    return localStorage.getItem('hippotype_script_url') || DEFAULT_GOOGLE_SCRIPT_URL;
}

function setGoogleScriptUrl(url) {
    if (url && url.trim()) {
        localStorage.setItem('hippotype_script_url', url.trim());
    } else {
        localStorage.removeItem('hippotype_script_url');
    }
}

let gameState = {
    isTyping: false, startTime: 0, currentCharIndex: 0,
    totalChars: 0, correctChars: 0, totalErrors: 0,
    consecutiveErrors: 0, combo: 0, maxCombo: 0,
    testMode: '60s', difficulty: 'medium', language: 'en',
    codeLanguage: 'python', wordList: [], targetText: '',
    wpmHistory: [], timerInterval: null, chartInterval: null,
    isCustomText: false, adaptiveHistory: []
};

let auth = { username: null };
let rescueTokens = 3;

let userProfile = {
    stats: { totalTests: 0, bestWPM: 0, avgWPM: 0, avgAccuracy: 0, streak: 0 },
    achievements: {
        speedDemon: { name: "Speed Demon", desc: "Reach 80 WPM", icon: "⚡", threshold: 80, unlocked: false },
        perfectionist: { name: "Perfectionist", desc: "100% accuracy", icon: "✨", threshold: 100, unlocked: false },
        marathon: { name: "Marathon", desc: "Complete 5-min test", icon: "🏃", unlocked: false },
        combo50: { name: "Combo Master", desc: "50 combo streak", icon: "🔥", threshold: 50, unlocked: false },
        persistent: { name: "Persistent", desc: "10 tests completed", icon: "💪", threshold: 10, unlocked: false },
    },
    preferences: { theme: 'ocean', fontSize: 24, smoothCaret: true, blindMode: false, adaptiveMode: false }
};

// ──── Meaningful Sentence Banks ────
const sentenceBanks = {
    en: {
        easy: [
            "The sun is shining bright today.", "I love to read good books.",
            "She smiled and waved at me.", "The cat sat on the warm mat.",
            "We had a great time together.", "Keep going and never give up.",
            "Today is a beautiful new day.", "Birds sing songs in the morning.",
            "Good things come to those who wait.", "Dreams can come true with hard work."
        ],
        medium: [
            "Believe in yourself and all that you are capable of achieving.",
            "The journey of a thousand miles begins with a single step.",
            "Success is not final and failure is not fatal.",
            "Every morning brings new potential for growth and learning.",
            "The greatest glory lies not in never falling but in rising.",
            "Happiness depends upon ourselves and the choices we make.",
            "Education is the most powerful weapon which you can use.",
            "The best way to predict the future is to create it."
        ],
        hard: [
            "The extraordinary achievements of humanity demonstrate that persistence can overcome obstacles.",
            "Scientific discoveries have shown that the universe operates according to elegant mathematical principles.",
            "Throughout the centuries, philosophers have debated the fundamental nature of consciousness and free will.",
            "Environmental sustainability requires a comprehensive approach that balances economic development."
        ],
        expert: [
            "The epistemological foundations of scientific methodology rest upon philosophical frameworks established earlier.",
            "Contemporary neuroscience has revealed the extraordinary plasticity of the human brain over time.",
            "The mathematical elegance of fundamental physical theories suggests a profound connection between abstract structures and observable phenomena."
        ]
    },
    es: {
        easy: ["El sol brilla hoy.", "Me gusta leer.", "El gato duerme.", "Buenos dias a todos.", "Vamos a jugar."],
        medium: ["El viaje de mil millas comienza con un solo paso.", "La educación es el arma más poderosa.", "Siempre parece imposible hasta que se hace."],
        hard: ["Las extraordinarias maravillas del mundo nos enseñan a apreciar la belleza de la naturaleza en todas sus formas."],
        expert: ["Los principios epistemológicos de la ciencia moderna requieren una evaluación rigurosa y un análisis profundo."]
    },
    fr: {
        easy: ["Le soleil brille aujourd'hui.", "J'aime lire des livres.", "Le chat dort bien.", "Bonjour tout le monde."],
        medium: ["Le voyage de mille lieues commence par un seul pas.", "L'éducation est l'arme la plus puissante."],
        hard: ["Les merveilles extraordinaires du monde nous apprennent à apprécier la beauté de la nature."],
        expert: ["Les principes épistémologiques de la science moderne exigent une évaluation rigoureuse."]
    },
    de: {
        easy: ["Die Sonne scheint heute.", "Ich lese gerne Bücher.", "Die Katze schläft gut.", "Guten Morgen zusammen."],
        medium: ["Die Reise von tausend Meilen beginnt mit einem einzigen Schritt.", "Bildung ist die mächtigste Waffe."],
        hard: ["Die außergewöhnlichen Wunder der Welt lehren uns, die Schönheit der Natur zu schätzen."],
        expert: ["Die erkenntnistheoretischen Prinzipien der modernen Wissenschaft erfordern eine strenge Bewertung."]
    },
    steno: {
        easy: [
            "The quick brown fox jumps over the lazy dog.",
            "Please record the witness statement accurately.",
            "The court is now in session for the hearing."
        ],
        medium: [
            "The defendant is required to answer the questions truthfully.",
            "Stenography requires immense focus and muscle memory.",
            "All evidence must be marked and submitted to the clerk."
        ],
        hard: [
            "Cross examination of the primary witness will begin immediately.",
            "The plaintiff's attorney has filed a motion for discovery.",
            "Transcribing rapid dialogue is the ultimate test of a reporter."
        ]
    }
};

// ──── Code Snippet Banks ────
const codeSnippets = {
    c: {
        easy: ['#include <stdio.h>\nint main() { printf("Hello World\\n"); return 0; }'],
        medium: ['int binarySearch(int arr[], int l, int r, int x) {\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (arr[m] == x) return m;\n    }\n    return -1;\n}'],
        hard: ['struct Node* reverse(struct Node* head) {\n    struct Node* prev = NULL;\n    struct Node* curr = head;\n    while (curr) { struct Node* next = curr->next; curr->next = prev; prev = curr; curr = next; }\n    return prev;\n}']
    },
    cpp: {
        easy: ['#include <iostream>\nusing namespace std;\nint main() { cout << "Hello"; return 0; }'],
        medium: ['vector<int> v = {1, 2, 3};\nsort(v.begin(), v.end(), greater<int>());'],
        hard: ['template<typename T>\nclass SmartPointer { T* ptr; public: explicit SmartPointer(T* p = NULL) { ptr = p; } ~SmartPointer() { delete ptr; } };']
    },
    python: {
        easy: ['print("Hello World")', 'for i in range(10):\n    print(i)', 'fruits = ["apple", "banana"]\nfor fruit in fruits:\n    print(fruit)'],
        medium: ['def factorial(n):\n    return 1 if n <= 1 else n * factorial(n - 1)', 'filtered = [x for x in numbers if x > 5]'],
        hard: ['def merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    return merge(merge_sort(arr[:mid]), merge_sort(arr[mid:]))']
    },
    java: {
        easy: ['System.out.println("Hello World");', 'int[] nums = {1, 2, 3, 4, 5};'],
        medium: ['public class Calculator {\n    public int add(int a, int b) { return a + b; }\n}'],
        hard: ['public class ThreadSafeQueue<T> {\n    private final Queue<T> queue = new LinkedList<>();\n    private final ReentrantLock lock = new ReentrantLock();\n}']
    },
    react: {
        easy: ['function App() { return <h1>Hello World</h1>; }', 'const [count, setCount] = useState(0);'],
        medium: ['useEffect(() => {\n  fetchData();\n}, []);', 'const ThemeContext = createContext("light");'],
        hard: ['function useDebounce(value, delay) {\n  const [debounced, setDebounced] = useState(value);\n  return debounced;\n}']
    }
};

/* ===== DOM INITIALIZATION ===== */
const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    [
        'testMode', 'difficulty', 'language', 'codeLanguage', 'code-lang-group',
        'newGameBtn', 'customTextBtn', 'leaderboardBtn', 'settingsBtn',
        'wpm', 'accuracy', 'timer', 'combo', 'errors', 'progressBar',
        'game-area', 'target-words', 'cursor', 'focus-prompt', 'steno-funnel',
        'results-panel', 'finalWPM', 'finalAccuracy', 'finalTime', 'finalCombo',
        'totalChars', 'correctCharsCount', 'totalErrorsCount', 'rawWPM',
        'retryBtn', 'nextBtn', 'shareBtn', 'wpmChart', 'results-mode-tag',
        'settings-modal', 'closeSettings', 'themeSelect', 'fontSize', 'fontSizeValue',
        'blindMode', 'adaptiveMode', 'adaptive-badge', 'exportStats', 'resetStats',
        'logoutBtn', 'welcomeUser', 'loading-screen',
        'custom-text-modal', 'closeCustomText', 'customTextArea', 'useCustomTextBtn', 'clearCustomTextBtn',
        'leaderboard-modal', 'closeLeaderboard', 'leaderboardTable', 'leaderboardBody',
        'leaderboard-loading', 'leaderboard-error', 'lb-speed-header',
        'login-modal', 'login-username', 'login-password', 'login-btn', 'login-offline-btn',
        'login-error', 'tab-login', 'tab-signup', 'login-backend-toggle-btn', 'login-backend-config',
        'login-backend-url', 'login-save-backend-btn', 'login-reset-backend-btn', 'login-backend-status',
        'settings-backend-url', 'settings-save-backend-btn', 'settings-reset-backend-btn', 'settings-backend-status',
        'bestWPM', 'avgWPM', 'totalTests', 'streak', 'rescueTokens', 'achievements-panel', 'achievementsGrid'
    ].forEach(id => { elements[id] = document.getElementById(id); });

    elements.gameArea = elements['game-area'];
    elements.targetWords = elements['target-words'];
    elements.resultsPanel = elements['results-panel'];
    elements.leaderboardLoading = elements['leaderboard-loading'];
    elements.leaderboardError = elements['leaderboard-error'];
    elements.leaderboardTable = elements['leaderboardTable'];
    elements.leaderboardBody = elements['leaderboardBody'];
    elements.lbSpeedHeader = elements['lb-speed-header'];

    loadUserProfile();
    loadAuth();
    applyPreferences();
    hideLoadingScreen();

    initializeBackendListeners();
    initializeLoginListeners();
    initializeEventListeners();

    if (!auth.username) {
        showLogin();
    } else {
        initApp();
    }
});

function initApp() {
    initializeChart();
    updateUI();
    generateText();
    displayText();
    updateAchievementsDisplay();
    setTimeout(() => elements.gameArea?.focus(), 100);
}

/* ===== GOOGLE SHEETS API ===== */
async function fetchGS(action, dataObj = {}) {
    const url = getGoogleScriptUrl();
    if (!url) {
        return { status: 'offline', message: 'Offline mode.' };
    }
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: action, ...dataObj })
        });
        return await res.json();
    } catch (e) {
        console.error('Backend connection failed:', e);
        return { status: 'error', error: 'Connection failed. Check Google Script URL or click Continue Offline.' };
    }
}

async function testBackendConnection(targetUrl) {
    const url = (targetUrl || getGoogleScriptUrl()).trim();
    if (!url) return { success: false, message: 'Please enter a valid Google Script URL.' };
    if (!url.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec')) {
        return { success: false, message: 'URL must start with "https://script.google.com/macros/s/" and end with "/exec"' };
    }
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getLeaderboard' })
        });
        const json = await res.json();
        if (json && json.status === 'success') {
            return { success: true, message: 'Connected successfully!' };
        }
        return { success: false, message: json.message || 'Error response from Google Script.' };
    } catch (err) {
        return { success: false, message: 'Could not connect. Ensure deployment access is set to "Anyone".' };
    }
}

function initializeBackendListeners() {
    const currentUrl = getGoogleScriptUrl();
    const loginUrlInput = document.getElementById('login-backend-url');
    const settingsUrlInput = document.getElementById('settings-backend-url');
    if (loginUrlInput) loginUrlInput.value = currentUrl;
    if (settingsUrlInput) settingsUrlInput.value = currentUrl;

    // Toggle backend box in login modal
    const toggleBtn = document.getElementById('login-backend-toggle-btn');
    const configBox = document.getElementById('login-backend-config');
    toggleBtn?.addEventListener('click', () => {
        configBox?.classList.toggle('hidden');
    });

    // Offline quick bypass button
    const offlineBtn = document.getElementById('login-offline-btn');
    offlineBtn?.addEventListener('click', () => {
        const username = elements['login-username']?.value?.trim() || 'Guest';
        saveAuth(username);
        hideLogin();
        if (elements.welcomeUser) elements.welcomeUser.textContent = username;
        initApp();
    });

    // Login save & test
    const loginSaveBtn = document.getElementById('login-save-backend-btn');
    const loginStatus = document.getElementById('login-backend-status');
    loginSaveBtn?.addEventListener('click', async () => {
        const url = loginUrlInput?.value?.trim() || '';
        if (loginStatus) {
            loginStatus.className = 'backend-status-msg info';
            loginStatus.textContent = 'Testing connection...';
        }
        loginSaveBtn.disabled = true;
        const testRes = await testBackendConnection(url);
        loginSaveBtn.disabled = false;
        if (testRes.success) {
            setGoogleScriptUrl(url);
            if (settingsUrlInput) settingsUrlInput.value = url;
            if (loginStatus) {
                loginStatus.className = 'backend-status-msg success';
                loginStatus.textContent = '✅ ' + testRes.message;
            }
        } else {
            if (loginStatus) {
                loginStatus.className = 'backend-status-msg error';
                loginStatus.textContent = '❌ ' + testRes.message;
            }
        }
    });

    // Login clear
    const loginResetBtn = document.getElementById('login-reset-backend-btn');
    loginResetBtn?.addEventListener('click', () => {
        setGoogleScriptUrl('');
        if (loginUrlInput) loginUrlInput.value = '';
        if (settingsUrlInput) settingsUrlInput.value = '';
        if (loginStatus) {
            loginStatus.className = 'backend-status-msg info';
            loginStatus.textContent = 'Cleared. Offline mode active.';
        }
    });

    // Settings save & test
    const settingsSaveBtn = document.getElementById('settings-save-backend-btn');
    const settingsStatus = document.getElementById('settings-backend-status');
    settingsSaveBtn?.addEventListener('click', async () => {
        const url = settingsUrlInput?.value?.trim() || '';
        if (settingsStatus) {
            settingsStatus.className = 'backend-status-msg info';
            settingsStatus.textContent = 'Testing connection...';
        }
        settingsSaveBtn.disabled = true;
        const testRes = await testBackendConnection(url);
        settingsSaveBtn.disabled = false;
        if (testRes.success) {
            setGoogleScriptUrl(url);
            if (loginUrlInput) loginUrlInput.value = url;
            if (settingsStatus) {
                settingsStatus.className = 'backend-status-msg success';
                settingsStatus.textContent = '✅ ' + testRes.message;
            }
        } else {
            if (settingsStatus) {
                settingsStatus.className = 'backend-status-msg error';
                settingsStatus.textContent = '❌ ' + testRes.message;
            }
        }
    });

    // Settings reset
    const settingsResetBtn = document.getElementById('settings-reset-backend-btn');
    settingsResetBtn?.addEventListener('click', () => {
        setGoogleScriptUrl('');
        if (loginUrlInput) loginUrlInput.value = '';
        if (settingsUrlInput) settingsUrlInput.value = '';
        if (settingsStatus) {
            settingsStatus.className = 'backend-status-msg info';
            settingsStatus.textContent = 'Reset to offline mode.';
        }
    });
}

/* ===== LOGIN & AUTH ===== */
let loginMode = 'login';

function loadAuth() {
    auth.username = localStorage.getItem('hippotypeAuth');
}

function saveAuth(username) {
    if (username) {
        localStorage.setItem('hippotypeAuth', username);
        auth.username = username;
    } else {
        localStorage.removeItem('hippotypeAuth');
        auth.username = null;
    }
}

function initializeLoginListeners() {
    elements['tab-login']?.addEventListener('click', () => {
        loginMode = 'login';
        elements['tab-login']?.classList.add('active');
        elements['tab-signup']?.classList.remove('active');
        if (elements['login-btn']) elements['login-btn'].textContent = 'Sign In';
    });

    elements['tab-signup']?.addEventListener('click', () => {
        loginMode = 'signup';
        elements['tab-signup']?.classList.add('active');
        elements['tab-login']?.classList.remove('active');
        if (elements['login-btn']) elements['login-btn'].textContent = 'Sign Up';
    });

    elements['login-btn']?.addEventListener('click', attemptLogin);

    [elements['login-username'], elements['login-password']].forEach(el => {
        el?.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });
    });

    elements.logoutBtn?.addEventListener('click', handleLogout);
}

function showLogin() {
    if (elements['login-modal']) {
        elements['login-modal'].style.display = 'flex';
        elements['login-modal'].setAttribute('aria-hidden', 'false');
    }
    setTimeout(() => elements['login-username']?.focus(), 120);
}

function hideLogin() {
    if (elements['login-modal']) {
        elements['login-modal'].style.display = 'none';
        elements['login-modal'].setAttribute('aria-hidden', 'true');
    }
}

async function attemptLogin() {
    const username = elements['login-username']?.value?.trim();
    const password = elements['login-password']?.value?.trim();

    if (!username || !password) {
        if (elements['login-error']) elements['login-error'].textContent = 'Please enter both username and password.';
        return;
    }

    elements['login-btn'].disabled = true;
    elements['login-btn'].textContent = 'Loading...';

    const passwordHash = btoa(password);
    let result;

    if (loginMode === 'signup') {
        result = await fetchGS('register', { username, password: passwordHash });
        if (result && result.status === 'success') {
            loginMode = 'login';
            result = await fetchGS('login', { username, password: passwordHash });
        }
    } else {
        result = await fetchGS('login', { username, password: passwordHash });
    }

    elements['login-btn'].disabled = false;
    elements['login-btn'].textContent = loginMode === 'signup' ? 'Sign Up' : 'Sign In';

    if (result && (result.status === 'success' || result.status === 'offline')) {
        saveAuth(username);
        if (elements['login-error']) elements['login-error'].textContent = '';
        hideLogin();
        if (elements.welcomeUser) elements.welcomeUser.textContent = auth.username;
        initApp();
    } else {
        const errorMsg = result ? (result.message || result.error) : 'Network failure.';
        if (elements['login-error']) elements['login-error'].textContent = errorMsg;
    }
}

function handleLogout() {
    saveAuth(null);
    closeSettings();
    showLogin();
    resetGame();
}

/* ===== PREFERENCES & PROFILE ===== */
function hideLoadingScreen() {
    if (elements['loading-screen']) {
        elements['loading-screen'].classList.add('fade-out');
        setTimeout(() => { elements['loading-screen'].style.display = 'none'; }, 400);
    }
}

function closeSettings() {
    if (elements['settings-modal']) {
        elements['settings-modal'].classList.add('hidden');
        elements['settings-modal'].setAttribute('aria-hidden', 'true');
    }
}

function loadUserProfile() {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
        try { Object.assign(userProfile, JSON.parse(saved)); } catch (e) { }
    }
    rescueTokens = localStorage.getItem('rescueTokens') ? parseInt(localStorage.getItem('rescueTokens'), 10) : 3;
    applyPreferences();
}

function saveUserProfile() {
    try {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        localStorage.setItem('rescueTokens', rescueTokens.toString());
    } catch (e) { }
}

function applyPreferences() {
    const prefs = userProfile.preferences || {};
    document.body.className = `theme-${prefs.theme || 'ocean'}`;
    if (elements.themeSelect) elements.themeSelect.value = prefs.theme || 'ocean';

    if (elements.targetWords) elements.targetWords.style.fontSize = `${prefs.fontSize || 24}px`;
    if (elements.fontSize) elements.fontSize.value = prefs.fontSize || 24;
    if (elements.fontSizeValue) elements.fontSizeValue.textContent = `${prefs.fontSize || 24}px`;

    if (elements.blindMode) elements.blindMode.checked = !!prefs.blindMode;
    if (elements.adaptiveMode) elements.adaptiveMode.checked = !!prefs.adaptiveMode;
    if (elements['adaptive-badge']) elements['adaptive-badge'].classList.toggle('hidden', !prefs.adaptiveMode);

    if (elements.welcomeUser) elements.welcomeUser.textContent = auth.username || 'Guest';
}

/* ===== EVENT LISTENERS ===== */
let tabPressedTime = 0;

function initializeEventListeners() {
    elements.newGameBtn?.addEventListener('click', startNewGame);
    elements.retryBtn?.addEventListener('click', startNewGame);
    elements.nextBtn?.addEventListener('click', startNewGame);
    elements.shareBtn?.addEventListener('click', shareResults);

    elements.settingsBtn?.addEventListener('click', () => {
        const currentUrl = getGoogleScriptUrl();
        const settingsInput = document.getElementById('settings-backend-url');
        if (settingsInput) settingsInput.value = currentUrl;
        const statusEl = document.getElementById('settings-backend-status');
        if (statusEl) {
            statusEl.className = 'backend-status-msg ' + (currentUrl ? 'info' : '');
            statusEl.textContent = currentUrl ? 'Connected: ' + currentUrl.slice(0, 35) + '...' : 'Offline mode active';
        }
        elements['settings-modal'].classList.remove('hidden');
        elements['settings-modal'].setAttribute('aria-hidden', 'false');
    });

    elements.closeSettings?.addEventListener('click', () => {
        elements['settings-modal'].classList.add('hidden');
        elements['settings-modal'].setAttribute('aria-hidden', 'true');
        saveUserProfile();
    });

    elements.gameArea?.addEventListener('click', () => {
        if (elements.language?.value === 'steno') elements['steno-funnel']?.focus();
        else elements.gameArea.focus();
    });

    elements.gameArea?.addEventListener('keydown', handleKeyDown);

    elements.gameArea?.addEventListener('focus', () => {
        if (elements['focus-prompt']) elements['focus-prompt'].style.opacity = '0';
    });

    elements.gameArea?.addEventListener('blur', () => {
        if (!gameState.isTyping && elements['focus-prompt']) elements['focus-prompt'].style.opacity = '1';
    });

    // Steno Funnel
    elements['steno-funnel']?.addEventListener('input', handleStenoInput);

    // Global shortcut: Tab + Enter restarts game instantly
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            tabPressedTime = Date.now();
        } else if (e.key === 'Enter' && Date.now() - tabPressedTime < 600) {
            e.preventDefault();
            startNewGame();
        }
    });

    // Config dropdowns
    elements.testMode?.addEventListener('change', () => { gameState.isCustomText = false; startNewGame(); });
    elements.difficulty?.addEventListener('change', () => { gameState.isCustomText = false; startNewGame(); });

    elements.language?.addEventListener('change', (e) => {
        gameState.isCustomText = false;
        const isSteno = e.target.value === 'steno';
        if (elements['steno-funnel']) {
            elements['steno-funnel'].value = '';
            elements['steno-funnel'].style.pointerEvents = isSteno ? 'auto' : 'none';
        }

        const wpmLabel = document.getElementById('live-wpm-label');
        if (wpmLabel) wpmLabel.textContent = isSteno ? 'SPM' : 'WPM';

        if (elements['code-lang-group']) {
            elements['code-lang-group'].style.display = (e.target.value === 'code') ? 'block' : 'none';
        }

        startNewGame();
        setTimeout(() => {
            if (isSteno) elements['steno-funnel']?.focus();
            else elements.gameArea?.focus();
        }, 50);
    });

    elements.codeLanguage?.addEventListener('change', () => { gameState.isCustomText = false; generateText(); displayText(); });

    // Custom text
    elements.customTextBtn?.addEventListener('click', () => {
        elements['custom-text-modal'].classList.remove('hidden');
    });
    elements.closeCustomText?.addEventListener('click', () => {
        elements['custom-text-modal'].classList.add('hidden');
    });
    elements.useCustomTextBtn?.addEventListener('click', () => {
        const txt = elements.customTextArea?.value.trim();
        if (txt) {
            gameState.isCustomText = true;
            gameState.targetText = txt;
            elements['custom-text-modal'].classList.add('hidden');
            resetGame();
            displayText();
            setTimeout(() => elements.gameArea.focus(), 50);
        }
    });
    elements.clearCustomTextBtn?.addEventListener('click', () => {
        if (elements.customTextArea) elements.customTextArea.value = '';
    });

    // Settings actions
    elements.themeSelect?.addEventListener('change', (e) => { userProfile.preferences.theme = e.target.value; applyPreferences(); saveUserProfile(); });
    elements.fontSize?.addEventListener('input', (e) => { userProfile.preferences.fontSize = parseInt(e.target.value, 10); applyPreferences(); saveUserProfile(); });
    elements.blindMode?.addEventListener('change', (e) => { userProfile.preferences.blindMode = e.target.checked; saveUserProfile(); });
    elements.adaptiveMode?.addEventListener('change', (e) => {
        userProfile.preferences.adaptiveMode = e.target.checked;
        if (elements['adaptive-badge']) elements['adaptive-badge'].classList.toggle('hidden', !userProfile.preferences.adaptiveMode);
        saveUserProfile();
    });
    elements.exportStats?.addEventListener('click', exportStatistics);
    elements.resetStats?.addEventListener('click', resetStatistics);

    // Leaderboard
    elements.leaderboardBtn?.addEventListener('click', showLeaderboard);
    elements.closeLeaderboard?.addEventListener('click', () => {
        elements['leaderboard-modal'].classList.add('hidden');
    });
}

function exportStatistics() {
    const data = { profile: userProfile, rescueTokens, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hippotype-stats.json`; a.click(); URL.revokeObjectURL(url);
}

function resetStatistics() {
    if (!confirm('Reset all saved statistics?')) return;
    userProfile.stats = { totalTests: 0, bestWPM: 0, avgWPM: 0, avgAccuracy: 0, streak: 0 };
    rescueTokens = 3;
    saveUserProfile(); updateUI(); updateAchievementsDisplay();
}

function shareResults() {
    const txt = `HippoType: ${elements.finalWPM?.textContent} WPM with ${elements.finalAccuracy?.textContent}% accuracy!`;
    navigator.clipboard ? navigator.clipboard.writeText(txt).then(() => alert('Result copied to clipboard!')) : alert(txt);
}

/* ===== APP LOGIC & ENGINE ===== */
function startNewGame() {
    if (!gameState.isCustomText) {
        generateText();
    }
    resetGame();
    displayText();
    setTimeout(() => {
        if (elements.language?.value === 'steno') elements['steno-funnel']?.focus();
        else elements.gameArea?.focus();
    }, 50);
}

function resetGame() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.chartInterval) clearInterval(gameState.chartInterval);

    gameState = {
        ...gameState,
        isTyping: false, startTime: 0, currentCharIndex: 0,
        totalChars: 0, correctChars: 0, totalErrors: 0, consecutiveErrors: 0,
        combo: 0, maxCombo: 0, wpmHistory: [],
        timerInterval: null, chartInterval: null
    };

    if (elements.resultsPanel) elements.resultsPanel.classList.add('hidden');
    if (elements.progressBar) elements.progressBar.style.width = '0%';

    const stenoFunnel = document.getElementById('steno-funnel');
    if (stenoFunnel) stenoFunnel.value = '';

    updateStats();
    updateProgress();
    updateCursor();
}

function generateText() {
    if (gameState.isCustomText) return;

    const mode = elements.testMode?.value || '60s';
    const diff = elements.difficulty?.value || 'medium';
    const lang = elements.language?.value || 'en';
    const codeLang = elements.codeLanguage?.value || 'python';

    gameState.testMode = mode;
    gameState.difficulty = diff;
    gameState.language = lang;
    gameState.codeLanguage = codeLang;

    let availableText = [];
    if (lang === 'code') {
        availableText = codeSnippets[codeLang]?.[diff] || codeSnippets.python.medium;
    } else {
        availableText = sentenceBanks[lang]?.[diff] || sentenceBanks.en.medium;
    }

    let itemsToPick = 2;
    if (mode.endsWith('w')) {
        itemsToPick = Math.ceil((parseInt(mode, 10) || 50) / 10);
    } else if (mode.endsWith('s')) {
        const secs = parseInt(mode, 10) || 60;
        itemsToPick = Math.ceil(secs / 10);
    } else if (mode === 'zen') {
        itemsToPick = 15;
    }

    const sentences = [];
    for (let i = 0; i < itemsToPick; i++) {
        sentences.push(availableText[Math.floor(Math.random() * availableText.length)]);
    }

    const sep = lang === 'code' ? '\n\n' : ' ';
    gameState.targetText = sentences.join(sep);
}

function displayText() {
    if (!elements.targetWords) return;
    elements.targetWords.innerHTML = '';
    const text = gameState.targetText || '';

    for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span');
        span.className = 'char pending';
        const ch = text[i];
        if (ch === ' ') {
            span.classList.add('space-char');
            span.textContent = '\u00A0';
        } else if (ch === '\n') {
            span.classList.add('newline-char');
            span.textContent = '↵\n';
        } else {
            span.textContent = ch;
        }
        elements.targetWords.appendChild(span);
    }
    updateCursor();
    updateProgress();
    updateStats();
}

function handleKeyDown(e) {
    if (elements.resultsPanel && !elements.resultsPanel.classList.contains('hidden')) return;
    if (e.repeat) return;

    if (e.key === ' ') e.preventDefault();
    if (e.ctrlKey || e.altKey || e.metaKey || ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return;

    if (!gameState.isTyping && e.key.length === 1) startTyping();
    if (!gameState.isTyping) return;

    if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
    }
    if (e.key.length === 1) {
        handleCharacterInput(e.key);
        return;
    }
    if (e.key === 'Enter') {
        handleCharacterInput('\n');
    }
}

function handleCharacterInput(key) {
    const idx = gameState.currentCharIndex;
    const targetChar = gameState.targetText[idx];
    if (typeof targetChar === 'undefined') {
        endGame();
        return;
    }

    const charSpan = elements.targetWords.children[idx];
    if (!charSpan) return;

    gameState.totalChars++;

    if (key === targetChar) {
        charSpan.classList.remove('pending', 'incorrect');
        charSpan.classList.add('correct');
        gameState.correctChars++;
        gameState.combo++;
        gameState.consecutiveErrors = 0;
        if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
    } else {
        charSpan.classList.remove('pending', 'correct');
        charSpan.classList.add('incorrect');
        gameState.totalErrors++;
        gameState.consecutiveErrors++;
        gameState.combo = 0;
    }

    gameState.currentCharIndex++;
    updateCursor();
    updateStats();
    updateProgress();

    if (gameState.currentCharIndex >= gameState.targetText.length) endGame();
}

function handleStenoInput(e) {
    if (!gameState.isTyping && e.target.value.length > 0) startTyping();
    if (!gameState.isTyping) return;

    const inputVal = e.target.value;
    let correctCount = 0;
    let errorCount = 0;
    const spans = elements.targetWords.children;

    for (let i = 0; i < spans.length; i++) {
        spans[i].className = 'char pending';
        if (gameState.targetText[i] === ' ') spans[i].classList.add('space-char');
        if (gameState.targetText[i] === '\n') spans[i].classList.add('newline-char');
    }

    for (let i = 0; i < inputVal.length; i++) {
        if (i >= gameState.targetText.length) break;
        const expected = gameState.targetText[i].toLowerCase();
        const typed = inputVal[i].toLowerCase();
        const span = spans[i];

        if (typed === expected) {
            span.classList.remove('pending', 'incorrect');
            span.classList.add('correct');
            correctCount++;
        } else {
            span.classList.remove('pending', 'correct');
            span.classList.add('incorrect');
            errorCount++;
        }
    }

    gameState.currentCharIndex = inputVal.length;
    gameState.correctChars = correctCount;
    gameState.totalErrors = errorCount;
    gameState.totalChars = inputVal.length;
    gameState.consecutiveErrors = 0;

    updateCursor();
    updateStats();
    updateProgress();

    if (gameState.currentCharIndex >= gameState.targetText.length) {
        e.target.value = '';
        endGame();
    }
}

function handleBackspace() {
    if (gameState.currentCharIndex <= 0) return;
    gameState.currentCharIndex--;
    const charSpan = elements.targetWords.children[gameState.currentCharIndex];
    if (!charSpan) return;

    if (charSpan.classList.contains('correct')) gameState.correctChars = Math.max(0, gameState.correctChars - 1);
    else if (charSpan.classList.contains('incorrect')) {
        gameState.totalErrors = Math.max(0, gameState.totalErrors - 1);
        gameState.consecutiveErrors = Math.max(0, gameState.consecutiveErrors - 1);
    }

    charSpan.className = 'char pending';
    if (gameState.targetText[gameState.currentCharIndex] === ' ') charSpan.classList.add('space-char');
    if (gameState.targetText[gameState.currentCharIndex] === '\n') charSpan.classList.add('newline-char');

    gameState.totalChars = Math.max(0, gameState.totalChars - 1);
    updateCursor();
    updateStats();
    updateProgress();
}

function startTyping() {
    gameState.isTyping = true;
    gameState.startTime = Date.now();

    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.chartInterval) clearInterval(gameState.chartInterval);

    gameState.timerInterval = setInterval(updateTimer, 250);
    gameState.chartInterval = setInterval(updateChart, 1000);
}

function updateTimer() {
    if (!elements.timer) return;
    const mode = gameState.testMode;

    if (mode === 'zen') {
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        elements.timer.textContent = formatTime(elapsed);
    } else if (mode.endsWith('s')) {
        const totalSeconds = parseInt(mode, 10) || 60;
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        elements.timer.textContent = formatTime(remaining);

        if (remaining === 0) {
            endGame();
        }
    } else {
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        elements.timer.textContent = formatTime(elapsed);
    }
}

/* ===== END GAME / STATS / ADAPTIVE ===== */
function endGame() {
    gameState.isTyping = false;
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.chartInterval) clearInterval(gameState.chartInterval);
    updateChart();

    const timeInSeconds = Math.max(1, (Date.now() - gameState.startTime) / 1000);
    const timeInMinutes = Math.max(timeInSeconds / 60, 1 / 60);
    let wpm = Math.round((gameState.correctChars / 5) / timeInMinutes) || 0;
    let rawWPM = Math.round((gameState.totalChars / 5) / timeInMinutes) || 0;
    const accuracy = gameState.totalChars > 0 ? Math.round((gameState.correctChars / gameState.totalChars) * 100) : 100;

    const maxSpeed = (gameState.language === 'steno') ? 600 : 300;
    if (wpm > maxSpeed) wpm = maxSpeed;
    if (rawWPM > maxSpeed) rawWPM = maxSpeed;

    userProfile.stats.totalTests = (parseInt(userProfile.stats.totalTests, 10) || 0) + 1;
    if (wpm > userProfile.stats.bestWPM) userProfile.stats.bestWPM = wpm;
    if (wpm >= 80) unlockAchievement('speedDemon');
    if (accuracy === 100 && gameState.totalChars > 20) unlockAchievement('perfectionist');

    const prevC = userProfile.stats.totalTests - 1;
    userProfile.stats.avgWPM = Math.round(((userProfile.stats.avgWPM || 0) * prevC + wpm) / (prevC + 1));
    userProfile.stats.avgAccuracy = Math.round(((userProfile.stats.avgAccuracy || 0) * prevC + accuracy) / (prevC + 1));

    // Adaptive mode adjustment
    if (userProfile.preferences.adaptiveMode && !gameState.isCustomText && elements.difficulty) {
        const diffs = ['easy', 'medium', 'hard', 'expert'];
        let idx = diffs.indexOf(gameState.difficulty);
        if (wpm >= 80 && accuracy >= 95 && idx < diffs.length - 1) {
            elements.difficulty.value = diffs[idx + 1];
        } else if ((wpm <= 30 || accuracy < 85) && idx > 0) {
            elements.difficulty.value = diffs[idx - 1];
        }
    }

    // Populate Results Modal
    if (elements.finalWPM) elements.finalWPM.textContent = wpm;
    if (elements.finalAccuracy) elements.finalAccuracy.textContent = accuracy;
    if (elements.finalTime) elements.finalTime.textContent = formatTime(timeInSeconds);
    if (elements.finalCombo) elements.finalCombo.textContent = gameState.maxCombo;
    if (elements.totalChars) elements.totalChars.textContent = gameState.totalChars;
    if (elements.correctCharsCount) elements.correctCharsCount.textContent = gameState.correctChars;
    if (elements.totalErrorsCount) elements.totalErrorsCount.textContent = gameState.totalErrors;
    if (elements.rawWPM) elements.rawWPM.textContent = rawWPM;

    if (elements['results-mode-tag']) {
        elements['results-mode-tag'].textContent = `${gameState.testMode} • ${gameState.difficulty}`;
    }

    if (elements.resultsPanel) elements.resultsPanel.classList.remove('hidden');

    saveUserProfile();
    updateUI();
    applyPreferences();

    // Redraw chart in results view
    setTimeout(updateChart, 50);

    if (auth.username) {
        const actualLanguage = gameState.language === 'code' ? gameState.codeLanguage : gameState.language;
        const spm = (gameState.language === 'steno') ? Math.round(gameState.totalChars / timeInMinutes) : 0;

        fetchGS('submitScore', {
            username: auth.username,
            wpm: wpm,
            spm: spm,
            accuracy: accuracy,
            total_errors: gameState.totalErrors,
            total_chars: gameState.totalChars,
            correct_chars: gameState.correctChars,
            mode: gameState.testMode,
            difficulty: elements.difficulty?.value || gameState.difficulty,
            language: actualLanguage
        });
    }
}

function unlockAchievement(k) {
    if (userProfile.achievements[k] && !userProfile.achievements[k].unlocked) {
        userProfile.achievements[k].unlocked = true;
        updateAchievementsDisplay();
    }
}

function updateAchievementsDisplay() {
    if (!elements.achievementsGrid) return;
    elements.achievementsGrid.innerHTML = '';
    Object.values(userProfile.achievements).forEach(ach => {
        const div = document.createElement('div');
        div.className = `achievement-item ${ach.unlocked ? 'unlocked' : ''}`;
        div.innerHTML = `<span style="font-size:1.4rem">${ach.icon}</span><strong>${ach.name}</strong>`;
        div.title = ach.desc;
        elements.achievementsGrid.appendChild(div);
    });
}

function updateStats() {
    if (!elements.wpm) return;
    if (!gameState.isTyping && gameState.totalChars === 0) {
        elements.wpm.textContent = '0';
        elements.accuracy.textContent = '100%';
        if (elements.errors) elements.errors.textContent = '0';
        if (elements.combo) elements.combo.textContent = '0';
        return;
    }

    const mins = Math.max(1, Date.now() - (gameState.startTime || Date.now())) / 60000;
    let wpm = Math.round((gameState.correctChars / 5) / Math.max(mins, 1 / 60)) || 0;

    const maxSpeed = (gameState.language === 'steno') ? 600 : 300;
    if (wpm > maxSpeed) wpm = maxSpeed;

    elements.wpm.textContent = wpm;
    elements.accuracy.textContent = (gameState.totalChars > 0 ? Math.round((gameState.correctChars / gameState.totalChars) * 100) : 100) + '%';
    if (elements.errors) elements.errors.textContent = gameState.totalErrors;
    if (elements.combo) elements.combo.textContent = gameState.combo;
}

function updateProgress() {
    if (elements.progressBar) {
        elements.progressBar.style.width = Math.min(100, (gameState.currentCharIndex / Math.max(1, gameState.targetText.length)) * 100) + '%';
    }
}

/* ===== LEADERBOARD LOGIC ===== */
function showLeaderboard() {
    if (!elements['leaderboard-modal']) return;
    elements['leaderboard-modal'].classList.remove('hidden');
    fetchLeaderboardData();
}

async function fetchLeaderboardData() {
    if (elements.leaderboardLoading) elements.leaderboardLoading.classList.remove('hidden');
    if (elements.leaderboardError) elements.leaderboardError.classList.add('hidden');
    if (elements.leaderboardTable) elements.leaderboardTable.classList.add('hidden');

    try {
        const result = await fetchGS('getLeaderboard');
        if (result && result.status === 'success') {
            if (result.data.length === 0) {
                elements.leaderboardError.textContent = 'No scores recorded yet.';
                elements.leaderboardError.classList.remove('hidden');
            } else {
                renderLeaderboard(result.data);
            }
        } else {
            throw new Error(result.message || 'Failed to fetch leaderboard');
        }
    } catch (error) {
        if (elements.leaderboardError) {
            elements.leaderboardError.textContent = 'Could not connect to leaderboard.';
            elements.leaderboardError.classList.remove('hidden');
        }
    } finally {
        if (elements.leaderboardLoading) elements.leaderboardLoading.classList.add('hidden');
    }
}

function renderLeaderboard(data) {
    const tbody = elements.leaderboardBody;
    if (!tbody || !elements.leaderboardTable) return;

    tbody.innerHTML = '';
    const isSteno = elements.language?.value === 'steno';

    if (elements.lbSpeedHeader) {
        elements.lbSpeedHeader.textContent = isSteno ? 'SPM' : 'WPM';
    }

    data.forEach((entry, index) => {
        const speedVal = entry.speed + (isSteno && !entry.isSteno ? ' WPM' : (!isSteno && entry.isSteno ? ' SPM' : ''));
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="rank-col">#${index + 1}</td>
            <td class="user-col">${entry.username}</td>
            <td class="speed-col">${speedVal}</td>
            <td class="acc-col">${entry.accuracy}%</td>
            <td class="date-col">${entry.date}</td>
        `;
        tbody.appendChild(tr);
    });

    elements.leaderboardTable.classList.remove('hidden');
}

function updateCursor() {
    if (!elements.cursor || !elements.gameArea || !elements.targetWords) return;
    const idx = gameState.currentCharIndex;
    if (idx < elements.targetWords.children.length) {
        const span = elements.targetWords.children[idx];
        const rect = span.getBoundingClientRect();
        const cont = elements.gameArea.getBoundingClientRect();
        elements.cursor.style.left = (rect.left - cont.left + elements.gameArea.scrollLeft) + 'px';
        elements.cursor.style.top = (rect.top - cont.top + elements.gameArea.scrollTop) + 'px';
        elements.cursor.style.height = rect.height + 'px';
        Array.from(elements.targetWords.children).forEach(s => s.classList.remove('current-char'));
        span.classList.add('current-char');

        if (rect.bottom > cont.bottom - 20) {
            elements.gameArea.scrollTop += rect.height * 2;
        }
    } else {
        elements.cursor.style.opacity = '0';
    }
}

function updateUI() {
    if (elements.bestWPM) elements.bestWPM.textContent = userProfile.stats.bestWPM || 0;
    if (elements.avgWPM) elements.avgWPM.textContent = userProfile.stats.avgWPM || 0;
    if (elements.totalTests) elements.totalTests.textContent = userProfile.stats.totalTests || 0;
    if (elements.streak) elements.streak.textContent = userProfile.stats.streak || 0;
    if (elements.welcomeUser) elements.welcomeUser.textContent = auth.username || 'Guest';
}

function formatTime(s) {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function initializeChart() {
    if (elements.wpmChart) elements.wpmChart.width = elements.wpmChart.clientWidth;
}

function updateChart() {
    if (!gameState.isTyping && gameState.wpmHistory.length === 0) return;

    if (gameState.isTyping) {
        const elapsedMin = Math.max((Date.now() - gameState.startTime) / 60000, 1 / 60);
        const wpm = Math.round((gameState.correctChars / 5) / elapsedMin) || 0;
        gameState.wpmHistory.push(wpm);
        if (gameState.wpmHistory.length > 120) gameState.wpmHistory.shift();
    }

    const canvas = elements.wpmChart;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DPR = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width * DPR;
    canvas.height = height * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, width, height);

    const padding = 12;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
        const y = padding + (height - padding * 2) * (i / 3);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    if (gameState.wpmHistory.length > 0) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0891b2';
        ctx.beginPath();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        const data = gameState.wpmHistory;
        const maxWPM = Math.max(100, Math.max(...data) + 15);

        data.forEach((val, i) => {
            const x = padding + (width - padding * 2) * (i / Math.max(1, data.length - 1));
            const y = height - padding - (Math.min(val, maxWPM) / maxWPM) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = primaryColor;
        data.forEach((val, i) => {
            const x = padding + (width - padding * 2) * (i / Math.max(1, data.length - 1));
            const y = height - padding - (Math.min(val, maxWPM) / maxWPM) * (height - padding * 2);
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
