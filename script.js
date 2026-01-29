class Timer {
    constructor() {
        this.timerElement = document.getElementById('timer');
        this.timerHoursElement = document.getElementById('timer-hours');
        this.timerMinutesElement = document.getElementById('timer-minutes');
        this.timerSecondsElement = document.getElementById('timer-seconds');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.statusElement = document.getElementById('status');
        this.progressBar = document.getElementById('progress-bar');
        this.savedTimeElement = document.getElementById('savedTime');
        this.todayTimeElement = document.getElementById('todayTime');
        this.daysTimeElement = document.getElementById('daysTime');
        
        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.initialTime = 0; // Начальное время в миллисекундах
        this.timerInterval = null;
        this.editingPart = null; // Какая часть таймера редактируется
        
        // Максимальное время для прогресс-бара (8 часов в миллисекундах)
        this.maxTime = 8 * 60 * 60 * 1000;
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.updateDisplay();
        this.setupEventListeners();
        this.updateTodayTime();
        this.updateDaysTime();
        
        // Если таймер был запущен до перезагрузки, продолжаем
        if (this.isRunning) {
            this.start();
        }
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        // Делаем части таймера редактируемыми
        [this.timerHoursElement, this.timerMinutesElement, this.timerSecondsElement].forEach(element => {
            element.addEventListener('click', (e) => {
                this.startEditing(element);
            });
        });
        
        // Сохраняем состояние при закрытии/обновлении страницы
        window.addEventListener('beforeunload', () => this.saveToStorage());
        
        // Обновляем сегодняшнее время каждый час
        setInterval(() => {
            this.updateTodayTime();
            this.updateDaysTime();
        }, 3600000);
    }
    
    startEditing(element) {
        if (this.editingPart) {
            this.finishEditing();
        }
        
        this.editingPart = element.dataset.part;
        const currentValue = element.textContent;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = parseInt(currentValue) || 0;
        input.className = 'timer-input';
        input.style.width = element.offsetWidth + 'px';
        
        // Устанавливаем максимальные значения
        if (this.editingPart === 'hours') {
            input.min = 0;
            input.max = 23;
        } else {
            input.min = 0;
            input.max = 59;
        }
        
        // Заменяем элемент на input
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element);
        
        input.focus();
        input.select();
        
        // Валидация в реальном времени
        const maxValue = this.editingPart === 'hours' ? 23 : 59;
        input.addEventListener('input', (e) => {
            let value = parseInt(input.value) || 0;
            if (value > maxValue) {
                input.value = maxValue;
            } else if (value < 0) {
                input.value = 0;
            }
        });
        
        // Применяем изменения при потере фокуса или нажатии Enter
        const finishEditing = () => {
            const value = parseInt(input.value) || 0;
            const finalValue = Math.min(Math.max(0, value), maxValue);
            
            input.remove();
            element.style.display = '';
            element.textContent = finalValue.toString().padStart(2, '0');
            
            this.applyTimeFromParts();
            this.editingPart = null;
        };
        
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                finishEditing();
            }
        });
    }
    
    applyTimeFromParts() {
        // Получаем значения из элементов таймера
        const hours = parseInt(this.timerHoursElement.textContent) || 0;
        const minutes = parseInt(this.timerMinutesElement.textContent) || 0;
        const seconds = parseInt(this.timerSecondsElement.textContent) || 0;
        
        // Конвертируем в миллисекунды
        const newTime = (hours * 3600 + minutes * 60 + seconds) * 1000;
        this.initialTime = newTime;
        
        // Если таймер запущен, корректируем startTime, чтобы продолжить с нового значения
        if (this.isRunning) {
            this.startTime = Date.now() - newTime;
            this.elapsedTime = newTime;
        } else {
            this.elapsedTime = newTime;
        }
        
        // Обновляем отображение
        this.updateDisplay();
        this.statusElement.textContent = this.isRunning ? 'Работаю...' : 'Время установлено';
        
        // Сохраняем в localStorage
        this.saveToStorage();
    }
    
    finishEditing() {
        if (this.editingPart) {
            const input = this.timerElement.querySelector('.timer-input');
            if (input) {
                input.blur();
            }
        }
    }
    
    start() {
        // Если таймер уже запущен и интервал работает, ничего не делаем
        if (this.isRunning && this.timerInterval) {
            return;
        }
        
        this.isRunning = true;
        
        // Если это продолжение после паузы, корректируем startTime
        if (this.elapsedTime > 0) {
            this.startTime = Date.now() - this.elapsedTime;
        } else {
            // Если есть начальное время, учитываем его
            this.startTime = Date.now() - this.initialTime;
            this.elapsedTime = this.initialTime;
        }
        
        // Запускаем интервал только если его еще нет
        if (!this.timerInterval) {
            this.timerInterval = setInterval(() => this.update(), 1000);
        }
        
        this.updateButtons();
        this.statusElement.textContent = 'Работаю...';
        this.saveToStorage();
    }
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            
            // Сохраняем прошедшее время
            this.elapsedTime = Date.now() - this.startTime;
            
            this.updateButtons();
            this.statusElement.textContent = 'На паузе';
            this.saveToStorage();
        }
    }
    
    reset() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        this.startTime = 0;
        this.elapsedTime = 0;
        this.initialTime = 0; // Сбрасываем и начальное значение
        
        this.updateDisplay();
        this.updateButtons();
        this.statusElement.textContent = 'Сброшено';
        this.saveToStorage();
    }
    
    update() {
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
        this.updateTodayTime();
        this.updateDaysTime();
        
        // Автоматическое сохранение каждые 30 секунд
        if (Math.floor(this.elapsedTime / 1000) % 30 === 0) {
            this.saveToStorage();
        }
    }
    
    updateDisplay() {
        const totalSeconds = Math.floor(this.elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // Обновляем только если не редактируется
        if (this.editingPart !== 'hours') {
            this.timerHoursElement.textContent = hours.toString().padStart(2, '0');
        }
        if (this.editingPart !== 'minutes') {
            this.timerMinutesElement.textContent = minutes.toString().padStart(2, '0');
        }
        if (this.editingPart !== 'seconds') {
            this.timerSecondsElement.textContent = seconds.toString().padStart(2, '0');
        }
        
        // Обновление прогресс-бара
        const progress = Math.min((this.elapsedTime / this.maxTime) * 100, 100);
        this.progressBar.style.width = `${progress}%`;
        
        // Изменение цвета прогресс-бара
        if (progress < 50) {
            this.progressBar.style.background = '#34c759';
        } else if (progress < 80) {
            this.progressBar.style.background = '#ff9500';
        } else {
            this.progressBar.style.background = '#ff3b30';
        }
    }
    
    updateButtons() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
    }
    
    saveToStorage() {
        const timerData = {
            isRunning: this.isRunning,
            startTime: this.startTime,
            elapsedTime: this.elapsedTime,
            initialTime: this.initialTime,
            saveTimestamp: Date.now()
        };
        
        localStorage.setItem('workTimer', JSON.stringify(timerData));
        
        // Показываем время последнего сохранения
        const now = new Date();
        this.savedTimeElement.textContent = 
            `${now.getHours().toString().padStart(2, '0')}:` +
            `${now.getMinutes().toString().padStart(2, '0')}`;
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('workTimer');
        
        if (saved) {
            try {
                const timerData = JSON.parse(saved);
                
                // Проверяем, не устарели ли данные (больше 24 часов)
                const saveAge = Date.now() - timerData.saveTimestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 часа
                
                if (saveAge < maxAge) {
                    this.isRunning = timerData.isRunning;
                    this.startTime = timerData.startTime;
                    this.elapsedTime = timerData.elapsedTime;
                    this.initialTime = timerData.initialTime || 0;
                    
                    // Если таймер был запущен, корректируем elapsedTime
                    if (this.isRunning) {
                        this.elapsedTime = Date.now() - this.startTime;
                    }
                } else {
                    // Данные устарели - сбрасываем
                    localStorage.removeItem('workTimer');
                }
            } catch (e) {
                console.error('Ошибка загрузки из localStorage:', e);
            }
        }
    }
    
    updateTodayTime() {
        const today = new Date().toDateString();
        const savedToday = localStorage.getItem('todayDate');
        
        if (savedToday !== today) {
            // Новый день - сбрасываем счетчик
            localStorage.setItem('todayDate', today);
            localStorage.setItem('todayWorkTime', '0');
        }
        
        // Сохраняем сегодняшнее рабочее время (если таймер запущен)
        if (this.isRunning) {
            const totalSeconds = Math.floor(this.elapsedTime / 1000);
            localStorage.setItem('todayWorkTime', totalSeconds.toString());
        }
        
        // Обновляем отображение сегодняшнего времени
        const todayWorkTime = parseInt(localStorage.getItem('todayWorkTime')) || 0;
        const hours = Math.floor(todayWorkTime / 3600);
        const minutes = Math.floor((todayWorkTime % 3600) / 60);
        
        this.todayTimeElement.textContent = `${hours}ч ${minutes}м`;
    }
    
    updateDaysTime() {
        const today = new Date().toDateString();
        
        // Получаем сегодняшнее время из todayWorkTime
        const todaySeconds = parseInt(localStorage.getItem('todayWorkTime')) || 0;
        
        // Сохраняем сегодняшнее время для истории
        localStorage.setItem(`workTime_${today}`, todaySeconds.toString());
        
        // Получаем все сохраненные дни (кроме сегодняшнего, чтобы не дублировать)
        let totalSeconds = todaySeconds;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('workTime_')) {
                const date = key.replace('workTime_', '');
                if (date !== today) {
                    totalSeconds += parseInt(localStorage.getItem(key)) || 0;
                }
            }
        }
        
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        
        this.daysTimeElement.textContent = `${days}д ${hours}ч`;
    }
}

// Инициализация таймера после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    new Timer();
});
