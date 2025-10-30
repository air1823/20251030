let table; // 儲存 CSV 資料
let questions = []; // 儲存解析後的題目物件
let currentQuestionIndex = 0; // 目前題目的索引
let score = 0; // 分數
let gameState = 'loading'; // 遊戲狀態: loading, quiz, result
let selectedOption = -1; // -1 表示尚未選擇
let optionBoxes = []; // 儲存選項的邊界框 {x, y, w, h}
let feedback = ''; // 答題反饋 (correct / incorrect)

// 特效陣列
let cursorParticles = []; // 游標粒子
let selectionEffects = []; // 點擊特效

// ------------------------------
// p5.js 核心函數
// ------------------------------

function preload() {
  // 在 preload() 中載入 CSV 檔案
  // 'csv' 表示檔案類型，'header' 表示第一行是標頭 (我們的範例沒有標頭)
  // 由於我們的 CSV 沒有標頭，所以移除 'header' 參數
  table = loadTable('questions.csv', 'csv');
}

function setup() {
  createCanvas(800, 600);
  textFont('Arial'); // 設定一個通用的字體
  noCursor(); // 隱藏預設游標，使用自訂的
  parseQuestions(); // 解析載入的 CSV
  gameState = 'quiz'; // 載入完成，開始測驗
}

function draw() {
  background(30, 30, 40); // 深藍色背景

  // 根據不同的遊戲狀態呼叫不同的繪製函數
  if (gameState === 'loading') {
    drawLoadingScreen();
  } else if (gameState === 'quiz') {
    drawQuizScreen();
  } else if (gameState === 'result') {
    drawResultScreen();
  }

  // 繪製所有特效
  drawCursorEffect();
  drawSelectionEffects();
}

function mousePressed() {
  if (gameState === 'quiz') {
    // 如果還沒選擇答案
    if (selectedOption === -1) {
      // 檢查是否點擊了某個選項
      for (let i = 0; i < optionBoxes.length; i++) {
        if (isMouseOver(optionBoxes[i])) {
          checkAnswer(i); // 檢查答案
          createSelectionEffect(mouseX, mouseY, feedback === 'correct'); // 產生點擊特效
          break;
        }
      }
    } else {
      // 如果已經選了答案 (正在顯示反饋)，任何點擊都會進入下一題
      nextQuestion();
    }
  } else if (gameState === 'result') {
    // 與 drawResultScreen 相同的按鈕位置計算（保持一致）
    let btnW = 200;
    let btnH = 50;
    let gap = 40;
    let totalW = btnW * 2 + gap;
    let leftX = width / 2 - totalW / 2;
    let rightX = leftX + btnW + gap;
    let btnY = height - 120;

    let restartBtn = { x: leftX, y: btnY, w: btnW, h: btnH };
    let refreshBtn = { x: rightX, y: btnY, w: btnW, h: btnH };

    if (isMouseOver(restartBtn)) {
      resetQuiz();
    } else if (isMouseOver(refreshBtn)) {
      // 重新載入整個頁面以隨機產生新的五題
      location.reload();
    }
  }
}

// ------------------------------
// 遊戲狀態繪製函數
// ------------------------------

function drawLoadingScreen() {
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("題庫載入中...", width / 2, height / 2);
}

function drawQuizScreen() {
  if (questions.length === 0) return; // 安全檢查

  let q = questions[currentQuestionIndex];
  optionBoxes = []; // 重置選項框

  // 1. 繪製問題
  fill(255);
  textSize(28);
  textAlign(CENTER, CENTER);
  textWrap(WORD); // 自動換行
  text(q.questionText, 50, 50, width - 100, 150); // 限制文字寬度

  // 2. 繪製進度
  textSize(16);
  fill(150);
  text(`第 ${currentQuestionIndex + 1} / ${questions.length} 題`, width / 2, 200);

  // 3. 繪製選項
  let startY = 250;
  let optionHeight = 60;
  let optionGap = 20;

  for (let i = 0; i < q.options.length; i++) {
    let box = {
      x: 150,
      y: startY + i * (optionHeight + optionGap),
      w: width - 300,
      h: optionHeight
    };
    optionBoxes.push(box); // 儲存碰撞框

    push(); // 開始新的繪圖狀態

    let isHover = isMouseOver(box);

    if (selectedOption === -1) {
      // ----- 尚未選擇狀態 -----
      if (isHover) {
        fill(100, 100, 150); // 懸停顏色
        stroke("#FFB7DD"); // 邊框
        strokeWeight(2);
      } else {
        fill(50, 50, 80); // 預設顏色
        noStroke();
      }
    } else {
      // ----- 已選擇 (顯示反饋) 狀態 -----
      if (i === q.correctIndex) {
        // 正確答案
        fill(30, 100, 30); // 深綠色
        stroke(0, 255, 0); // 亮綠色邊框
        strokeWeight(3);
      } else if (i === selectedOption) {
        // 選擇的錯誤答案
        fill(100, 30, 30); // 深紅色
        stroke(255, 0, 0); // 亮紅色邊框
        strokeWeight(3);
      } else {
        // 其他未選的錯誤答案
        fill(50, 50, 50); // 灰色
        noStroke();
      }
    }

    rect(box.x, box.y, box.w, box.h, 10); // 繪製圓角矩形

    // 繪製選項文字
    noStroke();
    if (isHover && selectedOption === -1) {
      fill("#FFB7DD"); // 懸停文字
    } else {
      fill(255); // 預設文字白色
    }
    textSize(18);
    textAlign(LEFT, CENTER);
    text(q.options[i], box.x + 20, box.y + box.h / 2);

    pop(); // 恢復繪圖狀態
  }

  // 4. 繪製答題反饋
  if (selectedOption !== -1) {
    textSize(32);
    textAlign(CENTER, CENTER);
    if (feedback === 'correct') {
      fill(0, 255, 0);
      text("答對了！", width / 2, height - 50);
    } else {
      fill(255, 0, 0);
      text("答錯了...", width / 2, height - 50);
    }
    fill(180);
    textSize(16);
    text("點擊任意處繼續", width / 2, height - 20);
  }
}

function drawResultScreen() {
  let percentage = (score / questions.length) * 100;

  // 根據分數決定要呼叫哪個動畫
  if (percentage >= 80) {
    drawPraiseAnimation(); // 稱讚
  } else if (percentage >= 50) {
    drawEncouragementAnimation(); // 鼓勵
  } else {
    drawTryAgainAnimation(); // 再加油
  }

  // 顯示最終分數
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text(`你的總分: ${score} / ${questions.length}`, width / 2, height / 2 + 50);
  textSize(24);
  text(`得分率: ${percentage.toFixed(0)}%`, width / 2, height / 2 + 100);

  // 計算兩個按鈕的對稱位置（置於畫面中心的兩側）
  let btnW = 200;
  let btnH = 50;
  let gap = 40; // 按鈕間距
  let totalW = btnW * 2 + gap;
  let leftX = width / 2 - totalW / 2;
  let rightX = leftX + btnW + gap;
  let btnY = height - 120;

  let restartBtn = { x: leftX, y: btnY, w: btnW, h: btnH };
  let refreshBtn = { x: rightX, y: btnY, w: btnW, h: btnH };

  // 重新開始按鈕
  push();
  if (isMouseOver(restartBtn)) {
    fill("#FFB7DD"); // 懸停
    stroke(255);
    strokeWeight(2);
  } else {
    fill(80, 80, 150); // 預設紫色
    noStroke();
  }
  rect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 10);
  fill(isMouseOver(restartBtn) ? 0 : 255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("重新開始", restartBtn.x + restartBtn.w / 2, restartBtn.y + restartBtn.h / 2);
  pop();

  // 刷新題目按鈕（外觀與重新開始相同）
  push();
  if (isMouseOver(refreshBtn)) {
    fill("#FFB7DD"); // 懸停
    stroke(255);
    strokeWeight(2);
  } else {
    fill(80, 80, 150); // 預設紫色
    noStroke();
  }
  rect(refreshBtn.x, refreshBtn.y, refreshBtn.w, refreshBtn.h, 10);
  fill(isMouseOver(refreshBtn) ? 0 : 255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("刷新題目", refreshBtn.x + refreshBtn.w / 2, refreshBtn.y + refreshBtn.h / 2);
  pop();
}

// ------------------------------
// 遊戲邏輯輔助函數
// ------------------------------

function parseQuestions() {
  // 清除舊題目
  questions = [];

  let total = table.getRowCount();
  if (total === 0) return;

  // 先建立所有列的索引並打亂，從中取前最多 5 題
  let rowIndices = [];
  for (let r = 0; r < total; r++) rowIndices.push(r);
  rowIndices = shuffle(rowIndices); // p5.js 的 shuffle()

  let pickCount = min(5, total);

  for (let k = 0; k < pickCount; k++) {
    let r = rowIndices[k];

    // 原始選項與正確索引
    let origOptions = [
      table.getString(r, 1),
      table.getString(r, 2),
      table.getString(r, 3),
      table.getString(r, 4)
    ];
    let origCorrect = table.getNum(r, 5); // 原始正確答案（0-based）

    // 隨機打亂選項順序，同步計算新的正確索引
    let optIdx = [0, 1, 2, 3];
    optIdx = shuffle(optIdx);
    let newOptions = [];
    for (let i = 0; i < optIdx.length; i++) {
      newOptions.push(origOptions[optIdx[i]]);
    }
    let newCorrectIndex = optIdx.indexOf(origCorrect);

    // 推入題目陣列
    let q = {
      questionText: table.getString(r, 0),
      options: newOptions,
      correctIndex: newCorrectIndex
    };
    questions.push(q);
  }
  // (可選) 隨機打亂題目順序
  // questions = shuffle(questions);
}

function checkAnswer(selectedIndex) {
  selectedOption = selectedIndex;
  let q = questions[currentQuestionIndex];
  if (selectedIndex === q.correctIndex) {
    score++;
    feedback = 'correct';
  } else {
    feedback = 'incorrect';
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  selectedOption = -1;
  feedback = '';
  optionBoxes = [];

  // 如果所有題目都答完了
  if (currentQuestionIndex >= questions.length) {
    gameState = 'result';
  }
}

function resetQuiz() {
  score = 0;
  currentQuestionIndex = 0;
  gameState = 'quiz';
  selectedOption = -1;
  feedback = '';
  // (可選) 再次打亂題目
  // questions = shuffle(questions);
}

function isMouseOver(box) {
  // 檢查滑鼠是否在指定的框內
  return mouseX > box.x && mouseX < box.x + box.w &&
         mouseY > box.y && mouseY < box.y + box.h;
}

// ------------------------------
// 動態反饋動畫
// ------------------------------

// 稱讚 (>= 80%) - 煙火/彩帶
function drawPraiseAnimation() {
  for (let i = 0; i < 5; i++) {
    // 模擬彩帶
    push();
    translate(random(width), (frameCount * 5 + random(height)) % height);
    rotate(random(TWO_PI));
    fill(random(150, 255), random(150, 255), random(150, 255), 150);
    noStroke();
    rect(0, 0, 10, 30);
    pop();
    
    // 模擬閃爍星星
    let x = random(width);
    let y = random(height);
    fill(255, 255, 0, random(100, 200));
    ellipse(x, y, 5, 5);
  }
  fill(255, 255, 0);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("太棒了！你真是個天才！", width / 2, height / 2 - 50);
}

// 鼓勵 (50% - 79%) - 上升的氣泡
function drawEncouragementAnimation() {
  for (let i = 0; i < 3; i++) {
    let x = random(width);
    // 使用 frameCount 讓氣泡從底部往上移動
    let y = (height - (frameCount * 2 + random(300)) % (height + 100));
    let r = random(20, 50);
    noFill();
    stroke(0, 180, 255, 100);
    strokeWeight(3);
    ellipse(x, y, r, r);
  }
  fill(0, 200, 255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("還不錯，繼續加油！", width / 2, height / 2 - 50);
}

// 再加油 (< 50%) - 溫和的脈衝
function drawTryAgainAnimation() {
  // 創造一個以畫面中央為圓心的脈衝
  let r = (frameCount * 2) % 150;
  let alpha = map(r, 0, 150, 100, 0); // 越往外越透明
  noFill();
  stroke(255, 100, 100, alpha);
  strokeWeight(5);
  ellipse(width / 2, height / 2 - 50, r * 2, r * 2);

  fill(255, 150, 150);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("別灰心，再試一次！", width / 2, height / 2 - 50);
}


// ------------------------------
// 特效相關 (游標 & 點擊)
// ------------------------------

// 1. 游標特效
function drawCursorEffect() {
  // 每幀都新增一個粒子到陣列
  cursorParticles.push(new Particle(mouseX, mouseY));

  // 更新並繪製所有粒子
  for (let i = cursorParticles.length - 1; i >= 0; i--) {
    cursorParticles[i].update();
    cursorParticles[i].show();
    if (cursorParticles[i].isFinished()) {
      cursorParticles.splice(i, 1); // 移除消失的粒子
    }
  }
  
  // 繪製主要游標 (一個明亮的點)
  fill("#FFB7DD");
  stroke(255);
  ellipse(mouseX, mouseY, 12, 12);
}

// 2. 點擊特效
function createSelectionEffect(x, y, isCorrect) {
  let col = isCorrect ? color(0, 255, 0) : color(255, 0, 0);
  // 產生 10-20 個粒子
  let particleCount = int(random(10, 20));
  for (let i = 0; i < particleCount; i++) {
    selectionEffects.push(new Particle(x, y, col, true)); // true 表示這是爆炸粒子
  }
  // 產生 1-2 個衝擊波
  for(let i = 0; i < random(1, 2); i++) {
    selectionEffects.push(new Ripple(x, y, col));
  }
}

function drawSelectionEffects() {
  for (let i = selectionEffects.length - 1; i >= 0; i--) {
    let effect = selectionEffects[i];
    effect.update();
    effect.show();
    if (effect.isFinished()) {
      selectionEffects.splice(i, 1);
    }
  }
}

// ------------------------------
// 特效物件 Class
// ------------------------------

// 粒子 Class (用於游標追蹤 & 點擊爆炸)
class Particle {
  constructor(x, y, col, isExplosion = false) {
    this.x = x;
    this.y = y;
    this.col = col || color(255, 255, 0, 150); // 預設為黃色
    this.alpha = 255;
    this.isExplosion = isExplosion;

    if (this.isExplosion) {
      // 爆炸粒子：往外擴散
      let angle = random(TWO_PI);
      let speed = random(1, 5);
      this.vx = cos(angle) * speed;
      this.vy = sin(angle) * speed;
      this.size = random(3, 8);
      this.fadeRate = random(3, 6);
    } else {
      // 游標粒子：隨機漂移
      this.vx = random(-0.5, 0.5);
      this.vy = random(-0.5, 0.5);
      this.size = random(2, 5);
      this.fadeRate = 5; // 游標粒子消失快一點
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.fadeRate;
    if (this.isExplosion) {
      this.vy += 0.05; // 輕微重力
    }
  }

  show() {
    noStroke();
    // 取得顏色 R, G, B 值並套用 alpha
    fill(red(this.col), green(this.col), blue(this.col), this.alpha);
    ellipse(this.x, this.y, this.size);
  }

  isFinished() {
    return this.alpha < 0;
  }
}

// 衝擊波 Class (用於點擊)
class Ripple {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.r = 0; // 半徑
    this.maxR = random(50, 100);
    this.alpha = 255;
    this.col = col;
    this.weight = 4;
  }
  
  update() {
    this.r += 4; // 擴散速度
    this.alpha -= 6; // 消失速度
    this.weight = max(1, this.weight - 0.1); // 線條變細
  }
  
  show() {
    noFill();
    stroke(red(this.col), green(this.col), blue(this.col), this.alpha);
    strokeWeight(this.weight);
    ellipse(this.x, this.y, this.r * 2);
  }
  
  isFinished() {
    return this.alpha < 0;
  }
}