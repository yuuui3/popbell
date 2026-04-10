# POP BELL SHOOTER

ツインビー風の縦スクロールシューティングゲーム。ブラウザだけで動作します。

---

## 起動方法

```bash
# 方法1：ダブルクリック
index.html をブラウザで直接開く

# 方法2：ローカルサーバー（推奨・音声ファイルを追加する場合は必須）
cd popbell-shooter
npx serve .
# → http://localhost:3000 を開く
```

> **注意**: 音声ファイルなしでも完全にプレイできます。

---

## 操作方法

| キー | 動作 |
|:-----|:-----|
| `←→↑↓` / `WASD` | 移動 |
| `Space` / `Z` | ショット |
| `Enter` | タイトル画面でスタート / リトライ |
| `P` / `Esc` | 一時停止 / 再開 |

---

## ゲームシステム

### ベルシステム（ゲームの核）

1. **雲を撃つ**（青みがかった大きな雲）→ ベルが出現
2. **ベルを撃つ** → 色が変化（黄→青→赤→緑→白→黄...）
3. **ベルに触れる** → 現在の色の効果を取得

| ベルの色 | 効果 |
|:---------|:-----|
| 黄色 | スコア +500 |
| 青 | 移動速度アップ（10秒） |
| 赤 | ショットレベルアップ（最大Lv.4） |
| 緑 | サイドオプション追加（斜め弾） |
| 白 | バリア取得（3回防御） |

### ショットレベル

| レベル | 形状 |
|:-------|:-----|
| Lv.1 | 単発（水色） |
| Lv.2 | 2連射 |
| Lv.3 | ワイドショット3方向（黄色） |
| Lv.4 | 5方向拡散（ピンク） |

### 敵の種類

| 種類 | 特徴 |
|:-----|:-----|
| 赤い丸い敵（A） | まっすぐ下に来る / HP1 |
| 青いひし形（B） | 左右に揺れながら下に来る / HP2 |
| 紫い六角形（C） | 遅いが硬い・自機狙い弾を撃つ / HP4 |
| ボス（ピンク） | スコア8000で出現 / HP200 / フェーズ3段階 |

### コンボシステム

連続で敵を倒すと倍率が上がります（最大×8）。ミスするとリセット。

---

## ファイル構成

```
popbell-shooter/
├── index.html      # ゲーム本体（エントリポイント）
├── style.css       # ページスタイリング
├── game.js         # ゲームロジック全体（Canvas描画含む）
├── README.md       # このファイル
└── assets/         # （任意）音声ファイルを追加する場所
    └── sounds/
        ├── shot.wav
        ├── hit.wav
        ├── explosion.wav
        ├── bell-change.wav
        ├── bell-get.wav
        ├── power-up.wav
        ├── game-over.wav
        ├── stage-clear.wav
        └── boss-appear.wav
```

---

## パラメータ調整ガイド

`game.js` の先頭にある `CONFIG` オブジェクトで全パラメータを管理しています。

### 難易度を下げたい

```javascript
PLAYER_INVINCIBLE_TIME: 240,  // 無敵時間を長く（デフォルト: 180）
INITIAL_LIVES: 5,              // 初期残機を増やす（デフォルト: 3）
ENEMY_A_SPAWN_RATE: 90,        // 敵Aの出現を減らす（デフォルト: 55）
BOSS_SCORE_THRESHOLD: 15000,   // ボス出現を遅らせる（デフォルト: 8000）
```

### 難易度を上げたい

```javascript
PLAYER_FIRE_RATE: 12,          // 連射速度を落とす（デフォルト: 8）
ENEMY_C_FIRE_RATE: 60,         // 敵Cの発射を早める（デフォルト: 100）
DIFFICULTY_INTERVAL: 900,      // 難易度上昇を早める（デフォルト: 1800）
```

### ショットを強くしたい

```javascript
BULLET_SPEED: 16,              // 弾速アップ（デフォルト: 12）
PLAYER_FIRE_RATE: 4,           // 連射速度アップ（デフォルト: 8）
```

### ベルを取りやすくしたい

```javascript
BELL_LIFETIME: 600,            // ベルの寿命を延ばす（デフォルト: 360）
SHOOTABLE_CLOUD_SPAWN_RATE: 120, // 雲の出現を早める（デフォルト: 200）
```

### 開発・デバッグ用

```javascript
DEBUG_MODE: true,   // 当たり判定の可視化・デバッグ情報表示
GOD_MODE: true,     // プレイヤー無敵モード
```

---

## 音声ファイルの追加方法

1. `assets/sounds/` フォルダを作成
2. 対応する `.wav` / `.mp3` ファイルを配置
3. `game.js` の `Sound.init()` 内のコメントアウトを外す

```javascript
Sound.init() {
  this.load('shot',        'assets/sounds/shot.wav');  // ← コメントを外す
  this.load('explosion',   'assets/sounds/explosion.wav');
  // ...
}
```

---

## 今後の拡張案

### 優先度：高
- **BGM追加**: `Sound.load('bgm', 'assets/sounds/bgm.mp3')` + ループ再生
- **ステージ2追加**: 異なる敵配置パターン・ボス2体目

### 優先度：中
- **スマホ対応**: バーチャルパッドのCanvas描画 + タッチイベント対応
- **画像素材差し替え**: `drawImage()` を使った `_drawA` の置き換え
- **セーブデータ拡張**: ステージクリア記録・プレイ時間のlocalStorage保存

### 優先度：低
- **2Pモード**: WebSocket / SharedArrayBuffer を使った同期
- **エンドレスモード**: ステージクリア後も難易度上昇で続くモード

---

## 技術仕様

- **Canvas API**: 2D コンテキストのみ使用（WebGLなし）
- **フレームレート**: `requestAnimationFrame`（ブラウザ依存、通常60fps）
- **データ永続化**: `localStorage`（ハイスコアのみ）
- **外部依存**: なし（ゼロ依存）
