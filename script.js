const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hudScore = document.getElementById("hudScore");
const hudLevel = document.getElementById("hudLevel");
const hudLives = document.getElementById("hudLives");

const menuOverlay = document.getElementById("menuOverlay");
const levelOverlay = document.getElementById("levelOverlay");
const storyOverlay = document.getElementById("storyOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const victoryOverlay = document.getElementById("victoryOverlay");

const storyTitle = document.getElementById("storyTitle");
const storyText = document.getElementById("storyText");
const gameOverText = document.getElementById("gameOverText");
const levelGrid = document.getElementById("levelGrid");

const playBtn = document.getElementById("playBtn");
const levelsBtn = document.getElementById("levelsBtn");
const backFromLevels = document.getElementById("backFromLevels");
const storyContinue = document.getElementById("storyContinue");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");
const retryBtn = document.getElementById("retryBtn");
const goMenuBtn = document.getElementById("goMenuBtn");
const victoryMenuBtn = document.getElementById("victoryMenuBtn");
const fireBtn = document.getElementById("fireBtn");
const menuBtn = document.getElementById("menuBtn");

const W = 720;
const H = 1280;
canvas.width = W;
canvas.height = H;

const MAX_LEVEL = 10;
const SAVE_KEY = "arcade_avion_progress_v6";
const POWERUP_INTERVAL = 5000;

const stories = [
  {
    title: "La Última Resistencia",
    text: "La galaxia cayó. Solo queda una nave capaz de romper el bloqueo enemigo."
  },
  {
    title: "Tu misión",
    text: "Atravesá 10 sectores, derrotá oleadas y enfrentá jefes únicos."
  },
  {
    title: "Última advertencia",
    text: "En el nivel final, la Resistencia entera te cubrirá."
  }
];

const bgPalettes = [
  { top: "#050816", bottom: "#102a5a" },
  { top: "#0b0620", bottom: "#2b2e77" },
  { top: "#061b2d", bottom: "#0f4b7d" },
  { top: "#1a0811", bottom: "#7d2f1d" },
  { top: "#08162c", bottom: "#1366a6" },
  { top: "#1e0a2f", bottom: "#6a1f89" },
  { top: "#071c10", bottom: "#1f6a43" },
  { top: "#220707", bottom: "#8b2323" },
  { top: "#031f33", bottom: "#1895c7" },
  { top: "#1f001d", bottom: "#8c1f7a" }
];

const planeDefs = [
  {
    name: "Falcon",
    unlockAt: 1,
    cost: 0,
    body: "#2dd6ff",
    wing: "#ffffff",
    glow: "#70f1ff",
    speed: 10,
    shots: 1,
    shotDelay: 190,
    bulletSpeed: 15,
    scale: 0.95
  },
  {
    name: "Viper",
    unlockAt: 3,
    cost: 40,
    body: "#7dff5a",
    wing: "#dbffd0",
    glow: "#a8ff91",
    speed: 10.8,
    shots: 2,
    shotDelay: 170,
    bulletSpeed: 15.5,
    scale: 0.92
  },
  {
    name: "Phantom",
    unlockAt: 5,
    cost: 90,
    body: "#ffb45a",
    wing: "#fff2d0",
    glow: "#ffd18d",
    speed: 9.4,
    shots: 3,
    shotDelay: 155,
    bulletSpeed: 16,
    scale: 1.0
  },
  {
    name: "Nova",
    unlockAt: 7,
    cost: 160,
    body: "#d15cff",
    wing: "#f6d5ff",
    glow: "#e4a9ff",
    speed: 10.2,
    shots: 4,
    shotDelay: 140,
    bulletSpeed: 16.6,
    scale: 1.02
  },
  {
    name: "Titan",
    unlockAt: 9,
    cost: 260,
    body: "#ff5a6f",
    wing: "#ffd3d9",
    glow: "#ff9aa7",
    speed: 8.8,
    shots: 5,
    shotDelay: 130,
    bulletSpeed: 17,
    scale: 1.06
  }
];

const state = {
  screen: "menu",
  score: 0,
  credits: 0,
  lives: 5,
  level: 1,
  unlocked: 1,
  bestLevel: 1,
  equippedPlane: 0,
  ownedPlanes: [true, false, false, false, false],
  paused: false,
  shooting: false,
  pointerDown: false,
  pointerId: null,
  introIndex: 0,
  flash: 0,
  stars: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  powerups: [],
  boss: null,
  bossActive: false,
  bossHP: 0,
  bossMaxHP: 0,
  levelKills: 0,
  bossSpawnTimer: 0,
  nextShotAt: 0,
  nextEnemyAt: 0,
  nextPowerupAt: 0,
  nextPowerType: "shield",
  shieldUntil: 0,
  tripleUntil: 0,
  lastTime: 0,
  allies: [],
  allyBullets: [],
  player: {
    x: W / 2 - 34,
    y: H - 180,
    w: 68,
    h: 68,
    speed: 10
  }
};

let shopOverlay = null;
let shopList = null;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function nowMs() {
  return performance.now();
}

function rectsHit(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

function isShieldActive() {
  return nowMs() < state.shieldUntil;
}

function isTripleActive() {
  return nowMs() < state.tripleUntil;
}

function activePlane() {
  return planeDefs[state.equippedPlane] || planeDefs[0];
}

function saveProgress() {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      unlocked: state.unlocked,
      bestLevel: state.bestLevel,
      credits: state.credits,
      equippedPlane: state.equippedPlane,
      ownedPlanes: state.ownedPlanes
    })
  );
}

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    state.unlocked = clamp(Number(data.unlocked || 1), 1, MAX_LEVEL);
    state.bestLevel = clamp(Number(data.bestLevel || 1), 1, MAX_LEVEL);
    state.credits = Math.max(0, Number(data.credits || 0));
    state.equippedPlane = clamp(Number(data.equippedPlane || 0), 0, planeDefs.length - 1);

    if (Array.isArray(data.ownedPlanes)) {
      state.ownedPlanes = planeDefs.map((_, i) => Boolean(data.ownedPlanes[i]));
    }
    state.ownedPlanes[0] = true;
    if (!state.ownedPlanes[state.equippedPlane]) state.equippedPlane = 0;
  } catch {
    state.unlocked = 1;
    state.bestLevel = 1;
    state.credits = 0;
    state.equippedPlane = 0;
    state.ownedPlanes = [true, false, false, false, false];
  }
}

function updateHud() {
  const shieldLeft = Math.max(0, Math.ceil((state.shieldUntil - nowMs()) / 1000));
  const tripleLeft = Math.max(0, Math.ceil((state.tripleUntil - nowMs()) / 1000));

  hudScore.textContent = `Puntos: ${state.score} | Créditos: ${state.credits}`;
  hudLevel.textContent = `Nivel: ${state.level}/${MAX_LEVEL}`;
  hudLives.textContent = `Vidas: ${state.lives} | Esc: ${shieldLeft}s | x3: ${tripleLeft}s`;
}

function showScreen(name) {
  state.screen = name;
  menuOverlay.style.display = name === "menu" ? "block" : "none";
  levelOverlay.style.display = name === "levels" ? "block" : "none";
  storyOverlay.style.display = name === "story" ? "block" : "none";
  pauseOverlay.style.display = name === "pause" ? "block" : "none";
  gameOverOverlay.style.display = name === "gameover" ? "block" : "none";
  victoryOverlay.style.display = name === "victory" ? "block" : "none";
  if (shopOverlay) shopOverlay.style.display = name === "shop" ? "block" : "none";
}

function updateStoryScreen() {
  const page = stories[state.introIndex];
  storyTitle.textContent = page.title;
  storyText.textContent = page.text;
}

function createStars() {
  state.stars = [];
  for (let i = 0; i < 200; i++) {
    state.stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() < 0.82 ? 1 : 2,
      s: 0.4 + Math.random() * 1.8,
      tw: Math.random() * Math.PI * 2
    });
  }
}

function spawnParticles(x, y, color, count = 14, power = 4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = power * (0.4 + Math.random() * 1.5);
    state.particles.push({
      x,
      y,
      dx: Math.cos(a) * s,
      dy: Math.sin(a) * s,
      life: 18 + Math.random() * 28,
      color
    });
  }
}

function planeForLevel(level) {
  const idx = Math.min(
    planeDefs.length - 1,
    Math.max(0, Math.floor((level - 1) / 2))
  );
  return planeDefs[idx];
}

function shotsForLevel(level) {
  if (level >= 9) return 4;
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  return 1;
}

function applyEquippedPlane() {
  const p = activePlane();
  state.player.speed = p.speed;
}

function resetGame(level = 1) {
  state.score = 0;
  state.lives = 5;
  state.level = level;
  state.paused = false;
  state.shooting = false;
  state.pointerDown = false;
  state.pointerId = null;
  state.introIndex = 0;
  state.flash = 0;
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.particles = [];
  state.powerups = [];
  state.boss = null;
  state.bossActive = false;
  state.bossHP = 0;
  state.bossMaxHP = 0;
  state.levelKills = 0;
  state.bossSpawnTimer = 0;
  state.nextShotAt = 0;
  state.nextEnemyAt = nowMs() + 700;
  state.nextPowerupAt = nowMs() + POWERUP_INTERVAL;
  state.nextPowerType = "shield";
  state.shieldUntil = 0;
  state.tripleUntil = 0;
  state.allies = [];
  state.allyBullets = [];
  state.player.x = W / 2 - state.player.w / 2;
  state.player.y = H - 180;
  state.equippedPlane = clamp(state.equippedPlane, 0, planeDefs.length - 1);
  applyEquippedPlane();
  createStars();
  updateHud();
}

function startLevel(level) {
  resetGame(level);
  showScreen("playing");
  if (state.level >= 10) spawnAllies();
}

function buildLevelButtons() {
  levelGrid.innerHTML = "";
  for (let i = 1; i <= MAX_LEVEL; i++) {
    const btn = document.createElement("button");
    btn.className = "levelBtn" + (i > state.unlocked ? " locked" : "");
    btn.disabled = i > state.unlocked;
    const planeName = planeForLevel(i).name;
    btn.textContent = `Nivel ${i}\n${planeName}`;
    btn.style.whiteSpace = "pre-line";
    btn.addEventListener("click", () => {
      if (i <= state.unlocked) startLevel(i);
    });
    levelGrid.appendChild(btn);
  }
}

function setupMenuShopButton() {
  const panel = menuOverlay.querySelector(".panel");
  if (!panel || panel.querySelector("#openShopBtn")) return;

  const row = document.createElement("div");
  row.className = "row";
  row.style.marginTop = "10px";

  const shopBtn = document.createElement("button");
  shopBtn.id = "openShopBtn";
  shopBtn.className = "btn secondary";
  shopBtn.textContent = "Tienda";
  shopBtn.addEventListener("click", openShop);

  row.appendChild(shopBtn);
  panel.appendChild(row);
}

function createShopOverlay() {
  if (shopOverlay) return;

  shopOverlay = document.createElement("div");
  shopOverlay.className = "overlay";
  shopOverlay.id = "shopOverlay";
  shopOverlay.style.display = "none";
  shopOverlay.innerHTML = `
    <div class="panel">
      <h2>Tienda de aviones</h2>
      <p>Comprá y equipá modelos nuevos. Algunos se desbloquean por nivel.</p>
      <div id="shopList"></div>
      <div class="row">
        <button class="btn secondary" id="closeShopBtn">Cerrar</button>
      </div>
    </div>
  `;
  document.getElementById("gameWrap").appendChild(shopOverlay);
  shopList = shopOverlay.querySelector("#shopList");
  shopOverlay.querySelector("#closeShopBtn").addEventListener("click", () => {
    showScreen("menu");
  });
}

function renderShop() {
  if (!shopList) return;
  shopList.innerHTML = "";

  planeDefs.forEach((plane, idx) => {
    const owned = state.ownedPlanes[idx];
    const unlockedByLevel = state.bestLevel >= plane.unlockAt;
    const canBuy = unlockedByLevel && state.credits >= plane.cost;
    const equipped = state.equippedPlane === idx;

    const card = document.createElement("div");
    card.style.marginTop = "12px";
    card.style.padding = "12px";
    card.style.borderRadius = "14px";
    card.style.background = "rgba(255,255,255,0.08)";
    card.style.border = "1px solid rgba(255,255,255,0.08)";

    const title = document.createElement("div");
    title.style.fontWeight = "bold";
    title.style.fontSize = "16px";
    title.style.marginBottom = "6px";
    title.textContent = `${plane.name}`;

    const info = document.createElement("div");
    info.style.fontSize = "13px";
    info.style.opacity = "0.95";
    info.style.lineHeight = "1.5";
    info.textContent =
      `Desbloquea en nivel ${plane.unlockAt} · Costo ${plane.cost} créditos · ` +
      `Velocidad ${plane.speed.toFixed(1)} · Disparos ${plane.shots} · Cadencia ${plane.shotDelay}ms`;

    const preview = document.createElement("div");
    preview.style.marginTop = "10px";
    preview.style.height = "38px";
    preview.style.borderRadius = "12px";
    preview.style.background = "rgba(0,0,0,0.24)";
    preview.style.display = "flex";
    preview.style.alignItems = "center";
    preview.style.justifyContent = "space-between";
    preview.style.padding = "0 12px";
    preview.innerHTML = `
      <span style="color:${plane.body};font-weight:bold;">✈ ${plane.name}</span>
      <span style="color:${plane.glow};font-size:12px;">${owned ? "Poseído" : "No poseído"}</span>
    `;

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.style.width = "100%";
    btn.style.marginTop = "10px";

    if (!unlockedByLevel) {
      btn.textContent = `Bloqueado por nivel`;
      btn.disabled = true;
      btn.style.opacity = "0.55";
    } else if (!owned) {
      btn.textContent = canBuy ? `Comprar (${plane.cost})` : `Faltan créditos`;
      btn.disabled = !canBuy;
      btn.addEventListener("click", () => {
        if (state.credits < plane.cost) return;
        state.credits -= plane.cost;
        state.ownedPlanes[idx] = true;
        state.equippedPlane = idx;
        applyEquippedPlane();
        saveProgress();
        updateHud();
        renderShop();
      });
    } else if (equipped) {
      btn.textContent = "Equipado";
      btn.disabled = true;
      btn.style.opacity = "0.7";
    } else {
      btn.textContent = "Equipar";
      btn.addEventListener("click", () => {
        state.equippedPlane = idx;
        applyEquippedPlane();
        saveProgress();
        renderShop();
      });
    }

    card.appendChild(title);
    card.appendChild(info);
    card.appendChild(preview);
    card.appendChild(btn);
    shopList.appendChild(card);
  });
}

function openShop() {
  renderShop();
  showScreen("shop");
}

function spawnEnemy() {
  const size = 34 + Math.random() * 28;
  state.enemies.push({
    x: 20 + Math.random() * (W - 40 - size),
    y: -size - Math.random() * 180,
    w: size,
    h: size,
    speed: 1.2 + state.level * 0.18 + Math.random() * 1.1,
    hp: 1 + Math.floor(state.level / 3),
    type: Math.floor(Math.random() * 4),
    fireChance: 0.008 + state.level * 0.0025
  });
}

function spawnPowerup() {
  const type = state.nextPowerType;
  state.nextPowerType = state.nextPowerType === "shield" ? "triple" : "shield";
  state.powerups.push({
    type,
    x: 32 + Math.random() * (W - 64),
    y: -36,
    w: 36,
    h: 36,
    vy: 1.6 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2
  });
}

function spawnBoss() {
  const size = 118 + state.level * 8;
  state.boss = {
    x: W / 2 - size / 2,
    y: 90,
    w: size,
    h: size,
    phase: 0,
    style: (state.level - 1) % 5,
    lastShot: 0
  };
  state.bossActive = true;
  state.bossMaxHP = 80 + state.level * 34;
  state.bossHP = state.bossMaxHP;
  if (state.level >= 10) spawnAllies();
}

function spawnAllies() {
  state.allies = [];
  for (let i = 0; i < 4; i++) {
    state.allies.push({
      x: W / 2 - 110 + i * 70,
      y: H - 300 + (i % 2) * 18,
      w: 42,
      h: 42,
      hp: 8,
      shotAt: 0,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function drawBackground() {
  const pal = bgPalettes[(state.level - 1) % bgPalettes.length];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(1, pal.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 3; i++) {
    const x = W * (0.2 + i * 0.28);
    const y = H * 0.22 + Math.sin(nowMs() * 0.0005 + i) * 36;
    const grd = ctx.createRadialGradient(x, y, 20, x, y, 170);
    grd.addColorStop(0, `rgba(${180 - i * 10},${90 + i * 15},${220 - i * 6},0.16)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 170, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of state.stars) {
    s.y += s.s;
    s.tw += 0.03;
    if (s.y > H + 10) {
      s.y = -10;
      s.x = Math.random() * W;
    }
    const alpha = s.r === 1 ? 0.65 + Math.sin(s.tw) * 0.2 : 0.45 + Math.sin(s.tw) * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }

  const horizon = H * 0.84;
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(W * 0.15, horizon - 24);
  ctx.lineTo(W * 0.32, horizon - 12);
  ctx.lineTo(W * 0.49, horizon - 28);
  ctx.lineTo(W * 0.67, horizon - 10);
  ctx.lineTo(W * 0.82, horizon - 26);
  ctx.lineTo(W, horizon - 14);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
}

function drawPlane(x, y, plane, scale = 1, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  const body = plane.body;
  const wing = plane.wing;
  const glow = plane.glow;

  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;

  const w = 68 * scale;
  const h = 68 * scale;

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.52);
  ctx.lineTo(-w * 0.24, -h * 0.08);
  ctx.lineTo(-w * 0.37, h * 0.38);
  ctx.lineTo(0, h * 0.22);
  ctx.lineTo(w * 0.37, h * 0.38);
  ctx.lineTo(w * 0.24, -h * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.28);
  ctx.lineTo(-w * 0.48, h * 0.24);
  ctx.lineTo(0, h * 0.08);
  ctx.lineTo(w * 0.48, h * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-w * 0.09, -h * 0.38);
  ctx.lineTo(-w * 0.05, h * 0.22);
  ctx.lineTo(w * 0.05, h * 0.22);
  ctx.lineTo(w * 0.09, -h * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.08, w * 0.09, h * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.08, w * 0.045, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, h * 0.38, w * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer() {
  const plane = activePlane();
  const tilt = state.pointerDown ? 0 : Math.sin(nowMs() * 0.004) * 0.03;
  drawPlane(
    state.player.x + state.player.w / 2,
    state.player.y + state.player.h / 2,
    plane,
    plane.scale,
    tilt
  );

  if (isShieldActive()) {
    ctx.save();
    ctx.strokeStyle = "rgba(90,190,255,0.95)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(90,190,255,0.8)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(state.player.x + 34, state.player.y + 34, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flash / 24})`;
    ctx.fillRect(state.player.x - 8, state.player.y - 8, state.player.w + 16, state.player.h + 16);
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    const wobble = Math.sin(nowMs() * 0.002 + e.type) * 0.08;
    ctx.rotate(wobble);

    const colors = [
      ["#ff6b6b", "#ffd1d1"],
      ["#6bb6ff", "#d5efff"],
      ["#ffd55c", "#fff0b0"],
      ["#d26bff", "#efcfff"]
    ];
    const c = colors[e.type % colors.length];

    ctx.shadowColor = c[0];
    ctx.shadowBlur = 10;

    ctx.fillStyle = c[0];
    ctx.beginPath();
    ctx.moveTo(0, -e.h / 2);
    ctx.lineTo(-e.w * 0.48, e.h * 0.12);
    ctx.lineTo(-e.w * 0.12, e.h * 0.44);
    ctx.lineTo(0, e.h * 0.30);
    ctx.lineTo(e.w * 0.12, e.h * 0.44);
    ctx.lineTo(e.w * 0.48, e.h * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.arc(0, 0, e.w * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(-4, -2, 8, 5);

    ctx.restore();
  }
}

function drawBoss() {
  if (!state.boss) return;
  const b = state.boss;
  const pulse = 1 + Math.sin(nowMs() * 0.005) * 0.05;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  const styles = [
    { main: "#7effa1", sec: "#ffffff" },
    { main: "#ff6b6b", sec: "#ffd4d4" },
    { main: "#7faeff", sec: "#d6e5ff" },
    { main: "#d76bff", sec: "#f2d4ff" },
    { main: "#ffd96b", sec: "#fff5ce" }
  ];
  const s = styles[b.style];

  ctx.shadowColor = s.main;
  ctx.shadowBlur = 22;

  if (b.style === 0) {
    ctx.fillStyle = s.main;
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.sec;
    ctx.beginPath();
    ctx.arc(-b.w * 0.15, -b.h * 0.05, b.w * 0.08, 0, Math.PI * 2);
    ctx.arc(b.w * 0.15, -b.h * 0.05, b.w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.style === 1) {
    ctx.fillStyle = s.main;
    ctx.beginPath();
    ctx.moveTo(0, -b.h * 0.48);
    ctx.lineTo(b.w * 0.48, 0);
    ctx.lineTo(0, b.h * 0.48);
    ctx.lineTo(-b.w * 0.48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = s.sec;
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (b.style === 2) {
    ctx.fillStyle = s.main;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w * 0.45, b.h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.sec;
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.style === 3) {
    ctx.fillStyle = s.main;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 / 12) * i;
      const r = i % 2 === 0 ? b.w * 0.42 : b.w * 0.24;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = s.sec;
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = s.main;
    ctx.beginPath();
    ctx.moveTo(0, -b.h * 0.5);
    ctx.lineTo(b.w * 0.38, -b.h * 0.12);
    ctx.lineTo(b.w * 0.5, b.h * 0.22);
    ctx.lineTo(0, b.h * 0.5);
    ctx.lineTo(-b.w * 0.5, b.h * 0.22);
    ctx.lineTo(-b.w * 0.38, -b.h * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = s.sec;
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();

  const barW = 280;
  const barH = 16;
  const x = W / 2 - barW / 2;
  const y = 86;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = "#ff4a4a";
  ctx.fillRect(x, y, barW * (state.bossHP / state.bossMaxHP), barH);
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barW, barH);
}

function drawBullets() {
  for (const b of state.bullets) {
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, "#fff9b2");
    grad.addColorStop(1, "#ffcf39");
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ffe76b";
    ctx.shadowBlur = 12;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }

  for (const b of state.enemyBullets) {
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, "#ffb3b3");
    grad.addColorStop(1, "#ff4747");
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 10;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }
}

function drawPowerups() {
  for (const p of state.powerups) {
    const pulse = 1 + Math.sin(p.phase + nowMs() * 0.01) * 0.1;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.scale(pulse, pulse);

    if (p.type === "shield") {
      ctx.shadowColor = "#65cfff";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "#65cfff";
      ctx.fillStyle = "rgba(80,190,255,0.22)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, -8);
      ctx.lineTo(12, 10);
      ctx.lineTo(0, 18);
      ctx.lineTo(-12, 10);
      ctx.lineTo(-14, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d7f7ff";
      ctx.beginPath();
      ctx.arc(0, -1, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = "#ffbf4d";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ff9f2e";
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff3d0";
      ctx.beginPath();
      ctx.arc(-6, -2, 3, 0, Math.PI * 2);
      ctx.arc(0, 3, 3, 0, Math.PI * 2);
      ctx.arc(6, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 45);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawAllies() {
  if (state.level < 10) return;

  for (const ally of state.allies) {
    ctx.save();
    ctx.translate(ally.x + ally.w / 2, ally.y + ally.h / 2);
    const glow = Math.sin(nowMs() * 0.004 + ally.phase) * 0.5 + 1;

    ctx.shadowColor = "#7effa1";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#7effa1";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-18, 18);
    ctx.lineTo(18, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#effff4";
    ctx.beginPath();
    ctx.arc(0, -2, 6 * glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawAllyBullets() {
  for (const b of state.allyBullets) {
    ctx.shadowColor = "#7effa1";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#7effa1";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }
}

function spawnAllies() {
  state.allies = [];
  for (let i = 0; i < 4; i++) {
    state.allies.push({
      x: W / 2 - 110 + i * 70,
      y: H - 300 + (i % 2) * 18,
      w: 42,
      h: 42,
      hp: 8,
      shotAt: 0,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function spawnEnemy() {
  const size = 34 + Math.random() * 28;
  state.enemies.push({
    x: 20 + Math.random() * (W - 40 - size),
    y: -size - Math.random() * 180,
    w: size,
    h: size,
    speed: 1.2 + state.level * 0.18 + Math.random() * 1.1,
    hp: 1 + Math.floor(state.level / 3),
    type: Math.floor(Math.random() * 4),
    fireChance: 0.008 + state.level * 0.0025
  });
}

function spawnPowerup() {
  const type = state.nextPowerType;
  state.nextPowerType = state.nextPowerType === "shield" ? "triple" : "shield";
  state.powerups.push({
    type,
    x: 32 + Math.random() * (W - 64),
    y: -36,
    w: 36,
    h: 36,
    vy: 1.6 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2
  });
}

function spawnBoss() {
  const size = 118 + state.level * 8;
  state.boss = {
    x: W / 2 - size / 2,
    y: 90,
    w: size,
    h: size,
    phase: 0,
    style: (state.level - 1) % 5,
    lastShot: 0
  };
  state.bossActive = true;
  state.bossMaxHP = 80 + state.level * 34;
  state.bossHP = state.bossMaxHP;
  if (state.level >= 10) spawnAllies();
}

function bossFirePattern() {
  const b = state.boss;
  if (!b) return;

  const centerX = b.x + b.w / 2;
  const centerY = b.y + b.h / 2;
  const angleToPlayer = Math.atan2((state.player.y + 34) - centerY, (state.player.x + 34) - centerX);
  const style = b.style;

  if (style === 0) {
    state.enemyBullets.push({ x: centerX, y: centerY, w: 10, h: 18, dx: Math.cos(angleToPlayer) * 0.2, dy: Math.sin(angleToPlayer) * 7.2 });
  } else if (style === 1) {
    for (let i = -2; i <= 2; i++) {
      const a = angleToPlayer + i * 0.14;
      state.enemyBullets.push({ x: centerX, y: centerY, w: 10, h: 18, dx: Math.cos(a) * 0.2, dy: Math.sin(a) * 6.8 });
    }
  } else if (style === 2) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i + b.phase;
      state.enemyBullets.push({ x: centerX, y: centerY, w: 10, h: 18, dx: Math.cos(a) * 4, dy: Math.sin(a) * 4 });
    }
  } else if (style === 3) {
    for (let i = -1; i <= 1; i++) {
      const a = angleToPlayer + i * 0.18;
      state.enemyBullets.push({ x: centerX, y: centerY, w: 10, h: 18, dx: Math.cos(a) * 0.3, dy: Math.sin(a) * 7.5 });
    }
    if (Math.random() < 0.35) spawnEnemy();
  } else {
    for (let i = -3; i <= 3; i++) {
      const a = angleToPlayer + i * 0.12;
      state.enemyBullets.push({ x: centerX, y: centerY, w: 10, h: 18, dx: Math.cos(a) * 0.25, dy: Math.sin(a) * 7.9 });
    }
  }
}

function finishBoss() {
  const b = state.boss;
  if (!b) return;

  spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#ffcc55", 60, 6);
  state.boss = null;
  state.bossActive = false;
  state.score += 100;
  state.credits += 20;
  state.unlocked = Math.max(state.unlocked, Math.min(MAX_LEVEL, state.level + 1));
  state.bestLevel = Math.max(state.bestLevel, state.level + 1);
  saveProgress();

  if (state.level >= MAX_LEVEL) {
    showScreen("victory");
  } else {
    startLevel(state.level + 1);
    buildLevelButtons();
  }
}

function updateBullets() {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.y -= b.speed;
    if (b.y + b.h < -50) state.bullets.splice(i, 1);
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    b.x += b.dx || 0;
    b.y += b.dy || b.speed;

    if (b.y > H + 50 || b.x < -50 || b.x > W + 50) {
      state.enemyBullets.splice(i, 1);
      continue;
    }

    if (rectsHit(b, state.player)) {
      state.enemyBullets.splice(i, 1);
      hitPlayer();
    }
  }

  for (let i = state.allyBullets.length - 1; i >= 0; i--) {
    const b = state.allyBullets[i];
    b.x += b.dx;
    b.y += b.dy;

    if (b.y < -50 || b.y > H + 50 || b.x < -50 || b.x > W + 50) {
      state.allyBullets.splice(i, 1);
      continue;
    }

    if (state.boss && rectsHit(b, state.boss)) {
      state.bossHP -= 4;
      state.allyBullets.splice(i, 1);
      spawnParticles(b.x, b.y, "#7effa1", 6, 3);
      if (state.bossHP <= 0) finishBoss();
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (rectsHit(b, e)) {
        e.hp -= 2;
        state.allyBullets.splice(i, 1);
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, "#7effa1", 8, 3);
        if (e.hp <= 0) {
          state.enemies.splice(j, 1);
          state.score += 8;
          state.credits += 1;
          updateHud();
        }
        break;
      }
    }
  }
}

function updatePowerups() {
  const t = nowMs();

  if (t >= state.nextPowerupAt) {
    if (state.powerups.length < 3) spawnPowerup();
    state.nextPowerupAt = t + POWERUP_INTERVAL;
  }

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const p = state.powerups[i];
    p.phase += 0.05;
    p.y += p.vy;

    if (p.y > H + 80) {
      state.powerups.splice(i, 1);
      continue;
    }

    if (rectsHit(p, state.player)) {
      if (p.type === "shield") {
        state.shieldUntil = t + (10000 + Math.random() * 5000);
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "#6bb6ff", 14, 4);
      } else {
        state.tripleUntil = t + (5000 + Math.random() * 5000);
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "#ffbf4d", 14, 4);
      }
      state.powerups.splice(i, 1);
      updateHud();
    }
  }
}

function hitPlayer() {
  if (isShieldActive()) {
    spawnParticles(state.player.x + 34, state.player.y + 34, "#6bb6ff", 12, 4);
    return;
  }

  state.lives -= 1;
  state.flash = 10;
  spawnParticles(state.player.x + 34, state.player.y + 34, "#ff6464", 20, 5);
  updateHud();

  if (state.lives <= 0) {
    gameOverText.textContent = `Puntaje final: ${state.score}`;
    saveProgress();
    showScreen("gameover");
  }
}

function updateEnemies() {
  if (!state.bossActive && nowMs() >= state.nextEnemyAt) {
    spawnEnemy();
    state.nextEnemyAt = nowMs() + Math.max(420, 1100 - state.level * 55);
  }

  if (!state.bossActive && !state.boss && state.levelKills >= 12 + state.level * 3) {
    state.bossSpawnTimer += 16;
    if (state.bossSpawnTimer > 2200) {
      state.bossSpawnTimer = 0;
      spawnBoss();
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.y += e.speed;

    if (Math.random() < e.fireChance) {
      const ang = Math.atan2((state.player.y + 20) - (e.y + e.h), (state.player.x + 34) - (e.x + e.w / 2));
      state.enemyBullets.push({
        x: e.x + e.w / 2 - 4,
        y: e.y + e.h,
        w: 8,
        h: 18,
        dx: Math.cos(ang) * 0.2,
        dy: Math.sin(ang) * (7 + state.level * 0.25),
        speed: 7 + state.level * 0.25
      });
    }

    if (e.y > H + 120) {
      state.enemies.splice(i, 1);
      continue;
    }

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (rectsHit(b, e)) {
        state.bullets.splice(j, 1);
        e.hp -= 1;
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, "#ffaa55", 10, 4);

        if (e.hp <= 0) {
          state.enemies.splice(i, 1);
          state.score += 10;
          state.credits += 1;
          state.levelKills += 1;
          updateHud();

          if (Math.random() < 0.14) {
            state.powerups.push({
              type: Math.random() < 0.5 ? "shield" : "triple",
              x: e.x + e.w / 2,
              y: e.y + e.h / 2,
              w: 36,
              h: 36,
              vy: 1.5,
              phase: Math.random() * Math.PI * 2
            });
          }

          if (state.levelKills % 9 === 0 && !state.bossActive) {
            state.bossSpawnTimer = 1600;
          }
        }
        break;
      }
    }

    if (rectsHit(e, state.player)) {
      state.enemies.splice(i, 1);
      hitPlayer();
    }
  }
}

function updateBoss() {
  if (!state.boss) return;

  const b = state.boss;
  b.phase += 0.03;
  b.x = W / 2 - b.w / 2 + Math.sin(b.phase) * 160;
  b.y += Math.sin(b.phase * 0.7) * 0.35;

  const intervals = [860, 760, 820, 700, 640];
  if (nowMs() - b.lastShot > intervals[b.style]) {
    bossFirePattern();
    b.lastShot = nowMs();
  }

  for (let j = state.bullets.length - 1; j >= 0; j--) {
    const bullet = state.bullets[j];
    if (rectsHit(bullet, b)) {
      state.bullets.splice(j, 1);
      state.bossHP -= 1;
      state.score += 2;
      state.credits += 1;
      updateHud();
      spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#ffffff", 8, 4);
      if (state.bossHP <= 0) finishBoss();
      break;
    }
  }

  if (rectsHit(b, state.player)) {
    hitPlayer();
  }
}

function updatePlayer() {
  if (!state.shooting) return;

  const plane = activePlane();
  const delay = plane.shotDelay;
  const tripleBonus = isTripleActive() ? 2 : 0;

  if (nowMs() < state.nextShotAt) return;

  const count = plane.shots + tripleBonus;
  const spread = 16;

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    state.bullets.push({
      x: state.player.x + state.player.w / 2 - 4 + offset,
      y: state.player.y - 16,
      w: 8,
      h: 18,
      speed: plane.bulletSpeed + Math.floor(state.level / 3)
    });
  }

  state.nextShotAt = nowMs() + delay;
}

function updateAllies() {
  if (state.level < 10) return;
  if (state.allies.length === 0) spawnAllies();

  for (const ally of state.allies) {
    ally.phase += 0.02;
    ally.x += Math.sin(ally.phase) * 0.6;
    ally.y += Math.cos(ally.phase * 1.3) * 0.25;
    ally.hp = Math.min(8, ally.hp + 0.002);

    if (nowMs() > ally.shotAt) {
      let targetX = null;
      let targetY = null;

      if (state.bossActive && state.boss) {
        targetX = state.boss.x + state.boss.w / 2;
        targetY = state.boss.y + state.boss.h / 2;
      } else if (state.enemies.length > 0) {
        const e = state.enemies[Math.floor(Math.random() * state.enemies.length)];
        targetX = e.x + e.w / 2;
        targetY = e.y + e.h / 2;
      }

      if (targetX !== null) {
        const ang = Math.atan2(targetY - ally.y, targetX - ally.x);
        state.allyBullets.push({
          x: ally.x + ally.w / 2 - 4,
          y: ally.y,
          w: 8,
          h: 16,
          dx: Math.cos(ang) * 9.5,
          dy: Math.sin(ang) * 9.5
        });
        ally.shotAt = nowMs() + 420;
      }
    }
  }
}

function gameLoop(ts) {
  const dt = ts - state.lastTime || 16;
  state.lastTime = ts;

  drawBackground();

  if (state.screen === "playing") {
    if (!state.paused) {
      updatePlayer(dt);
      updateBullets();
      updateEnemies();
      updateBoss();
      updateAllies();
      updatePowerups();
      drawParticles();
      updateAllyBullets();
      if (state.flash > 0) state.flash--;
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255,70,70,${state.flash / 28})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    drawPowerups();
    drawBullets();
    drawAllyBullets();
    drawEnemies();
    drawAllies();
    drawBoss();
    drawPlayer();
    drawParticles();
  } else {
    drawPowerups();
    drawBullets();
    drawAllyBullets();
    drawEnemies();
    drawAllies();
    drawBoss();
    drawPlayer();
    drawParticles();
  }

  requestAnimationFrame(gameLoop);
}

function updateAllyBullets() {
  for (let i = state.allyBullets.length - 1; i >= 0; i--) {
    const b = state.allyBullets[i];
    b.x += b.dx;
    b.y += b.dy;

    if (b.y < -50 || b.y > H + 50 || b.x < -50 || b.x > W + 50) {
      state.allyBullets.splice(i, 1);
      continue;
    }

    if (state.boss && rectsHit(b, state.boss)) {
      state.bossHP -= 4;
      state.allyBullets.splice(i, 1);
      spawnParticles(b.x, b.y, "#7effa1", 6, 3);
      if (state.bossHP <= 0) finishBoss();
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (rectsHit(b, e)) {
        e.hp -= 2;
        state.allyBullets.splice(i, 1);
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, "#7effa1", 8, 3);
        if (e.hp <= 0) {
          state.enemies.splice(j, 1);
          state.score += 8;
          state.credits += 1;
          updateHud();
        }
        break;
      }
    }
  }
}

function goMenu() {
  state.paused = false;
  showScreen("menu");
  updateHud();
}

function setupEvents() {
  playBtn.addEventListener("click", () => startLevel(1));

  levelsBtn.addEventListener("click", () => {
    buildLevelButtons();
    showScreen("levels");
  });

  backFromLevels.addEventListener("click", () => showScreen("menu"));

  storyContinue.addEventListener("click", () => startLevel(1));

  pauseBtn.addEventListener("click", () => {
    if (state.screen === "playing") {
      state.paused = true;
      showScreen("pause");
    }
  });

  resumeBtn.addEventListener("click", () => {
    state.paused = false;
    showScreen("playing");
  });

  restartBtn.addEventListener("click", () => startLevel(state.level));
  retryBtn.addEventListener("click", () => startLevel(state.level));

  goMenuBtn.addEventListener("click", goMenu);
  victoryMenuBtn.addEventListener("click", goMenu);
  menuBtn.addEventListener("click", goMenu);

  fireBtn.addEventListener("pointerdown", () => {
    state.shooting = true;
  });
  fireBtn.addEventListener("pointerup", () => {
    state.shooting = false;
  });
  fireBtn.addEventListener("pointercancel", () => {
    state.shooting = false;
  });
  fireBtn.addEventListener("pointerleave", () => {
    state.shooting = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.pointerDown = true;
    state.pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    movePlayerTowardPointer(x, y);
    state.shooting = true;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.pointerDown || e.pointerId !== state.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    movePlayerTowardPointer(x, y);
  });

  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId !== state.pointerId) return;
    state.pointerDown = false;
    state.pointerId = null;
    state.shooting = false;
  });

  canvas.addEventListener("pointercancel", () => {
    state.pointerDown = false;
    state.pointerId = null;
    state.shooting = false;
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (state.screen === "playing") {
        state.paused = true;
        showScreen("pause");
      } else if (state.screen === "pause") {
        state.paused = false;
        showScreen("playing");
      }
    }

    if (state.screen !== "playing") return;

    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
      state.player.x = clamp(state.player.x - state.player.speed * 20, 10, W - state.player.w - 10);
    }
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
      state.player.x = clamp(state.player.x + state.player.speed * 20, 10, W - state.player.w - 10);
    }
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
      state.player.y = clamp(state.player.y - state.player.speed * 14, H * 0.48, H - state.player.h - 24);
    }
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
      state.player.y = clamp(state.player.y + state.player.speed * 14, H * 0.48, H - state.player.h - 24);
    }
    if (e.code === "Space") {
      state.shooting = true;
      setTimeout(() => {
        state.shooting = false;
      }, 120);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") state.shooting = false;
  });
}

function init() {
  loadProgress();
  createStars();
  createShopOverlay();
  setupMenuShopButton();
  setupEvents();
  applyEquippedPlane();
  buildLevelButtons();
  updateStoryScreen();
  showScreen("menu");
  updateHud();
  requestAnimationFrame(gameLoop);
}

init();

function movePlayerTowardPointer(x, y) {
  const p = state.player;
  p.x = clamp(x - p.w / 2, 10, W - p.w - 10);
  p.y = clamp(y - p.h / 2, H * 0.48, H - p.h - 24);
}