document.addEventListener('DOMContentLoaded', () => {
    
    // === ЭЛЕМЕНТЫ ===
    const startScreen = document.getElementById('start-screen');
    const introScreen = document.getElementById('intro-screen');
    const introImg = document.getElementById('intro-img');
    const dialogBox = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');
    
    const startBtn = document.getElementById('start-btn');
    const skipBtn = document.getElementById('skip-btn');
    
    const pauseBtn = document.getElementById('pause-btn');
    const pauseMenu = document.getElementById('pause-menu');
    const resumeBtn = document.getElementById('resume-btn');
    const restartPauseBtn = document.getElementById('restart-from-pause-btn');

    const explosionImg = document.getElementById('explosion-effect');
    const gameOverScreen = document.getElementById('game-over-screen');
    const fullRestartBtn = document.getElementById('full-restart-btn');

    const finaleScreen = document.getElementById('finale-screen');
    const finaleImg = document.getElementById('finale-img');
    const flowerContainer = document.getElementById('flower-effects');
    const restartIconBtn = document.getElementById('restart-icon-btn');

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // === АУДИО ===
    const audio = {
        menu: document.getElementById('bgm-menu'),
        game: document.getElementById('bgm-game'),
        gameover: document.getElementById('bgm-gameover'),
        finale: document.getElementById('bgm-finale'),
        jump: document.getElementById('sfx-jump'),
        hit: document.getElementById('sfx-hit')
    };
    
    const VOL = { MENU: 0.5, GAME: 0.4, GAMEOVER: 0.5, FINALE: 0.6, JUMP: 0.3, HIT: 0.8 };

    if(audio.menu) audio.menu.volume = VOL.MENU;
    if(audio.game) audio.game.volume = VOL.GAME;
    if(audio.gameover) audio.gameover.volume = VOL.GAMEOVER;
    if(audio.finale) audio.finale.volume = VOL.FINALE;
    if(audio.jump) audio.jump.volume = VOL.JUMP;
    if(audio.hit) audio.hit.volume = VOL.HIT;
    
    // === СОСТОЯНИЯ ===
    let isIntroPlaying = false;
    let isIntroFinishing = false; 
    let isGameRunning = false;
    let isGameWon = false; 
    let isPaused = false; 
    let isFinaleRunning = false; 
    
    // === НАСТРОЙКИ ===
    const totalIntroFrames = 10; 
    let currentIntroFrame = 0;
    let introTimer;
    
    const storyLines = {
        0: "Так-с... И это написала... И это не забыла...",
        7: "Котик, есть важная миссия! Доставишь?",
        9: "Удачи! Не подведи!"
    };

    const LEVEL_DISTANCE = 80000; 
    let gameSpeed = 3;           
    let score = 0;
    let obstacles = [];
    let obstacleTimer = 0;
    let frames = 0;
    let uiFlashTimer = 0;

    // Глобальная переменная для динамической паузы препятствий
    let nextObstacleDelay = 400; 

    // === АССЕТЫ ===
    const assets = {
        intro: [], run: [], jump: [], finale: [],
        bg: null, icon_cat: null, obs_trash: null, obs_cone: null, obs_hole: null
    };

    function preloadAssets() {
        for (let i = 0; i <= totalIntroFrames; i++) { 
            const img = new Image(); img.src = `assets/intro_${i}.png`; assets.intro.push(img);
        }
        for (let i = 0; i < 3; i++) {
            const img = new Image(); img.src = `assets/cat_run_${i}.png`; assets.run.push(img);
        }
        for (let i = 0; i < 4; i++) {
            const img = new Image(); img.src = `assets/cat_jump_${i}.png`; assets.jump.push(img);
        }
        for (let i = 1; i <= 5; i++) {
            const img = new Image(); img.src = `assets/finale_${i}.png`; assets.finale.push(img);
        }
        assets.bg = new Image(); assets.bg.src = 'assets/bg_game.png';
        assets.icon_cat = new Image(); assets.icon_cat.src = 'assets/icon_cat.png';
        assets.obs_trash = new Image(); assets.obs_trash.src = 'assets/obs_trash.png';
        assets.obs_cone = new Image(); assets.obs_cone.src = 'assets/obs_cone.png';
        assets.obs_hole = new Image(); assets.obs_hole.src = 'assets/obs_hole.png';
        if (assets.intro[0]) introImg.src = assets.intro[0].src;
    }
    preloadAssets();

    // === УПРАВЛЕНИЕ АУДИО ===
    function fadeOut(sound, duration = 1000) {
        if (!sound || sound.paused) return;
        const startVol = sound.volume;
        const step = startVol / (duration / 50); 
        const fadeInterval = setInterval(() => {
            if (sound.volume - step > 0) { sound.volume -= step; } 
            else {
                sound.volume = 0; sound.pause(); sound.currentTime = 0;
                sound.volume = startVol; clearInterval(fadeInterval);
            }
        }, 50);
    }

    function fadeIn(sound, targetVol, duration = 1000) {
        if (!sound) return;
        sound.volume = 0;
        sound.play().catch(e => console.log("Audio play error:", e));
        const step = targetVol / (duration / 50);
        const fadeInterval = setInterval(() => {
            if (sound.volume + step < targetVol) { sound.volume += step; } 
            else { sound.volume = targetVol; clearInterval(fadeInterval); }
        }, 50);
    }

    function playSound(sound) {
        if (sound) { sound.currentTime = 0; sound.play().catch(e => console.log("SFX play error:", e)); }
    }

    function stopAllMusic() {
        [audio.menu, audio.game, audio.gameover, audio.finale].forEach(track => {
            if(track) { track.pause(); track.currentTime = 0; }
        });
    }

    // ==========================================
    // ИГРОВОЙ ЦИКЛ
    // ==========================================
    function gameLoop() {
        if (!isGameRunning || isPaused) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (assets.bg) {
            let currentBgSpeed = isFinaleRunning ? gameSpeed * 0.5 : gameSpeed;
            background.x -= currentBgSpeed;
            if (background.x <= -canvas.width) background.x = 0;
            ctx.drawImage(assets.bg, background.x, 0, canvas.width, canvas.height);
            ctx.drawImage(assets.bg, background.x + canvas.width, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (isFinaleRunning) {
            if (gameSpeed > 0) gameSpeed -= 0.05;
            if (gameSpeed < 0) gameSpeed = 0;
            cat.grounded = true; cat.y = canvas.height - 200; cat.x += 2; 

            if (frames % 15 === 0) cat.runFrame = (cat.runFrame + 1) % 3;
            let sprite = assets.run[cat.runFrame];
            if (sprite) ctx.drawImage(sprite, cat.x, cat.y, cat.width, cat.height);

            if (cat.x > canvas.width) { startCutsceneTransition(); return; }
        } else if (!isGameWon) {
            // РАССЧЕТ СЛОЖНОСТИ
            let difficultyFactor = Math.min(score / LEVEL_DISTANCE, 1); 

            // УСКОРЯЕМ ПРЫЖОК
            currentGravity = BASE_GRAVITY + (difficultyFactor * 0.18); 
            currentJumpForce = BASE_JUMP_FORCE - (difficultyFactor * 2.5); 

            cat.update(); 
            updateObstacles(); 
            score += gameSpeed; 
            
            if (frames % 1000 === 0 && gameSpeed < 8.5) gameSpeed += 0.4;
            if (score >= LEVEL_DISTANCE) {
                isFinaleRunning = true; obstacles = []; pauseBtn.classList.add('hidden');
            }
            drawObstacles(); 
            cat.draw();
        }
        drawUI(); 
        frames++; 
        requestAnimationFrame(gameLoop);
    }

    // ==========================================
    // ЛОГИКА ПРЕПЯТСТВИЙ
    // ==========================================
    function spawnObstacle() {
        const types = [
            { name: 'trash', img: assets.obs_trash, width: 180, height: 200, yCorrection: 60 },
            { name: 'cone', img: assets.obs_cone, width: 130, height: 150, yCorrection: 40 },
            { name: 'hole', img: assets.obs_hole, width: 260, height: 110, yCorrection: 45 }
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const groundLevel = canvas.height - 200;
        const obsY = groundLevel - type.height + type.yCorrection + 100; 
        obstacles.push({ x: canvas.width + 100, y: obsY, w: type.width, h: type.height, img: type.img, name: type.name });
    }

    function updateObstacles() {
        obstacleTimer++;
        
        let difficultyFactor = Math.min(score / LEVEL_DISTANCE, 1); 
        const startDelay = 800; 
        const minDelay = 180;   
        
        let currentBaseDelay = startDelay - ((startDelay - minDelay) * difficultyFactor);

        if (obstacleTimer > nextObstacleDelay) {
            spawnObstacle();
            obstacleTimer = 0;
            
            let variability = 0.4 + (Math.random() * 1.2); 
            nextObstacleDelay = (currentBaseDelay * variability) / (gameSpeed / 3);
            
            if (nextObstacleDelay < 80) nextObstacleDelay = 80;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.x -= gameSpeed;

            let hitX = 20, hitY = 20; 
            if (obs.name === 'trash') { hitX = 15; hitY = 15; }
            if (obs.name === 'cone') { hitX = 30; hitY = 30; }
            if (obs.name === 'hole') { hitX = 30; hitY = 10; }

            if (cat.x + cat.width - hitX > obs.x + hitX &&
                cat.x + hitX < obs.x + obs.w - hitX &&
                cat.y + cat.height - 20 > obs.y + hitY && 
                cat.y + 40 < obs.y + obs.h) {
                gameOver();
            }
            if (obs.x + obs.w < -200) obstacles.splice(i, 1);
        }
    }

    // ==========================================
    // ФИНАЛ: ПЕРЕХОД И ДИАЛОГИ
    // ==========================================
    function startCutsceneTransition() {
        isGameRunning = false;
        fadeOut(audio.game, 1500);
        canvas.classList.add('fade-out-game');
        
        setTimeout(() => {
            canvas.classList.add('hidden');
            finaleScreen.classList.remove('hidden');
            
            // === ПЕРЕНОСИМ ДИАЛОГОВОЕ ОКНО В ФИНАЛ ===
            // Берем тот же блок, что был в интро, и вставляем его в экран финала
            finaleScreen.appendChild(dialogBox);
            
            // Сбрасываем стили интро (если они остались)
            dialogBox.classList.remove('center-dialog'); 
            dialogBox.classList.add('hidden'); 
            // Возвращаем позицию вниз (CSS для #dialog-box это делает по умолчанию, но на всякий случай)
            dialogBox.style.bottom = '40px'; 
            dialogBox.style.transform = 'translateX(-50%)';

            audio.finale.volume = VOL.FINALE; 
            audio.finale.play();
            
            setTimeout(() => { 
                finaleScreen.classList.add('visible'); 
                playCutsceneSlides(); 
            }, 50);
        }, 1500);
    }

    function playCutsceneSlides() {
        // Добавили поле 'text' для диалогов
        const slides = [
            { id: 0, delay: 0 }, 
            { id: 1, delay: 3000, text: "А? Это мне?" }, // Парень садится
            { id: 2, delay: 6000, text: "Спасибо." },    // Парень берет письмо
            { id: 3, delay: 9000 },                      // Руки
            { id: 4, delay: 12500 }                      // Финал
        ];

        slides.forEach(slide => {
            setTimeout(() => {
                // Сброс эффектов
                finaleImg.classList.remove('slide-up'); 
                finaleScreen.style.backgroundColor = '#000';
                
                // Смена картинки
                if (assets.finale[slide.id]) { 
                    finaleImg.src = assets.finale[slide.id].src; 
                }
                
                // === ЛОГИКА ДИАЛОГА ===
                if (slide.text) {
                    dialogText.innerText = slide.text;
                    dialogBox.classList.remove('hidden');
                } else {
                    dialogBox.classList.add('hidden');
                }

                // Спецэффекты слайдов
                if (slide.id === 3) { 
                    finaleScreen.style.backgroundColor = '#a989cc'; 
                    finaleImg.classList.add('slide-up'); 
                }
                if (slide.id === 4) { 
                    showFlowers(); 
                    restartIconBtn.classList.remove('hidden'); 
                }
            }, slide.delay);
        });
    }

    function showFlowers() {
        flowerContainer.innerHTML = ''; 
        for (let i = 0; i < 30; i++) {
            const heart = document.createElement('div');
            heart.classList.add('pixel-heart');
            heart.style.left = Math.random() * 100 + '%';
            heart.style.top = Math.random() * 100 + '%';
            heart.style.animationDelay = (Math.random() * 3) + 's';
            flowerContainer.appendChild(heart);
        }
    }

    // ==========================================
    // ФИЗИКА И УПРАВЛЕНИЕ
    // ==========================================
    const background = { x: 0 };
    const BASE_GRAVITY = 0.19;    
    const BASE_JUMP_FORCE = -10.5; 
    
    let currentGravity = BASE_GRAVITY;
    let currentJumpForce = BASE_JUMP_FORCE;
    
    const cat = {
        x: 100, y: 200, width: 140, height: 100, dy: 0, grounded: true, runFrame: 0,
        draw() {
            let sprite;
            if (this.grounded) {
                if (frames % 10 === 0) this.runFrame = (this.runFrame + 1) % 3;
                sprite = assets.run[this.runFrame];
            } else {
                if (this.dy < -7) sprite = assets.jump[0];      
                else if (this.dy < 0) sprite = assets.jump[1];  
                else if (this.dy < 7) sprite = assets.jump[2];  
                else sprite = assets.jump[3];                   
            }
            if (sprite) ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        },
        update() {
            this.dy += currentGravity; 
            this.y += this.dy;
            
            const groundLevel = canvas.height - 200; 
            if (this.y > groundLevel) { 
                this.y = groundLevel; 
                this.dy = 0; 
                this.grounded = true; 
            } else { 
                this.grounded = false; 
            }
        },
        jump() { 
            if (this.grounded) { 
                this.dy = currentJumpForce; 
                this.grounded = false; 
                playSound(audio.jump); 
            } 
        }
    };

    function drawObstacles() {
        obstacles.forEach(obs => { if (obs.img) ctx.drawImage(obs.img, obs.x, obs.y, obs.w, obs.h); });
    }

    function createPixelPath(x, y, w, h) {
        ctx.beginPath(); ctx.moveTo(x+4,y); ctx.lineTo(x+w-4,y); ctx.lineTo(x+w-4,y+4); ctx.lineTo(x+w,y+4);
        ctx.lineTo(x+w,y+h-4); ctx.lineTo(x+w-4,y+h-4); ctx.lineTo(x+w-4,y+h); ctx.lineTo(x+4,y+h);
        ctx.lineTo(x+4,y+h-4); ctx.lineTo(x,y+h-4); ctx.lineTo(x,y+4); ctx.lineTo(x+4,y+4); ctx.closePath();
    }

    function drawUI() {
        const barWidth = 600; const barHeight = 24; 
        const barX = (canvas.width - barWidth) / 2; const barY = 50;
        createPixelPath(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.save(); ctx.clip(); 
        let progress = score / LEVEL_DISTANCE; if (progress > 1) progress = 1;
        if (isFinaleRunning) {
            uiFlashTimer++; ctx.fillStyle = (Math.floor(uiFlashTimer / 10) % 2 === 0) ? '#ff69b4' : '#ff1493'; 
        } else { ctx.fillStyle = '#ff69b4'; }
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fillRect(barX, barY, barWidth * progress, 6); 
        ctx.restore(); ctx.lineWidth = 4; ctx.strokeStyle = '#000000'; ctx.stroke();
        if (assets.icon_cat) {
            ctx.drawImage(assets.icon_cat, barX + (barWidth * progress) - 35, barY + 12 - 35, 70, 70);
        }
    }

    function gameOver() {
        isGameRunning = false; pauseBtn.classList.add('hidden'); 
        if(audio.game) audio.game.pause();
        playSound(audio.hit);
        setTimeout(() => { fadeIn(audio.gameover, VOL.GAMEOVER, 2000); }, 500);
        const centerX = cat.x + (cat.width / 2); const centerY = cat.y + (cat.height / 2);
        explosionImg.style.left = centerX + 'px'; explosionImg.style.top = centerY + 'px';
        explosionImg.classList.remove('hidden'); 
        setTimeout(() => { explosionImg.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); }, 800); 
    }

    function togglePause() {
        if (!isGameRunning || isGameWon || isFinaleRunning) return;
        isPaused = !isPaused;
        if (isPaused) { pauseMenu.classList.remove('hidden'); pauseBtn.innerText = "▶"; if(audio.game) audio.game.pause(); } 
        else { pauseMenu.classList.add('hidden'); pauseBtn.innerText = "II"; if(audio.game) audio.game.play(); gameLoop(); }
    }

    function restartGameInstant() { location.reload(); }

    function startIntro() {
        if (isIntroPlaying) return; isIntroPlaying = true;
        if(audio.menu && audio.menu.paused) { audio.menu.volume = VOL.MENU; audio.menu.play(); }
        startScreen.classList.add('slide-out');
        setTimeout(() => { introScreen.classList.add('fade-in'); playNextFrame(); }, 300);
    }

    function playNextFrame() {
        if (currentIntroFrame >= totalIntroFrames) { finishIntro(); return; }
        introImg.src = assets.intro[currentIntroFrame].src;
        if (storyLines[currentIntroFrame]) { dialogBox.classList.remove('hidden'); dialogText.innerText = storyLines[currentIntroFrame]; }
        let delay = (currentIntroFrame >= 7) ? 3000 : 1500;
        currentIntroFrame++; introTimer = setTimeout(playNextFrame, delay);
    }

    function finishIntro() {
        if (isIntroFinishing) return; isIntroFinishing = true; clearTimeout(introTimer); 
        dialogText.innerText = storyLines[9];
        dialogBox.classList.remove('hidden'); dialogBox.classList.add('center-dialog'); 
        introImg.classList.add('fade-out-image'); fadeOut(audio.menu, 1500); 
        setTimeout(() => {
            introScreen.classList.remove('fade-in'); introScreen.classList.add('fade-out'); 
            setTimeout(() => { introScreen.style.display = 'none'; initGame(); }, 1500);
        }, 3000);
    }

    function skipIntro() {
        if (isIntroPlaying && !isIntroFinishing && currentIntroFrame < 7) {
            clearTimeout(introTimer); currentIntroFrame = 7; playNextFrame();
        } else if (isIntroPlaying && !isIntroFinishing && currentIntroFrame >= 7) { finishIntro(); }
    }

    function initGame() {
        if (isGameRunning) return; 
        stopAllMusic(); fadeIn(audio.game, VOL.GAME, 1000); 
        canvas.classList.remove('hidden'); canvas.classList.remove('fade-out-game');
        if (pauseBtn) pauseBtn.classList.remove('hidden');
        isGameRunning = true; gameSpeed = 3; score = 0; obstacles = []; gameLoop();
    }

    document.addEventListener('keydown', (e) => {
        // УПРАВЛЕНИЕ:
        // 1. GAME OVER (Space/Enter - Рестарт)
        const isGameOverVisible = !gameOverScreen.classList.contains('hidden');
        if (isGameOverVisible) {
            if (e.code === 'Space' || e.code === 'Enter') { location.reload(); return; }
        }

        // 2. PAUSE
        if (e.code === 'Escape') { togglePause(); return; }
        if (isPaused) return;

        // 3. ПРЫЖОК
        if (isGameRunning && !isGameWon && !isFinaleRunning) {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') { cat.jump(); return; }
        }

        // 4. МЕНЮ / ИНТРО
        if (!isIntroPlaying && e.code === 'Enter') { startIntro(); return; }
        if (isIntroPlaying && (e.code === 'Enter' || e.code === 'Space')) { skipIntro(); return; }
        
        if (e.code === 'KeyF') { score = LEVEL_DISTANCE; }
    });

    startBtn.addEventListener('click', startIntro);
    if (skipBtn) skipBtn.addEventListener('click', skipIntro);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
    if (restartPauseBtn) restartPauseBtn.addEventListener('click', restartGameInstant);
    if (fullRestartBtn) fullRestartBtn.addEventListener('click', () => location.reload());
    if (restartIconBtn) restartIconBtn.addEventListener('click', () => location.reload());

    const jumpAction = (e) => {
        if (e.target.closest('button')) return;
        if (e.type === 'touchstart') e.preventDefault(); 
        if (isGameRunning && !isGameWon && !isPaused && !isFinaleRunning) cat.jump();
    };
    canvas.addEventListener('mousedown', jumpAction);
    canvas.addEventListener('touchstart', jumpAction);
});