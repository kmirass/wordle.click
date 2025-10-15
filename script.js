// Configuración de la API
const API_CONFIG = {
    baseUrl: 'https://api.wordle.click/api/v1',
    endpoints: {
        word: '/word',
        validate: '/validate',
        stats: '/stats'
    }
};

// Sistema de internacionalización
const I18N = {
    currentLang: 'en',
    translations: {
        en: {
            ENTER: 'ENTER',
            BACKSPACE: 'DELETE',
            ATTEMPTS: 'Attempts',
            WIN_MESSAGE: 'Congratulations! You guessed the word!',
            LOSE_MESSAGE: 'Game over! The word was: ',
            INVALID_WORD: 'Word not in word list',
            NEED_5_LETTERS: 'Word must be 5 letters',
            LOADING: 'Loading...',
            ERROR_API: 'Error connecting to server'
        },
        es: {
            ENTER: 'ENVIAR',
            BACKSPACE: 'BORRAR',
            ATTEMPTS: 'Intentos',
            WIN_MESSAGE: '¡Felicidades! ¡Adivinaste la palabra!',
            LOSE_MESSAGE: '¡Juego terminado! La palabra era: ',
            INVALID_WORD: 'Palabra no válida',
            NEED_5_LETTERS: 'La palabra debe tener 5 letras',
            LOADING: 'Cargando...',
            ERROR_API: 'Error de conexión al servidor'
        }
    },

    init() {
        // Cargar idioma desde localStorage o URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        const savedLang = localStorage.getItem('wordle-lang');
        
        this.currentLang = urlLang || savedLang || 'es';
        this.updateUI();
    },

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('wordle-lang', lang);
        this.updateUI();
        // Reiniciar el juego con el nuevo idioma
        Game.init();
    },

    get(key) {
        return this.translations[this.currentLang][key] || key;
    },

    updateUI: function() {
        // Actualizar elementos con data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.get(key);
        });

        // Actualizar alt del SVG del botón ENTER
        const enterKey = document.getElementById('enter-key').querySelector('.key-text img');
        if (enterKey) {
            enterKey.alt = this.get('ENTER');
        }

        // Actualizar menú de idioma
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-lang') === this.currentLang) {
                opt.classList.add('active');
            }
        });

        // Mostrar u ocultar la Ñ en el teclado según el idioma
        const row2 = document.getElementById('keyboard-row-2');
        if (row2) {
            let btnÑ = document.getElementById('key-n-esp');
            if (this.currentLang === 'es') {
                if (!btnÑ) {
                    btnÑ = document.createElement('button');
                    btnÑ.className = 'key key-esp key-hidden';
                    btnÑ.setAttribute('data-key', 'Ñ');
                    btnÑ.id = 'key-n-esp';
                    btnÑ.textContent = 'Ñ';
                    const btnL = row2.querySelector('[data-key="L"]');
                    btnL.after(btnÑ);
                    
                    // Aplicar transición después de añadir al DOM
                    setTimeout(() => {
                        btnÑ.classList.remove('key-hidden');
                    }, 10);
                }
            } else {
                if (btnÑ) {
                    // Animación suave de desaparición
                    btnÑ.classList.add('key-hidden');
                    
                    // Eliminar después de la transición
                    setTimeout(() => {
                        if (btnÑ && btnÑ.parentNode) {
                            btnÑ.remove();
                        }
                    }, 400); // Duración de la animación
                }
            }
        }
    }
};

// API Service
const API = {
    async getTodayWord() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.word}?lang=${I18N.currentLang}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching today\'s word:', error);
            throw error;
        }
    },

    async validateWord(word) {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.validate}/${word}?lang=${I18N.currentLang}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            // Fallback: aceptar cualquier palabra de 5 letras para desarrollo
            console.log('API not available, using fallback validation for:', word);
            return { valid: word.length === 5 && /^[A-ZÑ]+$/.test(word) };
        }
    },

    async getStats() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.stats}?lang=${I18N.currentLang}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }
};

// Game Logic
const Game = {
    targetWord: '',
    currentRow: 0,
    currentCol: 0,
    maxAttempts: 6,
    gameState: 'playing', // 'playing', 'won', 'lost'
    grid: [],

    async init() {
        this.resetGame();
        await this.loadTodayWord();
        this.createGrid();
        this.setupEventListeners();
        this.updateAttemptsDisplay();
    },

    resetGame() {
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameState = 'playing';
        this.grid = Array(6).fill(null).map(() => Array(5).fill(''));
        this.clearMessages();
        this.resetKeyboard();
    },

    async loadTodayWord() {
        try {
            this.showMessage(I18N.get('LOADING'));
            const response = await API.getTodayWord();
            this.targetWord = response.word.toUpperCase();
            this.clearMessages();
            console.log('Target word loaded:', this.targetWord); // Para debugging
        } catch (error) {
            // Fallback con palabras de prueba para desarrollo
            const fallbackWords = {
                'en': ['HOUSE', 'WATER', 'PLANT', 'MUSIC', 'LIGHT'],
                'es': ['CASA', 'AGUA', 'PLANTA', 'MUSICA', 'LUCES']
            };
            const words = fallbackWords[I18N.currentLang] || fallbackWords['en'];
            this.targetWord = words[Math.floor(Math.random() * words.length)];
            console.log('Using fallback word:', this.targetWord);
            this.clearMessages();
        }
    },

    createGrid() {
        const gameGrid = document.getElementById('game-grid');
        gameGrid.innerHTML = '';

        for (let row = 0; row < 6; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'grid-row';
            rowElement.id = `row-${row}`;

            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${row}-${col}`;
                rowElement.appendChild(cell);
            }

            gameGrid.appendChild(rowElement);
        }
    },

    setupEventListeners: function() {
        // Evitar añadir listeners múltiples si ya fueron inicializados
        if (this._listenersInitialized) return;
        this._listenersInitialized = true;

        // Teclado virtual (delegación)
        const keyboard = document.getElementById('keyboard');
        if (keyboard) {
            keyboard.addEventListener('click', (e) => {
                const keyEl = e.target.closest('.key');
                if (keyEl) {
                    const key = keyEl.getAttribute('data-key');
                    this.handleKeyPress(key);
                }
            });
        }

        // Teclado físico
        document.addEventListener('keydown', (e) => {
            if(e.ctrlKey || e.altKey || e.metaKey) return;
            // Evitar comportamiento por defecto sólo cuando corresponda
            // (se mantiene para prevenir scroll en algunas teclas)
            if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') {
                e.preventDefault();
            }
            if (e.key === 'Enter') {
                this.handleKeyPress('ENTER');
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('BACKSPACE');
            } else if (/^[a-zA-ZÑñ]$/.test(e.key)) {
                this.handleKeyPress(e.key.toUpperCase());
            }
        });

        // Menú de idioma con animación mejorada
        const langMenuBtn = document.getElementById('lang-menu-btn');
        const langDropdown = document.getElementById('lang-dropdown');
        if (langMenuBtn && langDropdown) {
            langMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                langDropdown.classList.toggle('hidden');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!langMenuBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                    langDropdown.classList.add('hidden');
                }
            });
        }

        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.addEventListener('click', () => {
                I18N.setLanguage(opt.getAttribute('data-lang'));
                langDropdown.classList.add('hidden');
            });
        });
    },

    handleKeyPress(key) {
        if (this.gameState !== 'playing') return;

        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.deleteLetter();
        } else if (/^[A-Z]$/.test(key)) {
            this.addLetter(key);
        }
    },

    addLetter(letter) {
        if (this.currentCol < 5) {
            this.grid[this.currentRow][this.currentCol] = letter;
            const cell = document.getElementById(`cell-${this.currentRow}-${this.currentCol}`);
            cell.textContent = letter;
            cell.classList.add('filled');
            this.currentCol++;
        }
    },

    deleteLetter() {
        if (this.currentCol > 0) {
            this.currentCol--;
            this.grid[this.currentRow][this.currentCol] = '';
            const cell = document.getElementById(`cell-${this.currentRow}-${this.currentCol}`);
            cell.textContent = '';
            cell.classList.remove('filled');
        }
    },

    async submitGuess() {
        if (this.currentCol !== 5) {
            this.showMessage(I18N.get('NEED_5_LETTERS'), 'error');
            return;
        }

        const guess = this.grid[this.currentRow].join('');
        
        // Validar palabra con la API
        try {
            const validation = await API.validateWord(guess);
            if (!validation.valid) {
                this.showMessage(I18N.get('INVALID_WORD'), 'error');
                return;
            }
        } catch (error) {
            this.showMessage(I18N.get('ERROR_API'), 'error');
            return;
        }

        // Evaluar la palabra (pasamos la fila actual antes de incrementarla)
        this.evaluateGuess(guess, this.currentRow);
        
        // Verificar estado del juego
        if (guess === this.targetWord) {
            this.gameState = 'won';
            setTimeout(() => {
                this.showMessage(I18N.get('WIN_MESSAGE'), 'success');
            }, 1500);
        } else if (this.currentRow === this.maxAttempts - 1) {
            this.gameState = 'lost';
            setTimeout(() => {
                this.showMessage(I18N.get('LOSE_MESSAGE') + this.targetWord, 'error');
            }, 1500);
        }

        this.currentRow++;
        this.currentCol = 0;
        this.updateAttemptsDisplay();
    },

    evaluateGuess(guess, rowIndex) {
        const targetArray = Array.from(this.targetWord);
        const guessArray = Array.from(guess);
        const result = Array(5).fill('absent');
        const used = Array(5).fill(false);

        // Primera pasada: marcar letras correctas
        for (let i = 0; i < 5; i++) {
            if (guessArray[i] === targetArray[i]) {
                result[i] = 'correct';
                used[i] = true;
            }
        }

        // Segunda pasada: marcar letras presentes pero en posición incorrecta
        for (let i = 0; i < 5; i++) {
            if (result[i] === 'absent') {
                for (let j = 0; j < 5; j++) {
                    if (!used[j] && guessArray[i] === targetArray[j] && result[j] !== 'correct') {
                        result[i] = 'present';
                        used[j] = true;
                        break;
                    }
                }
            }
        }

        // Aplicar resultados con animación
        this.applyResults(result, guessArray, rowIndex);
    },

    applyResults(result, guessArray, rowIndex) {
        const row = document.getElementById(`row-${rowIndex}`);
        row.classList.add('row-reveal');

        result.forEach((state, index) => {
            setTimeout(() => {
                const cell = document.getElementById(`cell-${rowIndex}-${index}`);
                cell.classList.add(state);
                
                // Actualizar teclado
                this.updateKeyboard(guessArray[index], state);
            }, index * 100);
        });
    },

    updateKeyboard(letter, state) {
        const key = document.querySelector(`[data-key="${letter}"]`);
        if (key) {
            // Solo actualizar si el nuevo estado es mejor que el actual
            const currentClasses = key.classList;
            if (state === 'correct' || 
                (state === 'present' && !currentClasses.contains('correct')) ||
                (state === 'absent' && !currentClasses.contains('correct') && !currentClasses.contains('present'))) {
                key.classList.remove('correct', 'present', 'absent');
                key.classList.add(state);
            }
        }
    },

    resetKeyboard() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
    },

    showMessage(text, type = '') {
        const messageContainer = document.getElementById('message-container');
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        
        if (type === 'error') {
            setTimeout(() => {
                this.clearMessages();
            }, 2000);
        }
    },

    clearMessages() {
        document.getElementById('message-container').innerHTML = '';
    },

    updateAttemptsDisplay() {
        const attemptsElement = document.getElementById('attempts-count');
        attemptsElement.textContent = `${this.currentRow}/${this.maxAttempts}`;
    }
};

// Tema claro/oscuro
const Theme = {
    current: 'dark',
    icons: {
        dark: 'assets/icons/moon_white.svg',
        light: 'assets/icons/sun_black.svg',
        send: {
            dark: 'assets/icons/send_white.svg',
            light: 'assets/icons/send_black.svg'
        },
        delete: {
            dark: 'assets/icons/delete_white.svg',
            light: 'assets/icons/delete_black.svg'
        },
        language: {
            dark: 'assets/icons/language_white.svg',
            light: 'assets/icons/language_black.svg'
        }
    },

    init() {
        const saved = localStorage.getItem('wordle-theme');
        if (saved === 'light') {
            this.setLight();
        } else {
            this.setDark();
        }
        this.setupToggle();
    },

    setupToggle() {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        btn.onclick = () => {
            if (this.current === 'dark') {
                this.setLight();
            } else {
                this.setDark();
            }
        };
    },

    setLight() {
        document.body.classList.add('light-mode');
        this.current = 'light';
        localStorage.setItem('wordle-theme', 'light');
        this.animateThemeIconChange(this.icons.light, 'Modo claro');
        this.updateIcons();
    },

    setDark() {
        document.body.classList.remove('light-mode');
        this.current = 'dark';
        localStorage.setItem('wordle-theme', 'dark');
        this.animateThemeIconChange(this.icons.dark, 'Modo oscuro');
        this.updateIcons();
    },
    
    animateThemeIconChange(newSrc, newAlt) {
        const themeIcon = document.getElementById('theme-icon');
        
        // Simple fade out and fade in with icon change
        themeIcon.style.transition = 'opacity var(--animation-duration) ease-in-out, transform var(--animation-duration) ease-in-out';
        themeIcon.style.opacity = '0';
        themeIcon.style.transform = 'scale(0.8)';
        
        // Change icon at the middle of the animation
        setTimeout(() => {
            themeIcon.src = newSrc;
            themeIcon.alt = newAlt;
            themeIcon.style.opacity = '1';
            themeIcon.style.transform = 'scale(1)';
        }, 400); // Half of animation duration (800ms / 2)
    },

    updateIcons() {
        // Send
        const sendIcon = document.querySelector('#enter-key .key-text img');
        if (sendIcon) {
            sendIcon.src = this.icons.send[this.current];
        }
        // Delete
        const deleteIcon = document.querySelector('#backspace-key .key-text img');
        if (deleteIcon) {
            deleteIcon.src = this.icons.delete[this.current];
        }
        // Language
        const langIcon = document.querySelector('#lang-menu-btn img');
        if (langIcon) {
            langIcon.src = this.icons.language[this.current];
        }
    }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    Theme.init();
    I18N.init();
    await Game.init();
});
