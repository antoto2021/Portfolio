const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- VARIABLES DU JEU ---
let width, height;
let strokes = 0;
let isDragging = false;
let dragStartX, dragStartY;
let isMoving = false;

// Configuration Balle
const ball = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    radius: 10,
    color: 'white',
    friction: 0.97 // Ralentissement (0.97 = herbe, 0.99 = glace)
};

// Configuration Trou
const hole = {
    x: 0, y: 0,
    radius: 15,
    color: '#1e293b' // Ardoise foncée
};

// Obstacles (Murs)
let walls = [];

// --- INITIALISATION ---
function init() {
    resize();
    resetGame();
    window.addEventListener('resize', resize);
    
    // Événements Souris & Tactile
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    
    canvas.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drag(e.touches[0]); });
    canvas.addEventListener('touchend', endDrag);

    loop();
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    setupLevel(); // Repositionne les éléments si l'écran change
}

function setupLevel() {
    // Position de départ (Bas centre)
    ball.x = width / 2;
    ball.y = height - 100;
    ball.vx = 0; ball.vy = 0;

    // Position du trou (Haut centre)
    hole.x = width / 2;
    hole.y = 100;

    // Création de Murs (Obstacles)
    walls = [
        // Mur central mouvant
        { x: width/2 - 50, y: height/2, w: 100, h: 20 }
    ];
}

function resetGame() {
    strokes = 0;
    updateUI();
    document.getElementById('win-screen').classList.add('hidden');
    setupLevel();
}

// --- LOGIQUE JEU (BOUCLE) ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function update() {
    if (!isMoving) return;

    // 1. Appliquer la vélocité
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 2. Appliquer la friction (ralentissement)
    ball.vx *= ball.friction;
    ball.vy *= ball.friction;

    // 3. Arrêt complet si très lent
    if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
        ball.vx = 0;
        ball.vy = 0;
        isMoving = false;
    }

    // 4. Collisions Murs (Bords de l'écran)
    if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -1; }
    if (ball.x + ball.radius > width) { ball.x = width - ball.radius; ball.vx *= -1; }
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -1; }
    if (ball.y + ball.radius > height) { ball.y = height - ball.radius; ball.vy *= -1; }

    // 5. Collisions Obstacles (Simple AABB)
    walls.forEach(w => {
        // Détection simple : si la balle est dans le rectangle
        if (ball.x > w.x - ball.radius && ball.x < w.x + w.w + ball.radius &&
            ball.y > w.y - ball.radius && ball.y < w.y + w.h + ball.radius) {
            
            // Inversion basique (peut être améliorée)
            // On inverse juste la direction pour simplifier
            ball.vx *= -1;
            ball.vy *= -1;
        }
    });

    // 6. Victoire (Balle dans le trou)
    const dist = Math.hypot(ball.x - hole.x, ball.y - hole.y);
    if (dist < hole.radius && Math.abs(ball.vx) < 5) { // Doit être assez lent pour entrer
        ball.vx = 0; ball.vy = 0;
        ball.x = hole.x; ball.y = hole.y;
        document.getElementById('final-score').innerText = strokes;
        document.getElementById('win-screen').classList.remove('hidden');
    }
}

// --- DESSIN ---
function draw() {
    // Fond Herbe
    ctx.clearRect(0, 0, width, height);
    
    // Trou
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = hole.color;
    ctx.fill();
    ctx.closePath();

    // Murs
    ctx.fillStyle = '#14532d'; // Vert très foncé
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
    });

    // Ligne de visée (si on tire)
    if (isDragging && !isMoving) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + (ball.x - dragStartX), ball.y + (ball.y - dragStartY));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]); // Pointillés
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Balle
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
}

// --- GESTION INPUT (DRAG & SHOOT) ---
function startDrag(e) {
    if (isMoving) return; // On ne peut pas tirer si la balle bouge
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX || e.pageX; // Compatible Touch/Mouse
    const y = e.clientY || e.pageY;

    // Vérifie si on clique sur la balle (avec une marge)
    const dist = Math.hypot(x - ball.x, y - ball.y);
    if (dist < 50) {
        isDragging = true;
    }
}

function drag(e) {
    if (!isDragging) return;
    dragStartX = e.clientX || e.pageX;
    dragStartY = e.clientY || e.pageY;
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    // Calcul de la puissance (inverse du mouvement)
    const power = 0.15; // Facteur de puissance
    ball.vx = (ball.x - dragStartX) * power;
    ball.vy = (ball.y - dragStartY) * power;

    // Limite de vitesse max
    const maxSpeed = 20;
    if (ball.vx > maxSpeed) ball.vx = maxSpeed;
    if (ball.vy > maxSpeed) ball.vy = maxSpeed;

    if (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5) {
        isMoving = true;
        strokes++;
        updateUI();
    }
}

function updateUI() {
    document.getElementById('stroke-count').innerText = strokes;
}

// Lancement
init();
