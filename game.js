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
let gameObjects = [];
let particles = [];
let bgParticles = [];
let game = {
    isOnline: false,
    isHost: false,
    localPlayer: null,
    remotePlayer: null,
    roomCode: null
};
const keys = {};

const characters = {
    rynix: { name: 'Rynix', color: '#00BFFF', speed: 5, damage: 10, specialDamage: 30, maxHealth: 100, attackRange: 60, specialRange: 100, abilities: { attack: 'Photon Blade', special: 'photonBlade' }},
    vexa: { name: 'Vexa', color: '#FF00FF', speed: 7, damage: 8, specialDamage: 25, maxHealth: 90, attackRange: 50, specialRange: 80, abilities: { attack: 'Cyber Dash', special: 'cyberDash' }},
    drok: { name: 'Drok', color: '#FF8000', speed: 3, damage: 15, specialDamage: 40, maxHealth: 120, attackRange: 70, specialRange: 120, abilities: { attack: 'Core Smash', special: 'coreSmash' }},
    zyra: { name: 'Zyra', color: '#00FF80', speed: 4, damage: 7, specialDamage: 35, maxHealth: 85, attackRange: 90, specialRange: 150, abilities: { attack: 'EMP Pulse', special: 'empPulse' }},
    kain: { name: 'Kain', color: '#FFFF00', speed: 6, damage: 9, specialDamage: 28, maxHealth: 95, attackRange: 55, specialRange: 90, abilities: { attack: 'Echo Mirage', special: 'echoMirage' }}
};

class Player {
    constructor(x, y, character, isPlayerOne) {
        this.x = x; this.y = y; this.width = 40; this.height = 60;
        this.character = character; this.isPlayerOne = isPlayerOne;
        this.velocityX = 0; this.velocityY = 0; this.health = character.maxHealth;
        this.maxHealth = character.maxHealth; this.special = 0; this.maxSpecial = 100;
        this.combo = 0; this.isGrounded = false; this.isBlocking = false;
        this.isAttacking = false; this.attackCooldown = 0;
        this.facing = isPlayerOne ? 1 : -1; this.animFrame = 0; this.state = 'idle';
        this.hitstun = 0;
    }

    update() {
        if (game.isOnline && !this.isPlayerOne) return;
        if (!this.isGrounded) this.velocityY += 0.8;
        this.x += this.velocityX; this.y += this.velocityY;
        if (this.y > canvas.height - this.height - 50) {
            this.y = canvas.height - this.height - 50; this.velocityY = 0; this.isGrounded = true;
        } else this.isGrounded = false;
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.velocityX *= 0.8;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hitstun > 0) this.hitstun--;
        if (this.combo > 0 && this.attackCooldown < 30) this.combo = 0;
        this.animFrame++;
    }

    move(direction) {
        if (this.hitstun > 0) return;
        this.velocityX = direction * this.character.speed;
        this.facing = direction; this.state = 'walk';
    }

    jump() {
        if (this.isGrounded && this.hitstun === 0) {
            this.velocityY = -15; this.isGrounded = false; this.state = 'jump';
        }
    }

    attack(opponent) {
        if (this.attackCooldown > 0 || this.hitstun > 0) return;
        this.isAttacking = true; this.attackCooldown = 20; this.state = 'attack'; this.animFrame = 0;
        const distance = Math.abs(this.x - opponent.x);
        if (distance < this.character.attackRange + this.width && !opponent.isBlocking) {
            opponent.takeDamage(this.character.damage); this.special = Math.min(this.maxSpecial, this.special + 10);
            this.combo++; createUltraHitParticles(opponent.x, opponent.y);
        } else if (opponent.isBlocking) createUltraBlockParticles(opponent.x, opponent.y);
        setTimeout(() => { this.isAttacking = false; this.state = 'idle'; }, 200);
    }

    specialAttack(opponent) {
        if (this.special < 50 || this.attackCooldown > 0 || this.hitstun > 0) return;
        this.special -= 50; this.isAttacking = true; this.state = 'special'; this.animFrame = 0;
        this.executeSpecial(opponent);
        setTimeout(() => { this.isAttacking = false; this.state = 'idle'; }, 500);
    }

    executeSpecial(opponent) {
        switch (this.character.abilities.special) {
            case 'photonBlade': createUltraEnergyWave(this.x + (this.facing * 30), this.y, this.facing);
                const distance = Math.abs(this.x - opponent.x);
                if (distance < this.character.specialRange + this.width && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage); this.combo++;
                } break;
            case 'cyberDash': const newX = opponent.x - (this.facing * 80);
                this.x = Math.max(0, Math.min(canvas.width - this.width, newX));
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (!opponent.isBlocking) {
                            opponent.takeDamage(this.character.specialDamage / 3);
                            createUltraHitParticles(opponent.x, opponent.y);
                        }
                    }, i * 100);
                } break;
            case 'coreSmash': createShockwave(this.x, this.y + this.height);
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage); opponent.velocityY = -10;
                    opponent.velocityX = (opponent.x > this.x ? 1 : -1) * 5;
                } break;
            case 'empPulse': createEMPOrb(this.x + (this.facing * this.width), this.y + 20, this.facing);
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage); opponent.hitstun = 30;
                } break;
            case 'echoMirage': for (let i = 0; i < 3; i++) {
                setTimeout(() => createClone(this.x + (i * 20), this.y), i * 100);
            }
                if (Math.abs(this.x - opponent.x) < this.character.specialRange && !opponent.isBlocking) {
                    opponent.takeDamage(this.character.specialDamage); this.x = opponent.x - (this.facing * 60);
                } break;
        }
    }

    block() { if (this.hitstun === 0) this.isBlocking = true; }
    unblock() { this.isBlocking = false; }
    takeDamage(damage) {
        if (this.isBlocking) damage *= 0.5;
        this.health = Math.max(0, this.health - damage);
        this.hitstun = 20; this.state = 'hit'; this.combo = 0;
        if (this.health === 0) triggerSlowMotion();
    }

    draw() {
        ctx.save();
        if (slowMotion > 0) ctx.globalAlpha = 0.7;
        if (cameraShake > 0) {
            ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
            cameraShake *= 0.9;
        }
        if (hitStop > 0) { hitStop--; return; }
        const glowIntensity = 0.5 + (this.health / this.maxHealth) * 0.5;
        ctx.shadowBlur = 30 * glowIntensity;
        ctx.shadowColor = this.character.color;
        if (this.special >= 50) {
            ctx.fillStyle = `radial-gradient(circle, ${this.character.color}, #fff)`;
            ctx.shadowBlur = 50;
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
        if (this.special >= 50) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            ctx.fillRect(this.x + this.width/2 - 3, this.y + this.height - 15, 6, 6);
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        const eyeGlow = Math.sin(this.animFrame * 0.2) * 2;
        ctx.fillRect(this.x + 12 + eyeGlow, this.y + 18, 4, 4);
        ctx.fillRect(this.x + 24 + eyeGlow, this.y + 18, 4, 4);
        if (this.isBlocking) {
            ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 4; ctx.shadowBlur = 30; ctx.shadowColor = '#00FFFF';
            ctx.strokeRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
            ctx.globalAlpha = 0.3; ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
            ctx.globalAlpha = 1;
        }
        if (this.isAttacking) {
            const trailAlpha = 0.5 - (this.animFrame / 20);
            ctx.globalAlpha = Math.max(0, trailAlpha);
            ctx.fillStyle = this.character.color;
            ctx.fillRect(this.x - this.velocityX * 3, this.y, this.width, this.height);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = this.character.color; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.character.attackRange * (this.animFrame / 10), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class RemotePlayer extends Player {
    constructor(x, y, character, isPlayerOne) {
        super(x, y, character, isPlayerOne);
        this.targetX = x; this.targetY = y;
    }
    update() {
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;
    }
}

class UltraParticle {
    constructor(x, y, vx, vy, color, life, size = 5) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.life = life; this.maxLife = life;
        this.size = size; this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.vy += 0.4;
        this.life--; this.size *= 0.96; this.rotation += this.rotationSpeed;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha *= 0.6;
        ctx.fillRect(-this.size/4, -this.size/4, this.size/2, this.size/2);
        ctx.restore();
    }
}

let player1 = null;
let player2 = null;
let gameTimer = 99;
let timerInterval = null;
let slowMotion = 0;
let cameraShake = 0;
let hitStop = 0;
let p2p = null;

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && currentState === GameState.PLAYING) togglePause();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (player1 && e.code === 'Space') player1.unblock();
    if (player2 && (e.code === 'NumpadEnter' || e.code === 'Enter')) player2.unblock();
});

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
    document.getElementById('localBtn').onclick = () => { game.isOnline = false; showScreen('characterSelect'); };
    document.getElementById('onlineBtn').onclick = () => showScreen('p2pMenu');
    document.getElementById('controlsBtn').onclick = () => showScreen('controlsScreen');
    document.getElementById('p2pHostBtn').onclick = hostP2PGame;
    document.getElementById('p2pJoinBtn').onclick = joinP2PGame;
    document.getElementById('p2pBackBtn').onclick = () => showScreen('mainMenu');
    document.getElementById('controlsBackBtn').onclick = () => showScreen('mainMenu');
    document.querySelectorAll('.character-card').forEach(card => {
        card.onclick = () => selectCharacter(card.dataset.character);
    });
    document.getElementById('resumeBtn').onclick = togglePause;
    document.getElementById('mainMenuBtn').onclick = () => { showScreen('mainMenu'); cleanupGame(); };
    document.getElementById('rematchBtn').onclick = () => { cleanupGame();
