// Game State Management
const GameState = {
    MENU: 'menu',
    CONTROLS: 'controls',
    CHARACTER_SELECT: 'characterSelect',
    PLAYING: 'playing',
    PAUSED: 'paused',
    VICTORY: 'victory'
};

let currentState = GameState.MENU;
let canvas, ctx;

// Game Objects
let gameObjects = [];
let particles = [];
let game = {
    isOnline: false,
    isHost: false,
    localPlayer: null,
    remotePlayer: null,
    roomCode: null
};

// Input Handling
const keys = {};

// Character Definitions
const characters = {
    rynix: {
        name: 'Rynix',
        color: '#00BFFF',
        speed: 5,
        damage: 10,
        specialDamage: 30,
        maxHealth: 100,
        attackRange: 60,
        specialRange: 100,
        abilities: {
            attack: 'Photon Blade',
            special: 'photonBlade'
        }
    },
    vexa: {
        name: 'Vexa',
        color: '#FF00FF',
        speed: 7,
        damage: 8,
        specialDamage: 25,
        maxHealth: 90,
        attackRange: 50,
        specialRange: 80,
        abilities: {
            attack: 'Cyber Dash',
            special: 'cyberDash'
        }
    },
    drok: {
        name: 'Drok',
        color: '#FF8000',
        speed: 3,
        damage: 15,
        specialDamage: 40,
        maxHealth: 120,
        attackRange: 70,
        specialRange: 120,
        abilities: {
            attack: 'Core Smash',
            special: 'coreSmash'
        }
    },
    zyra: {
        name: 'Zyra',
        color: '#00FF80',
        speed: 4,
        damage: 7,
        specialDamage: 35,
        maxHealth: 85,
        attackRange: 90,
        specialRange: 150,
        abilities: {
            attack: 'EMP Pulse',
            special: 'empPulse'
        }
    },
    kain: {
        name: 'Kain',
        color: '#FFFF00',
        speed: 6,
        damage: 9,
        specialDamage: 28,
        maxHealth: 95,
        attackRange: 55,
        specialRange: 90,
        abilities: {
            attack: 'Echo Mirage',
            special: 'echoMirage'
        }
    }
};

// Player Class
class Player {
    constructor(x, y, character, isPlayerOne) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.character = character;
        this.isPlayerOne = isPlayerOne;
        this.velocityX = 0;
        this.velocityY = 0;
        this.health = character.maxHealth;
        this.maxHealth = character.maxHealth;
        this.special = 0;
        this.maxSpecial = 100;
        this.combo = 0;
        this.isGrounded = false;
        this.isBlocking = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.facing = isPlayerOne ? 1 : -1;
        this.animFrame = 0;
        this.state = 'idle';
        this.hitstun = 0;
    }

    update() {
        if (game.isOnline && !this.isPlayerOne) return;
        
        // Apply gravity
        if (!this.isGrounded) {
            this.velocityY += 0.8;
        }

        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Ground collision
        if (this.y > canvas.height - this.height - 50) {
            this.y = canvas.height - this.height - 50;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Wall collision
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));

        // Apply friction
        this.velocityX *= 0.8;

        // Update cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hitstun > 0) this.hitstun--;

        // Reset combo if no recent hits
        if (this.combo > 0 && this.attackCooldown < 30) {
            this.combo = 0;
        }

        // Update animation
        this.animFrame++;
    }

    move(direction) {
        if (this.hitstun > 0) return;
        
        this.velocityX = direction * this.character.speed;
        this.facing = direction;
        this.state = 'walk';
    }

    jump() {
        if (this.isGrounded && this.hitstun === 0) {
            this.velocityY = -15;
            this.isGrounded = false;
            this.state = 'jump';
        }
    }

    attack(opponent) {
        if (this.attackCooldown > 0 || this.hitstun > 0) return;

        this.isAttacking = true;
        this.attackCooldown = 20;
        this.state = 'attack';
        this.animFrame = 0;

        const distance = Math.abs(this.x - opponent.x);
        if (distance < this.character.attackRange + this.width && !opponent.isBlocking) {
            opponent.takeDamage(this.character.damage);
            this.special = Math.min(this.maxSpecial, this.special + 10);
            this.combo++;
            createHitParticles(opponent.x, opponent.y);
        } else if (opponent.isBlocking) {
            createBlockParticles(opponent.x, opponent.y);
        }

        setTimeout(() => {
            this.isAttacking = false;
            this.state = 'idle';
        }, 200);
    }

    specialAttack(opponent) {
        if (this.special < 50 || this.attackCooldown > 0 || this.hitstun > 0) return;

        this.special -= 50;
        this.isAttacking = true;
        this.state = 'special';
        this.animFrame = 0;

        this.executeSpecial(opponent);

        setTimeout(() => {
            this.isAttacking = false;
            this.state = 'idle';
        }, 500);
    }

    executeSpecial(opponent) {
        switch (this.character.abilities.special) {
            case 'photonBlade':
                createEnergyWave(this.x + (this.facing * 30), this.y, this.facing);
                const distance = Math.abs(this.x - opponent.x);
                if (distance < this.character.specialRange + this.width && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage);
                    this.combo++;
                }
                break;
            case 'cyberDash':
                const newX = opponent.x - (this.facing * 80);
                this.x = Math.max(0, Math.min(canvas.width - this.width, newX));
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (!opponent.isBlocking) {
                            opponent.takeDamage(this.character.specialDamage / 3);
                            createHitParticles(opponent.x, opponent.y);
                        }
                    }, i * 100);
                }
                break;
            case 'coreSmash':
                createShockwave(this.x, this.y + this.height);
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage);
                    opponent.velocityY = -10;
                    opponent.velocityX = (opponent.x > this.x ? 1 : -1) * 5;
                }
                break;
            case 'empPulse':
                createEMPOrb(this.x + (this.facing * this.width), this.y + 20, this.facing);
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage);
                    opponent.hitstun = 30;
                }
                break;
            case 'echoMirage':
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        createClone(this.x + (i * 20), this.y);
                    }, i * 100);
                }
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage);
                    this.x = opponent.x - (this.facing * 60);
                }
                break;
        }
    }

    block() {
        if (this.hitstun === 0) {
            this.isBlocking = true;
        }
    }

    unblock() {
        this.isBlocking = false;
    }

    takeDamage(damage) {
        if (this.isBlocking) {
            damage *= 0.5;
        }
        
        this.health = Math.max(0, this.health - damage);
        this.hitstun = 20;
        this.state = 'hit';
        this.combo = 0;

        if (this.health === 0) {
            triggerSlowMotion();
        }
    }

    draw() {
        ctx.save();
        
        if (slowMotion > 0) {
            ctx.globalAlpha = 0.7;
        }

        ctx.fillStyle = this.character.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.character.color;
        
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 10, this.y + 15, 5, 5);
        ctx.fillRect(this.x + 25, this.y + 15, 5, 5);
        
        if (this.isBlocking) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
        }

        if (this.isAttacking) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 
                    this.character.attackRange * (this.animFrame / 10), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Remote Player Class (for P2P)
class RemotePlayer extends Player {
    constructor(x, y, character, isPlayerOne) {
        super(x, y, character, isPlayerOne);
        this.targetX = x;
        this.targetY = y;
    }
    
    update() {
        // Interpolate position
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;
    }
}

// Particle System
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.life--;
        this.size *= 0.98;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

function createHitParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(
            x + Math.random() * 40,
            y + Math.random() * 40,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            '#FF0000',
            30
        ));
    }
}

function createBlockParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(
            x + Math.random() * 40,
            y + Math.random() * 40,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            '#00FFFF',
            20
        ));
    }
}

function createEnergyWave(x, y, direction) {
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            particles.push(new Particle(
                x + (i * direction * 5),
                y,
                direction * 10,
                0,
                '#00BFFF',
                40
            ));
        }, i * 10);
    }
}

function createShockwave(x, y) {
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 100,
            y,
            (Math.random() - 0.5) * 10,
            Math.random() * -5,
            '#FF8000',
            50
        ));
    }
}

function createEMPOrb(x, y, direction) {
    const orb = {
        x: x,
        y: y,
        vx: direction * 8,
        vy: 0,
        life: 60,
        color: '#00FF80',
        update: function() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            this.size = 10;
        },
        draw: function() {
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    particles.push(orb);
}

function createClone(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
            x + Math.random() * 20,
            y + Math.random() * 20,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            '#FFFF00',
            25
        ));
    }
}

// Game Variables
let player1 = null;
let player2 = null;
let gameTimer = 99;
let timerInterval = null;
let slowMotion = 0;

// Input Handling
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && currentState === GameState.PLAYING) {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (player1 && e.code === 'Space') player1.unblock();
    if (player2 && (e.code === 'NumpadEnter' || e.code === 'Enter')) player2.unblock();
});

// Game Initialization
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    setupEventListeners();
    showScreen('mainMenu');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupEventListeners() {
    // Main menu
    document.getElementById('localBtn').onclick = () => showScreen('characterSelect');
    document.getElementById('onlineBtn').onclick = () => showScreen('p2pMenu');
    document.getElementById('controlsBtn').onclick = () => showScreen('controlsScreen');
    
    // P2P menu
    document.getElementById('p2pHostBtn').onclick = () => hostP2PGame();
    document.getElementById('p2pJoinBtn').onclick = () => joinP2PGame();
    document.getElementById('p2pBackBtn').onclick = () => showScreen('mainMenu');
    
    // Controls
    document.getElementById('controlsBackBtn').onclick = () => showScreen('mainMenu');
    
    // Character select
    document.querySelectorAll('.character-card').forEach(card => {
        card.onclick = () => selectCharacter(card.dataset.character);
    });
    
    // Game controls
    document.getElementById('resumeBtn').onclick = togglePause;
    document.getElementById('mainMenuBtn').onclick = () => {
        showScreen('mainMenu');
        cleanupGame();
    };
    document.getElementById('rematchBtn').onclick = () => {
        cleanupGame();
        startGame();
    };
    document.getElementById('victoryMenuBtn').onclick = () => {
        showScreen('mainMenu');
        cleanupGame();
    };
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    switch(screenId) {
        case 'mainMenu':
            currentState = GameState.MENU;
            break;
        case 'controlsScreen':
            currentState = GameState.CONTROLS;
            break;
        case 'characterSelect':
            currentState = GameState.CHARACTER_SELECT;
            resetCharacterSelection();
            break;
        case 'gameArena':
            currentState = GameState.PLAYING;
            if (!game.localPlayer && !player1) {
                startGame();
            }
            break;
        case 'victoryScreen':
            currentState = GameState.VICTORY;
            break;
    }
}

function resetCharacterSelection() {
    document.getElementById('p1Select').textContent = 'Select Character';
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('selected-p1', 'selected-p2');
    });
}

function selectCharacter(characterName) {
    const character = characters[characterName];
    if (game.isOnline) {
        if (p2p && p2p.connected) {
            p2p.send('selectChar', { character: characterName });
            game.localPlayer = new Player(200, 300, character, true);
            showScreen('gameArena');
        }
    } else {
        player1 = new Player(200, 300, character, true);
        player2 = new Player(canvas.width - 250, 300, characters.vexa, false);
        showScreen('gameArena');
    }
}

function hostP2PGame() {
    p2p = new P2PNetwork();
    p2p.hostGame().then(code => {
        prompt('Share this code with your friend:', code);
        showScreen('characterSelect');
        p2p.onConnected = () => {
            game.isOnline = true;
            game.isHost = true;
        };
        p2p.onMessage = handleP2PMessage;
    });
}

function joinP2PGame() {
    p2p = new P2PNetwork();
    const code = prompt('Enter host code:');
    p2p.joinGame(code).then(() => {
        showScreen('characterSelect');
        p2p.onConnected = () => {
            game.isOnline = true;
        };
        p2p.onMessage = handleP2PMessage;
    });
}

function handleP2PMessage(msg) {
    if (msg.type === 'selectChar' && !game.remotePlayer) {
        const oppChar = characters[msg.data.character];
        game.remotePlayer = new RemotePlayer(canvas.width - 250, 300, oppChar, false);
        gameObjects = [game.localPlayer, game.remotePlayer];
    } else if (msg.type === 'input' && game.remotePlayer) {
        applyInput(msg.data, game.remotePlayer);
    }
}

function applyInput(input, player) {
    if (!player) return;
    
    if (input.move !== undefined) {
        player.velocityX = input.move * player.character.speed;
        player.facing = input.move;
        player.state = 'walk';
    }
    if (input.jump && player.isGrounded) {
        player.velocityY = -15;
        player.isGrounded = false;
        player.state = 'jump';
    }
    if (input.attack) {
        player.isAttacking = true;
        player.attackCooldown = 20;
        player.state = 'attack';
        setTimeout(() => {
            player.isAttacking = false;
            player.state = 'idle';
        }, 200);
    }
    if (input.special) {
        player.isAttacking = true;
        player.state = 'special';
        setTimeout(() => {
            player.isAttacking = false;
            player.state = 'idle';
        }, 500);
    }
    player.isBlocking = input.block || false;
}

function startGame() {
    cleanupGame();
    
    if (game.isOnline) {
        gameObjects = [game.localPlayer, game.remotePlayer];
    } else {
        gameObjects = [player1, player2];
    }
    
    particles = [];
    startTimer();
}

function cleanupGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameTimer = 99;
    slowMotion = 0;
    updateUI();
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (currentState === GameState.PLAYING) {
            gameTimer--;
            document.getElementById('timer').textContent = gameTimer;
            if (gameTimer <= 0) endGame();
        }
    }, 1000);
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        currentState = GameState.PAUSED;
        document.getElementById('pauseMenu').classList.remove('hidden');
    } else if (currentState === GameState.PAUSED) {
        currentState = GameState.PLAYING;
        document.getElementById('pauseMenu').classList.add('hidden');
    }
}

function handleInput() {
    if (game.isOnline && game.localPlayer) {
        const input = {};
        if (keys['KeyA']) input.move = -1;
        if (keys['KeyD']) input.move = 1;
        if (keys['KeyW']) input.jump = true;
        if (keys['KeyF']) input.attack = true;
        if (keys['KeyG']) input.special = true;
        input.block = keys['Space'];
        
        if (Object.keys(input).length > 0 || game.localPlayer.isBlocking) {
            if (p2p) p2p.send('input', input);
            applyInput(input, game.localPlayer);
        } else {
            game.localPlayer.isBlocking = false;
        }
    } else if (player1 && player2) {
        // Player 1
        if (player1.hitstun === 0) {
            if (keys['KeyA']) player1.move(-1);
            if (keys['KeyD']) player1.move(1);
            if (keys['KeyW']) player1.jump();
            if (keys['KeyF']) player1.attack(player2);
            if (keys['KeyG']) player1.specialAttack(player2);
            if (keys['Space']) player1.block();
        }
        
        // Player 2
        if (player2.hitstun === 0) {
            if (keys['ArrowLeft']) player2.move(-1);
            if (keys['ArrowRight']) player2.move(1);
            if (keys['ArrowUp']) player2.jump();
            if (keys['Comma']) player2.attack(player1);
            if (keys['Period']) player2.specialAttack(player1);
            if (keys['NumpadEnter'] || keys['Enter']) player2.block();
        }
    }
}

function triggerSlowMotion() {
    slowMotion = 60;
}

function updateUI() {
    const activePlayer = game.isOnline ? game.localPlayer : player1;
    const opponentPlayer = game.isOnline ? game.remotePlayer : player2;
    
    if (activePlayer) {
        document.getElementById('p1Health').style.width = (activePlayer.health / activePlayer.maxHealth) * 100 + '%';
        document.getElementById('p1Special').style.width = (activePlayer.special / activePlayer.maxSpecial) * 100 + '%';
        document.getElementById('p1Combo').textContent = activePlayer.combo;
    }
    
    if (opponentPlayer) {
        document.getElementById('p2Health').style.width = (opponentPlayer.health / opponentPlayer.maxHealth) * 100 + '%';
        document.getElementById('p2Special').style.width = (opponentPlayer.special / opponentPlayer.maxSpecial) * 100 + '%';
        document.getElementById('p2Combo').textContent = opponentPlayer.combo;
    }
}

function checkGameEnd() {
    if (!gameObjects.length) return false;
    
    const p1 = game.isOnline ? game.localPlayer : player1;
    const p2 = game.isOnline ? game.remotePlayer : player2;
    
    if (p1 && p2 && (p1.health <= 0 || p2.health <= 0)) {
        endGame();
        return true;
    }
    return false;
}

function endGame() {
    currentState = GameState.VICTORY;
    
    const p1 = game.isOnline ? game.localPlayer : player1;
    const p2 = game.isOnline ? game.remotePlayer : player2;
    
    let winner = 'DRAW';
    if (p1 && p2) {
        if (p1.health > p2.health) winner = 'YOU WIN';
        else if (p2.health > p1.health) winner = 'OPPONENT WINS';
    }
    
    document.getElementById('winnerText').textContent = winner;
    showScreen('victoryScreen');
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function gameLoop() {
    if (currentState === GameState.PLAYING) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        handleInput();
        gameObjects.forEach(obj => obj.update());
        particles = particles.filter(p => { p.update(); return p.life > 0; });
        particles.forEach(p => p.draw());
        gameObjects.forEach(obj => obj.draw());
        updateUI();
        checkGameEnd();
        if (slowMotion > 0) slowMotion--;
    }
    requestAnimationFrame(gameLoop);
}

// Initialize
window.onload = init;