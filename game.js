'use strict';

// =============================================================================
// CONFIG — 非エンジニアでも調整しやすいパラメータをここに集約
// =============================================================================
const CONFIG = {
  // ---- Canvas ----
  WIDTH:  480,
  HEIGHT: 640,

  // ---- プレイヤー ----
  PLAYER_SPEED_NORMAL:   4.0,   // 通常移動速度
  PLAYER_SPEED_BOOST:    6.5,   // 青ベル取得中の速度
  PLAYER_FIRE_RATE:      8,     // 何フレームに1回ショット可能か
  PLAYER_INVINCIBLE_TIME:180,   // 被弾後の無敵フレーム数（60fps基準=3秒）
  INITIAL_LIVES:         3,     // 初期残機
  PLAYER_HIT_RADIUS:     9,     // 当たり判定半径（見た目より小さめ）

  // ---- ショット ----
  BULLET_SPEED:  12,            // プレイヤー弾速度
  SHOT_LEVEL_MAX: 4,            // 最大ショットレベル

  // ---- ベル ----
  BELL_FALL_SPEED:  2.0,        // ベルの落下速度
  BELL_LIFETIME:    360,        // ベルの寿命フレーム数
  BELL_COLORS: ['yellow','blue','red','green','white'],
  BELL_HIT_RADIUS:  16,         // ベルの当たり判定半径
  BELL_SCORE_BONUS: 500,        // 黄色ベル取得時のスコア加算

  // ---- 撃てる雲 ----
  SHOOTABLE_CLOUD_SPEED:      0.9,  // 落下速度
  SHOOTABLE_CLOUD_SPAWN_RATE: 200,  // 出現間隔フレーム
  SHOOTABLE_CLOUD_HP:         3,    // 耐久値

  // ---- 敵A（まっすぐ下）----
  ENEMY_A_HP:         1,
  ENEMY_A_SCORE:      100,
  ENEMY_A_SPEED:      2.5,
  ENEMY_A_SPAWN_RATE: 55,

  // ---- 敵B（左右に揺れる）----
  ENEMY_B_HP:         2,
  ENEMY_B_SCORE:      150,
  ENEMY_B_SPEED:      1.8,
  ENEMY_B_SPAWN_RATE: 80,

  // ---- 敵C（硬い・弾を撃つ）----
  ENEMY_C_HP:         4,
  ENEMY_C_SCORE:      300,
  ENEMY_C_SPEED:      1.2,
  ENEMY_C_SPAWN_RATE: 140,
  ENEMY_C_FIRE_RATE:  100,      // 発射間隔フレーム

  // ---- ボス ----
  BOSS_HP:                200,
  BOSS_SCORE:             5000,
  BOSS_SCORE_THRESHOLD:   8000, // このスコアでボス出現
  BOSS_SPEED:             1.5,

  // ---- スコア ----
  STAGE_CLEAR_BONUS:  3000,
  COMBO_MULTIPLIER_MAX: 8,      // コンボ倍率の上限

  // ---- 難易度上昇 ----
  DIFFICULTY_INTERVAL: 1800,    // 何フレームごとに上がるか
  DIFFICULTY_MAX:      5,

  // ---- 演出 ----
  SCREEN_SHAKE_DURATION:  15,
  SCREEN_SHAKE_INTENSITY:  5,

  // ---- 開発用フラグ ----
  DEBUG_MODE: false,            // trueにすると当たり判定・デバッグ情報が表示される
  GOD_MODE:   false,            // trueにするとプレイヤーが無敵になる（開発用）
};

// =============================================================================
// サウンドマネージャー — assets/sounds/ にファイルを置けば自動で鳴る
// =============================================================================
const Sound = {
  sounds: {},
  muted: false,

  init() {
    // 以下のコメントを外してファイルを用意すれば音が出る
    // this.load('shot',        'assets/sounds/shot.wav');
    // this.load('hit',         'assets/sounds/hit.wav');
    // this.load('explosion',   'assets/sounds/explosion.wav');
    // this.load('bell-change', 'assets/sounds/bell-change.wav');
    // this.load('bell-get',    'assets/sounds/bell-get.wav');
    // this.load('power-up',    'assets/sounds/power-up.wav');
    // this.load('game-over',   'assets/sounds/game-over.wav');
    // this.load('stage-clear', 'assets/sounds/stage-clear.wav');
    // this.load('boss-appear', 'assets/sounds/boss-appear.wav');
  },

  load(name, src) {
    try {
      const a = new Audio(src);
      a.load();
      this.sounds[name] = a;
    } catch(_) { /* ファイルがなくてもエラーにしない */ }
  },

  play(name, volume = 1.0) {
    if (this.muted || !this.sounds[name]) return;
    try {
      const s = this.sounds[name].cloneNode();
      s.volume = Math.min(1, volume);
      s.play().catch(() => {});
    } catch(_) {}
  },
};

// =============================================================================
// 入力ハンドラ
// =============================================================================
const Input = {
  keys:     {},
  prevKeys: {},

  init() {
    const prevent = new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (prevent.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  },

  isDown(code)    { return !!this.keys[code]; },
  isPressed(code) { return !!this.keys[code] && !this.prevKeys[code]; },

  update() {
    this.prevKeys = Object.assign({}, this.keys);
  },
};

// =============================================================================
// ユーティリティ
// =============================================================================
const Utils = {
  rand:    (min, max) => Math.random() * (max - min) + min,
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  clamp:   (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  dist: (a, b) => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  circleHit: (a, ra, b, rb) => Utils.dist(a, b) < ra + rb,
};

// =============================================================================
// パーティクル
// =============================================================================
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.dead = false;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.07;
    this.vx *= 0.97;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() { this.list = []; }

  spawn(x, y, count, colors, speedRange = [2,6], lifeRange = [20,40], sizeRange = [2,6]) {
    for (let i = 0; i < count; i++) {
      const angle = Utils.rand(0, Math.PI * 2);
      const spd   = Utils.rand(speedRange[0], speedRange[1]);
      const color = colors[Utils.randInt(0, colors.length - 1)];
      const life  = Utils.randInt(lifeRange[0], lifeRange[1]);
      const size  = Utils.rand(sizeRange[0], sizeRange[1]);
      this.list.push(new Particle(x, y, Math.cos(angle)*spd, Math.sin(angle)*spd, color, life, size));
    }
  }

  explosion(x, y, colors = ['#ff4','#f80','#f44','#fff']) {
    this.spawn(x, y, 22, colors,           [2, 9],  [25, 50], [2, 6]);
    this.spawn(x, y, 10, ['#fff','#ffee88'],[4, 14], [10, 22], [1, 3]);
  }

  bellPickup(x, y, fillColor) {
    this.spawn(x, y, 16, [fillColor, '#fff', '#ffff88'], [2, 6], [30, 55], [3, 7]);
    // 放射状に飛ぶ白い粒
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.list.push(new Particle(x, y, Math.cos(a)*5, Math.sin(a)*5, '#ffffff', 35, 3));
    }
  }

  update() {
    this.list = this.list.filter(p => { p.update(); return !p.dead; });
  }
  draw(ctx) { this.list.forEach(p => p.draw(ctx)); }
}

// =============================================================================
// 画面シェイク
// =============================================================================
class ScreenShake {
  constructor() { this.dur = 0; this.intensity = 0; this.x = 0; this.y = 0; }

  trigger(dur = CONFIG.SCREEN_SHAKE_DURATION, intensity = CONFIG.SCREEN_SHAKE_INTENSITY) {
    this.dur       = dur;
    this.intensity = intensity;
  }

  update() {
    if (this.dur > 0) {
      this.x = Utils.rand(-this.intensity, this.intensity);
      this.y = Utils.rand(-this.intensity, this.intensity);
      this.dur--;
      this.intensity *= 0.88;
    } else {
      this.x = 0; this.y = 0;
    }
  }
}

// =============================================================================
// 背景（パララックス）
// =============================================================================
class Background {
  constructor() {
    this.stars    = [];
    this.bgClouds = [];
    this._init();
  }

  _init() {
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Utils.rand(0, CONFIG.WIDTH),
        y: Utils.rand(0, CONFIG.HEIGHT),
        size:  Utils.rand(0.8, 2.8),
        speed: Utils.rand(0.15, 0.7),
        phase: Utils.rand(0, Math.PI * 2),
      });
    }
    for (let i = 0; i < 14; i++) {
      this.bgClouds.push({
        x:     Utils.rand(0, CONFIG.WIDTH),
        y:     Utils.rand(0, CONFIG.HEIGHT),
        size:  Utils.rand(28, 75),
        speed: Utils.rand(0.25, 0.65),
        alpha: Utils.rand(0.07, 0.22),
      });
    }
  }

  update() {
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > CONFIG.HEIGHT) { s.y = -4; s.x = Utils.rand(0, CONFIG.WIDTH); }
    });
    this.bgClouds.forEach(c => {
      c.y += c.speed;
      if (c.y > CONFIG.HEIGHT + 90) { c.y = -90; c.x = Utils.rand(0, CONFIG.WIDTH); }
    });
  }

  draw(ctx) {
    // グラデーション空
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    g.addColorStop(0,   '#12063a');
    g.addColorStop(0.4, '#0e1c72');
    g.addColorStop(0.75,'#1a3d9e');
    g.addColorStop(1,   '#2555b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // 星
    const t = Date.now() * 0.0008;
    this.stars.forEach(s => {
      const a = 0.5 + 0.5 * Math.sin(t + s.phase);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 装飾雲
    this.bgClouds.forEach(c => {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = '#90c8ff';
      this._cloud(ctx, c.x, c.y, c.size);
      ctx.restore();
    });
  }

  _cloud(ctx, x, y, sz) {
    const r = sz * 0.5;
    ctx.beginPath();
    ctx.arc(x,              y,          r,       0, Math.PI * 2);
    ctx.arc(x + r * 0.85,  y - r * 0.1, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x - r * 0.8,   y - r * 0.1, r * 0.7,  0, Math.PI * 2);
    ctx.arc(x + r * 0.35,  y + r * 0.4, r * 0.65, 0, Math.PI * 2);
    ctx.arc(x - r * 0.35,  y + r * 0.4, r * 0.6,  0, Math.PI * 2);
    ctx.fill();
  }
}

// =============================================================================
// 撃てる雲（ベル生成元）
// =============================================================================
class ShootableCloud {
  constructor(x, y) {
    this.x     = x;
    this.y     = y;
    this.hp    = CONFIG.SHOOTABLE_CLOUD_HP;
    this.speed = CONFIG.SHOOTABLE_CLOUD_SPEED;
    this.dead  = false;
    this.w     = Utils.rand(56, 96);
    this.flash = 0;
  }

  update() {
    this.y += this.speed;
    if (this.flash > 0) this.flash--;
    if (this.y > CONFIG.HEIGHT + 80) this.dead = true;
  }

  hit() {
    this.hp--;
    this.flash = 6;
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  draw(ctx) {
    const ratio = this.hp / CONFIG.SHOOTABLE_CLOUD_HP;
    ctx.save();
    if (this.flash > 0) ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(this.flash * 4));

    // HP で色変化（青→黄色→オレンジ）
    const r = Math.floor(200 + 55 * (1 - ratio));
    const g = Math.floor(210 * ratio + 180 * (1 - ratio));
    ctx.fillStyle = `rgb(${r},${g},255)`;
    this._draw(ctx, 0, 0, 1);

    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    this._draw(ctx, -4, -4, 0.78);
    ctx.restore();
  }

  _draw(ctx, dx, dy, sc) {
    const r = this.w * 0.5 * sc;
    const x = this.x + dx, y = this.y + dy;
    ctx.beginPath();
    ctx.arc(x,             y,          r,       0, Math.PI * 2);
    ctx.arc(x + r * 0.82,  y - r * 0.1, r * 0.72, 0, Math.PI * 2);
    ctx.arc(x - r * 0.78,  y - r * 0.12, r * 0.68, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3,   y + r * 0.42, r * 0.62, 0, Math.PI * 2);
    ctx.arc(x - r * 0.3,   y + r * 0.42, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }

  get hitRadius() { return this.w * 0.38; }
}

// =============================================================================
// ベル
// =============================================================================
const BELL_INFO = {
  yellow: { fill: '#FFD700', stroke: '#FF8C00', effect: 'SCORE',   label: '+500' },
  blue:   { fill: '#00CCFF', stroke: '#0055CC', effect: 'SPEED',   label: 'SPD↑' },
  red:    { fill: '#FF4455', stroke: '#CC0011', effect: 'SHOT',    label: 'POW↑' },
  green:  { fill: '#44FF66', stroke: '#009922', effect: 'OPTION',  label: 'OPTN' },
  white:  { fill: '#FFFFFF', stroke: '#AABBCC', effect: 'BARRIER', label: 'BRR×3' },
};

class Bell {
  constructor(x, y) {
    this.x    = x;
    this.y    = y;
    this.vx   = Utils.rand(-0.6, 0.6);
    this.vy   = CONFIG.BELL_FALL_SPEED;
    this.life = CONFIG.BELL_LIFETIME;
    this.maxLife = CONFIG.BELL_LIFETIME;
    this.colorIdx = 0; // yellow スタート
    this.dead  = false;
    this.angle = 0;
    this.bobPh = Utils.rand(0, Math.PI * 2);
  }

  get colorName() { return CONFIG.BELL_COLORS[this.colorIdx]; }
  get info()      { return BELL_INFO[this.colorName]; }

  changeColor() {
    this.colorIdx = (this.colorIdx + 1) % CONFIG.BELL_COLORS.length;
    Sound.play('bell-change', 0.5);
  }

  update() {
    this.y += this.vy + Math.sin(this.bobPh + this.life * 0.04) * 0.35;
    this.x += this.vx;
    this.x  = Utils.clamp(this.x, 20, CONFIG.WIDTH - 20);
    this.angle += 0.05;
    this.life--;
    if (this.life <= 0 || this.y > CONFIG.HEIGHT + 40) this.dead = true;
  }

  draw(ctx) {
    const alpha = this.life < 60 ? this.life / 60 : 1;
    const info  = this.info;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.angle) * 0.22);

    const R = 14;

    // 外側の光彩
    const glow = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 2.2);
    glow.addColorStop(0, info.fill + 'aa');
    glow.addColorStop(1, info.fill + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // ベル本体
    ctx.fillStyle = info.fill;
    ctx.strokeStyle = info.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(R * 0.15, -R * 0.5);
    ctx.quadraticCurveTo( R,       -R * 0.5,  R,      R * 0.3);
    ctx.quadraticCurveTo( R,        R,         0,      R);
    ctx.quadraticCurveTo(-R,        R,        -R,      R * 0.3);
    ctx.quadraticCurveTo(-R,       -R * 0.5, -R * 0.15, -R * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.2, -R * 0.18, R * 0.28, R * 0.42, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // クラッパー（舌）
    ctx.fillStyle = info.stroke;
    ctx.beginPath();
    ctx.arc(0, R * 0.82, 3, 0, Math.PI * 2);
    ctx.fill();

    // 色ラベル
    ctx.fillStyle = info.stroke;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(info.label, 0, R + 14);

    ctx.restore();
  }

  get hitRadius() { return CONFIG.BELL_HIT_RADIUS; }
}

// =============================================================================
// 弾（プレイヤー弾 / 敵弾 共用）
// =============================================================================
class Bullet {
  constructor(x, y, vx, vy, { color = '#fff', size = 5, damage = 1, isEnemy = false } = {}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color   = color;
    this.size    = size;
    this.damage  = damage;
    this.isEnemy = isEnemy;
    this.dead    = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -30 || this.x > CONFIG.WIDTH + 30 ||
        this.y < -30 || this.y > CONFIG.HEIGHT + 30) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    if (this.isEnemy) {
      // 敵弾：ぷっくりした球体
      const g = ctx.createRadialGradient(
        this.x - this.size * 0.35, this.y - this.size * 0.35, 1,
        this.x, this.y, this.size
      );
      g.addColorStop(0,   '#ffffff');
      g.addColorStop(0.45, this.color);
      g.addColorStop(1,    this.color + '88');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // プレイヤー弾：縦長の光る楕円
      ctx.shadowBlur  = 10;
      ctx.shadowColor = this.color;
      const g = ctx.createLinearGradient(this.x, this.y - this.size * 2.5, this.x, this.y + this.size * 2.5);
      g.addColorStop(0,   this.color + '00');
      g.addColorStop(0.3, '#ffffff');
      g.addColorStop(0.55, this.color);
      g.addColorStop(1,   this.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size * 0.45, this.size * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  get hitRadius() { return this.size; }
}

// =============================================================================
// プレイヤー
// =============================================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.shotLevel  = 1;    // ショットレベル 1〜4
    this.hasOption  = false; // 緑ベル：サイドオプション
    this.hasBarrier = false; // 白ベル：バリア
    this.barrierHP  = 0;
    this.speedBoost = 0;     // 青ベル：速度ブーストの残りフレーム
    this.fireTimer  = 0;
    this.invincible = 0;
    this.dead       = false;
    this.barrierAngle = 0;
    this.thrustAnim   = 0;   // エンジン炎アニメ用
  }

  get speed()     { return this.speedBoost > 0 ? CONFIG.PLAYER_SPEED_BOOST : CONFIG.PLAYER_SPEED_NORMAL; }
  get hitRadius() { return CONFIG.PLAYER_HIT_RADIUS; }

  update(keys) {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp']    || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown']  || keys['KeyS']) dy += 1;

    // 斜め移動を正規化
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    this.x = Utils.clamp(this.x + dx * this.speed, 20, CONFIG.WIDTH  - 20);
    this.y = Utils.clamp(this.y + dy * this.speed, 20, CONFIG.HEIGHT - 20);

    if (this.fireTimer  > 0) this.fireTimer--;
    if (this.invincible > 0) this.invincible--;
    if (this.speedBoost > 0) this.speedBoost--;
    this.barrierAngle += 0.045;
    this.thrustAnim   += 0.25;
  }

  canShoot() { return this.fireTimer <= 0; }

  shoot() {
    if (!this.canShoot()) return [];
    this.fireTimer = CONFIG.PLAYER_FIRE_RATE;
    Sound.play('shot', 0.35);

    const bullets = [];
    const bx  = this.x;
    const by  = this.y - 20;
    const spd = CONFIG.BULLET_SPEED;

    if (this.shotLevel === 1) {
      bullets.push(new Bullet(bx, by, 0, -spd, { color: '#88ffff', size: 5 }));
    } else if (this.shotLevel === 2) {
      bullets.push(new Bullet(bx - 6, by, 0, -spd, { color: '#88ffff', size: 5 }));
      bullets.push(new Bullet(bx + 6, by, 0, -spd, { color: '#88ffff', size: 5 }));
    } else if (this.shotLevel === 3) {
      bullets.push(new Bullet(bx,      by,     0,   -spd,          { color: '#ffff55', size: 6 }));
      bullets.push(new Bullet(bx - 15, by + 6, -1,  -spd,          { color: '#ffff55', size: 5 }));
      bullets.push(new Bullet(bx + 15, by + 6,  1,  -spd,          { color: '#ffff55', size: 5 }));
    } else {
      bullets.push(new Bullet(bx,      by,     0,    -spd,          { color: '#ff88ff', size: 6 }));
      bullets.push(new Bullet(bx - 11, by + 5, -1.6, -spd * 0.95,  { color: '#ff88ff', size: 5 }));
      bullets.push(new Bullet(bx + 11, by + 5,  1.6, -spd * 0.95,  { color: '#ff88ff', size: 5 }));
      bullets.push(new Bullet(bx - 22, by + 10,-3.2, -spd * 0.85,  { color: '#ff88ff', size: 4 }));
      bullets.push(new Bullet(bx + 22, by + 10, 3.2, -spd * 0.85,  { color: '#ff88ff', size: 4 }));
    }

    // オプション弾（緑ベル取得時）
    if (this.hasOption) {
      bullets.push(new Bullet(bx - 32, by + 12, -2.5, -spd * 0.88, { color: '#44ff88', size: 5 }));
      bullets.push(new Bullet(bx + 32, by + 12,  2.5, -spd * 0.88, { color: '#44ff88', size: 5 }));
    }

    return bullets;
  }

  // trueを返したら実ダメージ、falseはバリア吸収 or 無敵中
  takeDamage() {
    if (this.invincible > 0 || CONFIG.GOD_MODE) return false;
    if (this.hasBarrier && this.barrierHP > 0) {
      this.barrierHP--;
      if (this.barrierHP <= 0) this.hasBarrier = false;
      this.invincible = 30;
      return false;
    }
    this.invincible = CONFIG.PLAYER_INVINCIBLE_TIME;
    return true;
  }

  applyBell(effect) {
    switch (effect) {
      case 'SCORE':   /* スコア加算はGame側で行う */ break;
      case 'SPEED':   this.speedBoost = 600; break;        // 10秒
      case 'SHOT':    this.shotLevel  = Math.min(this.shotLevel + 1, CONFIG.SHOT_LEVEL_MAX); break;
      case 'OPTION':  this.hasOption  = true; break;
      case 'BARRIER': this.hasBarrier = true; this.barrierHP = 3; break;
    }
  }

  draw(ctx) {
    // 無敵フラッシュ（4フレームごとに交互）
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // バリアリング
    if (this.hasBarrier) {
      ctx.save();
      ctx.rotate(this.barrierAngle);
      const a = 0.45 + 0.3 * Math.sin(this.barrierAngle * 3);
      ctx.strokeStyle = `rgba(180,255,255,${a})`;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#88ffff';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < this.barrierHP; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.fillStyle = '#aaffff';
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 30, Math.sin(angle) * 30, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // スピードブーストオーラ
    if (this.speedBoost > 0) {
      const a = 0.3 + 0.2 * Math.sin(this.thrustAnim * 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#00ffff';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 5); ctx.lineTo(16, 14); ctx.lineTo(8, 10); ctx.lineTo(7, 18);
      ctx.lineTo(-7, 18); ctx.lineTo(-8, 10); ctx.lineTo(-16, 14); ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // エンジン炎（揺れ）
    const flameH = 10 + Math.abs(Math.sin(this.thrustAnim)) * 7;
    ctx.fillStyle = '#ff8800';
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#ff4400';
    ctx.beginPath();
    ctx.moveTo(-6, 14); ctx.lineTo(0, 14 + flameH); ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffff55';
    ctx.beginPath();
    ctx.moveTo(-3, 14); ctx.lineTo(0, 14 + flameH * 0.55); ctx.lineTo(3, 14);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 機体本体
    const bodyGrad = ctx.createLinearGradient(-16, -18, 14, 18);
    bodyGrad.addColorStop(0,   '#aaf0ff');
    bodyGrad.addColorStop(0.5, '#2288ff');
    bodyGrad.addColorStop(1,   '#0033bb');
    ctx.fillStyle   = bodyGrad;
    ctx.strokeStyle = '#66ccff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 5); ctx.lineTo(16, 14); ctx.lineTo(8, 10); ctx.lineTo(7, 18);
    ctx.lineTo(-7, 18); ctx.lineTo(-8, 10); ctx.lineTo(-16, 14); ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // コックピット（グラデーション楕円）
    const cpGrad = ctx.createRadialGradient(-3, -9, 2, 0, -6, 9);
    cpGrad.addColorStop(0,   '#e8ffff');
    cpGrad.addColorStop(0.5, '#66bbff88');
    cpGrad.addColorStop(1,   '#002299aa');
    ctx.fillStyle = cpGrad;
    ctx.beginPath();
    ctx.ellipse(0, -6, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 翼の装飾ライン
    ctx.strokeStyle = '#55ddff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(-10, 2); ctx.lineTo(-13, 11);
    ctx.moveTo( 10, 2); ctx.lineTo( 13, 11);
    ctx.stroke();

    ctx.restore();

    // デバッグ当たり判定
    if (CONFIG.DEBUG_MODE) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.hitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// =============================================================================
// 敵
// =============================================================================
class Enemy {
  constructor(x, y, type) {
    this.x     = x;
    this.y     = y;
    this.type  = type;
    this.dead  = false;
    this.flash = 0;
    this.timer = 0;
    this.angle = 0;

    switch (type) {
      case 'A':
        this.hp = this.maxHp = CONFIG.ENEMY_A_HP;
        this.speed = CONFIG.ENEMY_A_SPEED;
        this.score = CONFIG.ENEMY_A_SCORE;
        this.size  = 16;
        break;
      case 'B':
        this.hp = this.maxHp = CONFIG.ENEMY_B_HP;
        this.speed = CONFIG.ENEMY_B_SPEED;
        this.score = CONFIG.ENEMY_B_SCORE;
        this.size  = 18;
        this.startX   = x;
        this.waveAmp  = Utils.rand(28, 55);
        this.waveFreq = Utils.rand(0.022, 0.045);
        break;
      case 'C':
        this.hp = this.maxHp = CONFIG.ENEMY_C_HP;
        this.speed = CONFIG.ENEMY_C_SPEED;
        this.score = CONFIG.ENEMY_C_SCORE;
        this.size  = 22;
        this.fireRate  = CONFIG.ENEMY_C_FIRE_RATE;
        this.fireTimer = Utils.randInt(20, CONFIG.ENEMY_C_FIRE_RATE);
        break;
      case 'BOSS':
        this.hp = this.maxHp = CONFIG.BOSS_HP;
        this.speed = CONFIG.BOSS_SPEED;
        this.score = CONFIG.BOSS_SCORE;
        this.size  = 64;
        this.fireRate  = 40;
        this.fireTimer = 90;
        this.phase     = 1;
        this.targetX   = CONFIG.WIDTH / 2;
        this.moveTimer = 0;
        break;
    }
  }

  get hitRadius() { return this.size * 0.72; }

  update(difficulty) {
    this.timer++;
    this.angle += 0.06;
    if (this.flash > 0) this.flash--;

    const sMult = 1 + (difficulty - 1) * 0.18;

    switch (this.type) {
      case 'A':
        this.y += this.speed * sMult;
        break;
      case 'B':
        this.y += this.speed * sMult;
        this.x  = this.startX + Math.sin(this.timer * this.waveFreq) * this.waveAmp;
        break;
      case 'C':
        this.y += this.speed * sMult * 0.6 + Math.sin(this.timer * 0.025) * 0.4;
        if (this.fireTimer > 0) this.fireTimer--;
        break;
      case 'BOSS':
        this.moveTimer++;
        if (this.moveTimer % 110 === 0)
          this.targetX = Utils.rand(90, CONFIG.WIDTH - 90);
        this.x += (this.targetX - this.x) * 0.022;
        if (this.y < 120) this.y += this.speed;

        if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
          this.phase    = 2;
          this.fireRate = 25;
        }
        if (this.hp < this.maxHp * 0.2 && this.phase === 2) {
          this.phase    = 3;
          this.fireRate = 15;
        }
        if (this.fireTimer > 0) this.fireTimer--;
        break;
    }

    if (this.y > CONFIG.HEIGHT + this.size + 30) this.dead = true;
  }

  hit(dmg = 1) {
    this.hp  -= dmg;
    this.flash = 5;
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  canFire() { return (this.type === 'C' || this.type === 'BOSS') && this.fireTimer <= 0; }

  resetFireTimer(difficulty = 1) {
    const r = Math.max(30, this.fireRate - (difficulty - 1) * 8);
    this.fireTimer = r;
  }

  getFireBullets(px, py) {
    const bullets = [];
    const dx = px - this.x;
    const dy = py - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = this.type === 'BOSS' ? 3.5 : 2.5;
    const nx = dx / len * spd;
    const ny = dy / len * spd;

    if (this.type === 'C') {
      bullets.push(new Bullet(this.x, this.y, nx, ny,
        { color: '#ff44ff', size: 6, isEnemy: true }));
    } else if (this.type === 'BOSS') {
      const base = Math.atan2(dy, dx);
      let count, spread, color;
      if (this.phase === 1) { count = 3; spread = 0.28; color = '#ff8800'; }
      else if (this.phase === 2) { count = 5; spread = 0.22; color = '#ff4444'; }
      else                       { count = 8; spread = 0;    color = '#ff0044'; }

      for (let i = 0; i < count; i++) {
        const angle = this.phase < 3
          ? base + (i - (count - 1) / 2) * spread
          : (i / count) * Math.PI * 2 + this.timer * 0.04;
        bullets.push(new Bullet(this.x, this.y,
          Math.cos(angle) * spd, Math.sin(angle) * spd,
          { color, size: 7, isEnemy: true }
        ));
      }
    }
    return bullets;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flash > 0) ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(this.flash * 5));

    switch (this.type) {
      case 'A':    this._drawA(ctx);    break;
      case 'B':    this._drawB(ctx);    break;
      case 'C':    this._drawC(ctx);    break;
      case 'BOSS': this._drawBoss(ctx); break;
    }

    // HPバー（C とボス）
    if (this.type === 'C' || this.type === 'BOSS') {
      const bw    = this.size * 2;
      const ratio = this.hp / this.maxHp;
      const by    = this.size + 8;
      ctx.fillStyle = '#222';
      ctx.fillRect(-bw / 2, by, bw, 4);
      ctx.fillStyle = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(-bw / 2, by, bw * ratio, 4);
    }

    ctx.restore();

    if (CONFIG.DEBUG_MODE) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.hitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawA(ctx) {
    const s = this.size;
    // 丸いオレンジ系
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s);
    g.addColorStop(0, '#ffaa88'); g.addColorStop(0.6, '#ff6644'); g.addColorStop(1, '#cc2200');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();

    // 目
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s*0.3, -s*0.2, s*0.25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( s*0.3, -s*0.2, s*0.25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-s*0.26, -s*0.22, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( s*0.26, -s*0.22, s*0.12, 0, Math.PI*2); ctx.fill();

    // 口（へ）
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s*0.35, s*0.28);
    ctx.quadraticCurveTo(0, s*0.5, s*0.35, s*0.28);
    ctx.stroke();

    // 角（2本）
    ctx.fillStyle = '#ffdd44';
    [[-0.2, -0.4], [0.2, 0.4]].forEach(([ox, tx]) => {
      ctx.beginPath();
      ctx.moveTo(ox * s, -s); ctx.lineTo(tx * s, -s*1.4); ctx.lineTo(0, -s*1.05);
      ctx.closePath(); ctx.fill();
    });
  }

  _drawB(ctx) {
    const s = this.size;
    ctx.rotate(this.angle * 0.45);

    // 青いひし形
    const g = ctx.createRadialGradient(-s*0.2, -s*0.2, 1, 0, 0, s);
    g.addColorStop(0, '#aaddff'); g.addColorStop(0.5, '#4488ff'); g.addColorStop(1, '#001888');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s*1.25); ctx.lineTo(s*1.05, 0); ctx.lineTo(0, s*0.95); ctx.lineTo(-s*1.05, 0);
    ctx.closePath(); ctx.fill();

    // 内側装飾
    ctx.fillStyle = 'rgba(200,240,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(0, -s*0.65); ctx.lineTo(s*0.5, 0); ctx.lineTo(0, s*0.48); ctx.lineTo(-s*0.5, 0);
    ctx.closePath(); ctx.fill();

    // 目
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -s*0.08, s*0.28, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0044ff';
    ctx.beginPath(); ctx.arc(0, -s*0.08, s*0.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, -s*0.08, s*0.09, 0, Math.PI*2); ctx.fill();
  }

  _drawC(ctx) {
    const s = this.size;

    // 六角形・紫
    const g = ctx.createRadialGradient(-s*0.2, -s*0.3, 1, 0, 0, s);
    g.addColorStop(0, '#dd88ff'); g.addColorStop(0.5, '#aa44ff'); g.addColorStop(1, '#440077');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s) : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 2; ctx.stroke();

    // 内側六角
    ctx.fillStyle = 'rgba(255,100,255,0.18)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(Math.cos(a)*s*0.58, Math.sin(a)*s*0.58) : ctx.lineTo(Math.cos(a)*s*0.58, Math.sin(a)*s*0.58);
    }
    ctx.closePath(); ctx.fill();

    // 目 x2
    [-s*0.25, s*0.25].forEach(ex => {
      ctx.fillStyle = '#ffddff';
      ctx.beginPath(); ctx.arc(ex, -s*0.1, s*0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#cc00ff';
      ctx.beginPath(); ctx.arc(ex, -s*0.1, s*0.11, 0, Math.PI*2); ctx.fill();
    });

    // 発射口
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff';
    ctx.beginPath(); ctx.arc(0, s*0.42, s*0.14, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawBoss(ctx) {
    const s = this.size;
    const t = this.timer;

    const g = ctx.createRadialGradient(-s*0.2, -s*0.3, s*0.1, 0, 0, s);
    g.addColorStop(0, '#ff88cc'); g.addColorStop(0.5, '#cc2288'); g.addColorStop(1, '#55003a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.phase >= 3 ? '#ff0055' : '#ff44aa';
    ctx.lineWidth = 3;
    if (this.phase >= 3) { ctx.shadowBlur = 22; ctx.shadowColor = '#ff0044'; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // サブリング（フェーズ2以降）
    if (this.phase >= 2) {
      ctx.strokeStyle = 'rgba(255,136,0,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, s*0.82, s*0.62, 0, 0, Math.PI*2);
      ctx.stroke();
    }

    // 大きな目
    [-s*0.34, s*0.34].forEach(ex => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, -s*0.14, s*0.21, s*0.27, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff00aa';
      ctx.beginPath(); ctx.ellipse(ex, -s*0.14, s*0.14, s*0.19, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#220011';
      ctx.beginPath(); ctx.arc(ex, -s*0.14, s*0.1, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(ex - s*0.06, -s*0.21, s*0.055, s*0.075, -0.3, 0, Math.PI*2); ctx.fill();
    });

    // 口
    ctx.strokeStyle = '#ff44aa'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-s*0.38, s*0.26);
    ctx.quadraticCurveTo(0, s*0.5, s*0.38, s*0.26);
    ctx.stroke();

    // 歯
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = '#ffddee';
      ctx.fillRect(i * s * 0.12 - s * 0.055, s * 0.28, s * 0.1, s * 0.12);
    }

    // アンテナ
    [[-s*0.3, -s*0.5], [s*0.3, s*0.5]].forEach(([ax, bx], idx) => {
      const tip = { x: bx, y: -s*1.2 + Math.sin(t*0.1 + idx)*5 };
      ctx.strokeStyle = '#ff88cc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, -s*0.75); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = '#ffddaa';
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 6, 0, Math.PI*2); ctx.fill();
    });

    // HP バーは外側の draw() で描画済み
  }
}

// =============================================================================
// ゲーム本体
// =============================================================================
const STATE = { TITLE: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3, STAGE_CLEAR: 4 };

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this.state     = STATE.TITLE;
    this.score     = 0;
    this.hiScore   = parseInt(localStorage.getItem('popBellSTG_hi') || '0');
    this.lives     = CONFIG.INITIAL_LIVES;
    this.stage     = 1;
    this.frameCount = 0;
    this.difficulty = 1;
    this.bossSpawned = false;

    this.player       = null;
    this.playerBullets = [];
    this.enemyBullets  = [];
    this.enemies       = [];
    this.bells         = [];
    this.shootClouds   = [];

    this.bg        = new Background();
    this.particles = new ParticleSystem();
    this.shake     = new ScreenShake();

    this.comboCount = 0;
    this.comboTimer = 0;
    this.titleFrame = 0;
    this.clearTimer = 0;
    this.overTimer  = 0;

    this._spawnT = { A: 0, B: 0, C: 0, cloud: 0 };
  }

  // -----------------------------------------------------------------------
  // ゲームリセット・スタート
  // -----------------------------------------------------------------------
  start() {
    this.state       = STATE.PLAYING;
    this.score       = 0;
    this.lives       = CONFIG.INITIAL_LIVES;
    this.stage       = 1;
    this.frameCount  = 0;
    this.difficulty  = 1;
    this.bossSpawned = false;
    this.comboCount  = 0;
    this.comboTimer  = 0;
    this._spawnT     = { A: 0, B: 0, C: 0, cloud: 0 };

    this.player        = new Player(CONFIG.PLAYER_START_X || CONFIG.WIDTH / 2, CONFIG.PLAYER_START_Y || 520);
    this.playerBullets = [];
    this.enemyBullets  = [];
    this.enemies       = [];
    this.bells         = [];
    this.shootClouds   = [];
    this.particles     = new ParticleSystem();
  }

  // -----------------------------------------------------------------------
  // メインアップデート
  // -----------------------------------------------------------------------
  update() {
    Input.update();
    this.shake.update();

    switch (this.state) {
      case STATE.TITLE:
        this.bg.update();
        this.titleFrame++;
        if (Input.isPressed('Enter') || Input.isPressed('Space')) this.start();
        break;

      case STATE.PLAYING:
        this._updatePlaying();
        break;

      case STATE.PAUSED:
        if (Input.isPressed('KeyP') || Input.isPressed('Escape')) this.state = STATE.PLAYING;
        break;

      case STATE.GAME_OVER:
        this.bg.update();
        this.overTimer++;
        if (this.overTimer > 60 && (Input.isPressed('Enter') || Input.isPressed('Space')))
          this.state = STATE.TITLE;
        break;

      case STATE.STAGE_CLEAR:
        this.bg.update();
        this.particles.update();
        this.clearTimer++;
        if (this.clearTimer > 200) this.state = STATE.TITLE;
        break;
    }
  }

  _updatePlaying() {
    this.frameCount++;

    // ポーズ
    if (Input.isPressed('KeyP') || Input.isPressed('Escape')) {
      this.state = STATE.PAUSED;
      return;
    }

    // 難易度上昇
    if (this.frameCount % CONFIG.DIFFICULTY_INTERVAL === 0)
      this.difficulty = Math.min(this.difficulty + 1, CONFIG.DIFFICULTY_MAX);

    // プレイヤー更新
    this.player.update(Input.keys);

    // ショット
    if ((Input.isDown('Space') || Input.isDown('KeyZ')) && this.player.canShoot()) {
      this.playerBullets.push(...this.player.shoot());
    }

    // コンボタイマー
    if (this.comboTimer > 0) this.comboTimer--;
    else this.comboCount = 0;

    // 敵・雲スポーン
    this._spawnEnemies();
    this._spawnClouds();

    // ボスチェック
    if (!this.bossSpawned && this.score >= CONFIG.BOSS_SCORE_THRESHOLD) this._spawnBoss();

    // 各オブジェクト更新
    this.playerBullets.forEach(b => b.update());
    this.enemyBullets.forEach(b => b.update());
    this.enemies.forEach(e => {
      e.update(this.difficulty);
      if (e.canFire()) {
        e.resetFireTimer(this.difficulty);
        this.enemyBullets.push(...e.getFireBullets(this.player.x, this.player.y));
      }
    });
    this.bells.forEach(b => b.update());
    this.shootClouds.forEach(c => c.update());
    this.particles.update();

    // 当たり判定
    this._checkCollisions();

    // 死んだオブジェクトを除去
    this._cleanup();

    // ゲームオーバー判定
    if (this.lives <= 0) this._gameOver();
  }

  _spawnEnemies() {
    if (this.bossSpawned) return;
    const dm = 1 + (this.difficulty - 1) * 0.22;

    this._spawnT.A++;
    if (this._spawnT.A >= Math.max(18, Math.floor(CONFIG.ENEMY_A_SPAWN_RATE / dm))) {
      this._spawnT.A = 0;
      this.enemies.push(new Enemy(Utils.rand(20, CONFIG.WIDTH - 20), -30, 'A'));
    }
    this._spawnT.B++;
    if (this._spawnT.B >= Math.max(38, Math.floor(CONFIG.ENEMY_B_SPAWN_RATE / dm))) {
      this._spawnT.B = 0;
      this.enemies.push(new Enemy(Utils.rand(40, CONFIG.WIDTH - 40), -38, 'B'));
    }
    this._spawnT.C++;
    if (this._spawnT.C >= Math.max(70, Math.floor(CONFIG.ENEMY_C_SPAWN_RATE / dm))) {
      this._spawnT.C = 0;
      this.enemies.push(new Enemy(Utils.rand(40, CONFIG.WIDTH - 40), -50, 'C'));
    }
  }

  _spawnClouds() {
    if (this.bossSpawned) return;
    this._spawnT.cloud++;
    const rate = Math.max(90, CONFIG.SHOOTABLE_CLOUD_SPAWN_RATE - (this.difficulty - 1) * 22);
    if (this._spawnT.cloud >= rate) {
      this._spawnT.cloud = 0;
      this.shootClouds.push(new ShootableCloud(Utils.rand(55, CONFIG.WIDTH - 55), -65));
    }
  }

  _spawnBoss() {
    this.bossSpawned = true;
    this.enemies = [];
    this.enemies.push(new Enemy(CONFIG.WIDTH / 2, -90, 'BOSS'));
    Sound.play('boss-appear');
    this.shake.trigger(35, 12);
  }

  // -----------------------------------------------------------------------
  // 当たり判定
  // -----------------------------------------------------------------------
  _checkCollisions() {
    const p = this.player;

    // プレイヤー弾 vs 敵
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      if (b.dead) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (e.dead) continue;
        if (Utils.circleHit(b, b.hitRadius, e, e.hitRadius)) {
          b.dead = true;
          const killed = e.hit();
          Sound.play('hit', 0.3);
          if (killed) {
            this._onEnemyKilled(e);
          } else {
            // 小さな火花
            this.particles.spawn(b.x, b.y, 5, ['#fff','#ffdd44'], [2,5], [10,20], [1,3]);
          }
          break;
        }
      }

      // プレイヤー弾 vs 撃てる雲
      if (b.dead) continue;
      for (let j = this.shootClouds.length - 1; j >= 0; j--) {
        const c = this.shootClouds[j];
        if (c.dead) continue;
        if (Utils.circleHit(b, b.hitRadius, c, c.hitRadius)) {
          b.dead = true;
          if (c.hit()) {
            this.bells.push(new Bell(c.x, c.y));
            this.particles.spawn(c.x, c.y, 12, ['#fff','#aaddff'], [2,5], [18,32], [2,5]);
          }
          break;
        }
      }

      // プレイヤー弾 vs ベル（色変更）
      if (b.dead) continue;
      for (let j = this.bells.length - 1; j >= 0; j--) {
        const bell = this.bells[j];
        if (bell.dead) continue;
        if (Utils.circleHit(b, b.hitRadius, bell, bell.hitRadius)) {
          b.dead = true;
          bell.changeColor();
          this.particles.spawn(bell.x, bell.y, 4, [BELL_INFO[bell.colorName].fill, '#fff'], [2,4], [10,20], [2,4]);
          break;
        }
      }
    }

    // 敵弾 vs プレイヤー
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if (b.dead) continue;
      if (Utils.circleHit(b, b.hitRadius, p, p.hitRadius)) {
        b.dead = true;
        if (p.takeDamage()) {
          this.lives--;
          this.comboCount = 0;
          this.shake.trigger();
          this.particles.explosion(p.x, p.y, ['#aaddff','#fff','#88ccff','#4488ff']);
          Sound.play('hit');
        }
      }
    }

    // 敵 vs プレイヤー（体当たり）
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      if (e.dead) continue;
      if (Utils.circleHit(e, e.hitRadius * 0.85, p, p.hitRadius)) {
        if (p.takeDamage()) {
          this.lives--;
          this.comboCount = 0;
          this.shake.trigger();
          this.particles.explosion(p.x, p.y, ['#aaddff','#fff','#88ccff']);
          Sound.play('hit');
        }
        break;
      }
    }

    // ベル vs プレイヤー（取得）
    for (let i = this.bells.length - 1; i >= 0; i--) {
      const bell = this.bells[i];
      if (bell.dead) continue;
      if (Utils.circleHit(bell, bell.hitRadius, p, p.hitRadius + 12)) {
        bell.dead = true;
        this._onBellCollect(bell);
      }
    }
  }

  _onEnemyKilled(enemy) {
    this.comboCount++;
    this.comboTimer = 130;
    const mult = Math.min(this.comboCount, CONFIG.COMBO_MULTIPLIER_MAX);
    this.score += enemy.score * mult;

    const cols = enemy.type === 'BOSS'
      ? ['#ff88ff','#ffaacc','#fff','#ffff44','#ff8800','#88ffff']
      : ['#ff6644','#ffaa44','#fff','#ffdd44'];
    this.particles.explosion(enemy.x, enemy.y, cols);

    if (enemy.type === 'BOSS') {
      this.shake.trigger(50, 18);
      Sound.play('explosion');
      this._stageClear();
    } else {
      if (enemy.type === 'C') this.shake.trigger(10, 4);
      Sound.play('explosion', 0.5);
    }
  }

  _onBellCollect(bell) {
    Sound.play('bell-get');
    Sound.play('power-up');
    if (bell.info.effect === 'SCORE') {
      this.score += CONFIG.BELL_SCORE_BONUS;
    } else {
      this.player.applyBell(bell.info.effect);
    }
    this.particles.bellPickup(bell.x, bell.y, bell.info.fill);
    this.shake.trigger(5, 2);
  }

  _stageClear() {
    this.score += CONFIG.STAGE_CLEAR_BONUS;
    this._saveHi();
    Sound.play('stage-clear');
    this.clearTimer = 0;
    this.state = STATE.STAGE_CLEAR;

    // 花火
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        this.particles.explosion(
          Utils.rand(50, CONFIG.WIDTH - 50),
          Utils.rand(80, CONFIG.HEIGHT - 80),
          ['#ff0','#f80','#f0f','#0ff','#0f0','#fff']
        );
      }, i * 120);
    }
  }

  _gameOver() {
    this._saveHi();
    Sound.play('game-over');
    this.overTimer = 0;
    this.state = STATE.GAME_OVER;
    this.shake.trigger(35, 10);
  }

  _saveHi() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('popBellSTG_hi', String(this.hiScore));
    }
  }

  _cleanup() {
    this.playerBullets = this.playerBullets.filter(b => !b.dead);
    this.enemyBullets  = this.enemyBullets.filter(b => !b.dead);
    this.enemies       = this.enemies.filter(e => !e.dead);
    this.bells         = this.bells.filter(b => !b.dead);
    this.shootClouds   = this.shootClouds.filter(c => !c.dead);
  }

  // -----------------------------------------------------------------------
  // 描画
  // -----------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.shake.x), Math.round(this.shake.y));

    switch (this.state) {
      case STATE.TITLE:
        this._drawTitle(ctx);
        break;
      case STATE.PLAYING:
        this._drawGame(ctx);
        this._drawHUD(ctx);
        break;
      case STATE.PAUSED:
        this._drawGame(ctx);
        this._drawHUD(ctx);
        this._drawPause(ctx);
        break;
      case STATE.GAME_OVER:
        this.bg.draw(ctx);
        this._drawGameOver(ctx);
        break;
      case STATE.STAGE_CLEAR:
        this.bg.draw(ctx);
        this.particles.draw(ctx);
        this._drawStageClear(ctx);
        break;
    }

    ctx.restore();
  }

  _drawGame(ctx) {
    this.bg.draw(ctx);
    this.shootClouds.forEach(c => c.draw(ctx));
    this.bells.forEach(b => b.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.playerBullets.forEach(b => b.draw(ctx));
    this.enemyBullets.forEach(b => b.draw(ctx));
    this.particles.draw(ctx);
    this.player.draw(ctx);
  }

  _drawHUD(ctx) {
    const W = CONFIG.WIDTH;

    // 上部バー
    ctx.fillStyle = 'rgba(0,0,25,0.72)';
    ctx.fillRect(0, 0, W, 36);

    // スコア（左）
    ctx.fillStyle = '#999'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('SCORE', 10, 13);
    ctx.fillStyle = '#ffff55'; ctx.font = 'bold 17px monospace';
    ctx.fillText(String(this.score).padStart(8, '0'), 10, 30);

    // ハイスコア（中央）
    ctx.fillStyle = '#888'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HI-SCORE', W / 2, 13);
    ctx.fillStyle = '#ff88ff'; ctx.font = 'bold 16px monospace';
    ctx.fillText(String(this.hiScore).padStart(8, '0'), W / 2, 30);

    // 残機（右）
    ctx.textAlign = 'right';
    ctx.fillStyle = '#888'; ctx.font = 'bold 11px monospace';
    ctx.fillText('LIVES', W - 10, 13);
    for (let i = 0; i < this.lives; i++) {
      const lx = W - 14 - i * 18;
      ctx.save();
      ctx.translate(lx, 25); ctx.scale(0.48, 0.48);
      ctx.fillStyle = '#88eeff';
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(8, 4); ctx.lineTo(10, 12);
      ctx.lineTo(-10, 12); ctx.lineTo(-8, 4); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // コンボ表示
    if (this.comboCount >= 2 && this.comboTimer > 0) {
      const alpha = Math.min(1, this.comboTimer / 40);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign  = 'right';
      const sz = Math.min(22, 12 + this.comboCount);
      ctx.font        = `bold ${sz}px monospace`;
      ctx.strokeStyle = '#cc4400'; ctx.lineWidth = 3;
      ctx.fillStyle   = '#ffdd44';
      const txt = `${this.comboCount} COMBO!`;
      ctx.strokeText(txt, W - 10, CONFIG.HEIGHT - 58);
      ctx.fillText(txt,   W - 10, CONFIG.HEIGHT - 58);
      ctx.restore();
    }

    // 下部パワーアップ状態
    const yp = CONFIG.HEIGHT - 28;
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';

    const sl = this.player.shotLevel;
    ctx.fillStyle = sl >= 4 ? '#ff88ff' : sl >= 3 ? '#ffff44' : sl >= 2 ? '#88ffaa' : '#88aaff';
    ctx.fillText(`POW Lv.${sl}`, 10, yp);

    if (this.player.speedBoost > 0) {
      ctx.fillStyle = '#00ccff';
      ctx.fillText(`SPD:${Math.ceil(this.player.speedBoost / 60)}s`, 85, yp);
    }
    if (this.player.hasOption) {
      ctx.fillStyle = '#44ff88'; ctx.fillText('OPT', 155, yp);
    }
    if (this.player.hasBarrier) {
      ctx.fillStyle = '#aaffff'; ctx.fillText(`BRR×${this.player.barrierHP}`, 188, yp);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8899cc'; ctx.font = '10px monospace';
    ctx.fillText(`STAGE ${this.stage}`, W - 10, yp);

    // ボス警告
    if (this.bossSpawned && this.enemies.some(e => e.type === 'BOSS')) {
      if (Math.floor(this.frameCount / 14) % 2 === 0) {
        ctx.save();
        ctx.textAlign  = 'center';
        ctx.font       = 'bold 17px monospace';
        ctx.fillStyle  = '#ff4444';
        ctx.shadowBlur = 12; ctx.shadowColor = '#ff0000';
        ctx.fillText('!! BOSS !!', W / 2, 55);
        ctx.restore();
      }
    }

    // デバッグ情報
    if (CONFIG.DEBUG_MODE) {
      ctx.fillStyle = '#00ff00'; ctx.textAlign = 'left'; ctx.font = '9px monospace';
      ctx.fillText(
        `Diff:${this.difficulty} PB:${this.playerBullets.length} EB:${this.enemyBullets.length} E:${this.enemies.length} B:${this.bells.length}`,
        5, CONFIG.HEIGHT - 5
      );
      if (CONFIG.GOD_MODE) ctx.fillText('GOD MODE', W - 80, CONFIG.HEIGHT - 5);
    }
  }

  _drawTitle(ctx) {
    this.bg.draw(ctx);
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = this.titleFrame;

    // タイトルロゴ
    ctx.save();
    ctx.shadowBlur  = 22;
    ctx.shadowColor = '#ff88ff';
    ctx.textAlign   = 'center';

    const tg = ctx.createLinearGradient(0, H * 0.24, 0, H * 0.38);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.4, '#ffccff');
    tg.addColorStop(0.7, '#ff44ff'); tg.addColorStop(1, '#aa00ff');
    ctx.font = 'bold 50px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = tg;
    ctx.fillText('POP BELL', W / 2, H * 0.31);

    ctx.font = 'bold 26px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = '#ffff44';
    ctx.shadowColor = '#ff8800';
    ctx.fillText('SHOOTER', W / 2, H * 0.42);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font      = '12px monospace';
    ctx.fillStyle = '#99bbee';
    ctx.fillText('— Bell Power-Up Shooting Game —', W / 2, H * 0.49);

    // 点滅スタートガイド
    if (Math.floor(t / 28) % 2 === 0) {
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Press ENTER or SPACE to Start', W / 2, H * 0.64);
    }

    // 操作説明
    ctx.font = '12px monospace'; ctx.fillStyle = '#7799cc';
    ctx.fillText('[ Arrow / WASD ] Move   [ Space / Z ] Shot', W / 2, H * 0.72);
    ctx.fillText('[ P / Esc ] Pause       [ Enter ] Start / Retry', W / 2, H * 0.76);

    // ハイスコア
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ff88ff';
    ctx.fillText(`HI-SCORE: ${String(this.hiScore).padStart(8, '0')}`, W / 2, H * 0.86);

    // 装飾ベル（5色が浮かぶ）
    CONFIG.BELL_COLORS.forEach((col, i) => {
      const info = BELL_INFO[col];
      const bx = W / 6 * (i + 0.5) + Math.sin(t * 0.022 + i * 1.3) * 14;
      const by = H * 0.56 + Math.sin(t * 0.032 + i * 1.1) * 9;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.sin(t * 0.04 + i) * 0.22);
      const R = 10;
      ctx.fillStyle = info.fill; ctx.strokeStyle = info.stroke; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(R*0.15, -R*0.5);
      ctx.quadraticCurveTo(R, -R*0.5, R, R*0.3);
      ctx.quadraticCurveTo(R, R, 0, R);
      ctx.quadraticCurveTo(-R, R, -R, R*0.3);
      ctx.quadraticCurveTo(-R, -R*0.5, -R*0.15, -R*0.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  }

  _drawPause(ctx) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    ctx.fillStyle = 'rgba(0,0,22,0.62)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign  = 'center';
    ctx.font       = 'bold 38px "Arial Black", sans-serif';
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 18; ctx.shadowColor = '#4488ff';
    ctx.fillText('PAUSE', W / 2, H * 0.3);
    ctx.restore();

    ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#aaddff';
    ctx.fillText('Press P or Esc to Resume', W / 2, H * 0.42);

    // ヘルプ
    ctx.font = '12px monospace'; ctx.fillStyle = '#8899cc';
    const help = [
      '--- CONTROLS ---',
      'Arrow / WASD : Move',
      'Space / Z    : Shoot',
      'P / Esc      : Pause / Resume',
      '',
      '--- BELL EFFECTS ---',
      'Yellow : +Score Bonus',
      'Blue   : Speed Up (10s)',
      'Red    : Shot Power Up',
      'Green  : Side Options',
      'White  : Barrier x3',
      '',
      '--- HOW TO GET BELLS ---',
      'Shoot clouds → Bell appears',
      'Shoot bell → Color changes',
      'Touch bell → Get effect!',
    ];
    help.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.52 + i * 16));
  }

  _drawGameOver(ctx) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign  = 'center';
    ctx.font       = 'bold 50px "Arial Black", Impact, sans-serif';
    ctx.fillStyle  = '#ff4444';
    ctx.shadowBlur = 22; ctx.shadowColor = '#ff0000';
    ctx.fillText('GAME OVER', W / 2, H * 0.36);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#ffff55';
    ctx.fillText(`SCORE: ${String(this.score).padStart(8, '0')}`, W / 2, H * 0.5);

    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff88ff';
    ctx.fillText(`HI-SCORE: ${String(this.hiScore).padStart(8, '0')}`, W / 2, H * 0.58);

    if (this.overTimer > 60 && Math.floor(this.overTimer / 28) % 2 === 0) {
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffffff';
      ctx.fillText('Press ENTER or SPACE', W / 2, H * 0.72);
    }
  }

  _drawStageClear(ctx) {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const t = this.clearTimer;

    ctx.save();
    ctx.textAlign  = 'center';
    const scale = Math.min(1, t / 28);
    ctx.translate(W / 2, H * 0.36);
    ctx.scale(scale, scale);
    ctx.font       = 'bold 44px "Arial Black", Impact, sans-serif';
    ctx.fillStyle  = '#ffff44';
    ctx.shadowBlur = 28; ctx.shadowColor = '#ff8800';
    ctx.fillText('STAGE CLEAR!', 0, 0);
    ctx.restore();

    if (t > 40) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px monospace'; ctx.fillStyle = '#ffffff';
      ctx.fillText(`SCORE: ${String(this.score).padStart(8, '0')}`, W / 2, H * 0.5);
      ctx.font = '13px monospace'; ctx.fillStyle = '#88ffaa';
      ctx.fillText(`+${CONFIG.STAGE_CLEAR_BONUS} CLEAR BONUS`, W / 2, H * 0.58);
    }

    if (t > 110 && Math.floor(t / 25) % 2 === 0) {
      ctx.font = '13px monospace'; ctx.fillStyle = '#aaddff';
      ctx.fillText('Returning to Title...', W / 2, H * 0.72);
    }
  }
}

// =============================================================================
// エントリーポイント
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
  Sound.init();
  Input.init();

  const canvas = document.getElementById('gameCanvas');
  canvas.width  = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;

  const game = new Game(canvas);

  function loop() {
    game.update();
    game.render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
