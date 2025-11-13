// === ULTRA EPIC GAME.JS ===

// Add to game variables
let cameraShake = 0;
let hitStop = 0;
let bgParticles = [];

// Enhanced Player Class
class Player {
    // ... previous code ...
    
    draw() {
        ctx.save();
        
        // Apply camera shake
        if (cameraShake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * cameraShake,
                (Math.random() - 0.5) * cameraShake
            );
            cameraShake *= 0.9;
        }
        
        // Apply hit stop (freeze frame)
        if (hitStop > 0) {
            hitStop--;
            return;
        }
        
        // Dynamic glow based on health
        const glowIntensity = 0.5 + (this.health / this.maxHealth) * 0.5;
        ctx.shadowBlur = 30 * glowIntensity;
        ctx.shadowColor = this.character.color;
        
        // Draw character with 3D effect
        ctx.fillStyle = this.character.color;
        
        // Add inner glow for special ready
        if (this.special >= 50) {
            ctx.fillStyle = `radial-gradient(circle, ${this.character.color}, #fff)`;
            ctx.shadowBlur = 50;
        }
        
        // Draw main body
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw energy core (pulsing)
        if (this.special >= 50) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            ctx.fillRect(this.x + this.width/2 - 3, this.y + this.height - 15, 6, 6);
            ctx.globalAlpha = 1;
        }
        
        // Draw eyes with animation
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        const eyeGlow = Math.sin(this.animFrame * 0.2) * 2;
        ctx.fillRect(this.x + 12 + eyeGlow, this.y + 18, 4, 4);
        ctx.fillRect(this.x + 24 + eyeGlow, this.y + 18, 4, 4);
        
        // Draw blocking aura
        if (this.isBlocking) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00FFFF';
            ctx.strokeRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
            
            // Energy shield effect
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
            ctx.globalAlpha = 1;
        }
        
        // Attack trail effect
        if (this.isAttacking) {
            const trailAlpha = 0.5 - (this.animFrame / 20);
            ctx.globalAlpha = Math.max(0, trailAlpha);
            ctx.fillStyle = this.character.color;
            ctx.fillRect(this.x - this.velocityX * 3, this.y, this.width, this.height);
            ctx.globalAlpha = 1;
            
            // Shockwave ring
            ctx.strokeStyle = this.character.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 
                    this.character.attackRange * (this.animFrame / 10), 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Enhanced Particle System
class UltraParticle {
    constructor(x, y, vx, vy, color, life, size = 5) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.life = life; this.maxLife = life;
        this.size = size; this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.4;
        this.life--;
        this.size *= 0.96;
        this.rotation += this.rotationSpeed;
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw neon square with glow
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // Inner bright core
        ctx.fillStyle = '#fff';
        ctx.globalAlpha *= 0.6;
        ctx.fillRect(-this.size/4, -this.size/4, this.size/2, this.size/2);
        
        ctx.restore();
    }
}

// Enhanced VFX Functions
function createUltraHitParticles(x, y) {
    for (let i = 0; i < 25; i++) {
        const angle = (Math.PI * 2 / 25) * i + (Math.random() - 0.5) * 0.5;
        const speed = Math.random() * 12 + 8;
        particles.push(new UltraParticle(
            x + Math.random() * 20 - 10,
            y + Math.random() * 20 - 10,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 5,
            ['#FF0040', '#FF8000', '#FFFF00'][Math.floor(Math.random() * 3)],
            45,
            Math.random() * 8 + 4
        ));
    }
    cameraShake = 15;
    hitStop = 3;
}

function createUltraBlockParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        particles.push(new UltraParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            '#00FFFF',
            30,
            Math.random() * 6 + 3
        ));
    }
}

function createUltraEnergyWave(x, y, direction) {
    const colors = ['#00BFFF', '#00FFFF', '#0080FF'];
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            particles.push(new UltraParticle(
                x + (i * direction * 6),
                y + (Math.random() - 0.5) * 30,
                direction * 15,
                (Math.random() - 0.5) * 5,
                colors[Math.floor(Math.random() * 3)],
                50,
                8
            ));
        }, i * 8);
    }
}

// Background particle system
function createBGParticles() {
    for (let i = 0; i < 50; i++) {
        bgParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: Math.random() * 0.5,
            size: Math.random() * 3 + 1,
            color: `hsl(${180 + Math.random() * 60}, 100%, 70%)`
        });
    }
}

function drawBGParticles() {
    bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height) p.y = -10;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });
}

// Enhanced draw function
function gameLoop() {
    if (currentState === GameState.PLAYING) {
        // Clear with trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dynamic gradient background
        const time = Date.now() * 0.001;
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, canvas.width
        );
        gradient.addColorStop(0, `rgba(0, 191, 255, ${0.02 + Math.sin(time) * 0.01})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGrid();
        drawBGParticles();
        handleInput();
        gameObjects.forEach(obj => obj.update());
        particles = particles.filter(p => { p.update(); return p.life > 0; });
        particles.forEach(p => p.draw());
        gameObjects.forEach(obj => obj.draw());
        updateUI();
        checkGameEnd();
        if (slowMotion > 0) slowMotion--;
    } else if (currentState === GameState.MENU) {
        // Draw animated menu background
        const time = Date.now() * 0.0005;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 5; i++) {
            const x = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(time + i * 0.7) * 0.5 + 0.5) * canvas.height;
            ctx.fillStyle = `rgba(0, 191, 255, ${0.05 - i * 0.01})`;
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#00BFFF';
            ctx.beginPath();
            ctx.arc(x, y, 100 + i * 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    requestAnimationFrame(gameLoop);
}

// Initialize enhanced systems
window.onload = () => {
    init();
    createBGParticles();
};
