/* ===================================================================
   Coffee Instructor 1級 対策アプリ – app.js
   =================================================================== */
'use strict';

/* ---------- データ準備 ---------- */
const CATEGORIES = [
  'コーヒーの歴史・伝播',
  '植物学的分類・品種',
  '栽培・土壌・病害虫',
  '収穫方法',
  '精選方法',
  '選別方法',
  '生豆の成分',
  '焙煎',
  '粉砕・包装・保管',
  '産地・格付け・流通',
  '抽出・品質管理'
];

// 全問題に type を付与して統合
const allQuestions = [
  ...questionsOX.map(q => ({ ...q, type: 'ox' })),
  ...questionsGeo.map(q => ({ ...q, type: 'geo' })),
  ...questionsDesc.map(q => ({ ...q, type: 'desc' }))
];

const DIFFICULTY_LABEL = { 1: '基礎', 2: '標準', 3: '応用' };
const TYPE_LABEL = { ox: '○×', geo: '選択', desc: '記述' };

/* ---------- localStorage 管理 ---------- */
const STORAGE_KEY = 'coffee1_records';
const SETTINGS_KEY = 'coffee1_settings';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function recordAnswer(id, isCorrect) {
  const records = loadRecords();
  if (!records[id]) records[id] = { correct: 0, wrong: 0 };
  if (isCorrect) records[id].correct++;
  else records[id].wrong++;
  saveRecords(records);
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch { return {}; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------- ユーティリティ ---------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getWeakQuestions() {
  const records = loadRecords();
  return allQuestions.filter(q => {
    const r = records[q.id];
    return r && r.wrong > 0 && (r.wrong >= r.correct);
  });
}

/* ---------- 画面遷移 ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ---------- ホーム画面の統計更新 ---------- */
function updateHomeStats() {
  const records = loadRecords();
  const ids = Object.keys(records);
  const total = ids.length;
  let correctSum = 0, totalAttempts = 0;
  ids.forEach(id => {
    correctSum += records[id].correct;
    totalAttempts += records[id].correct + records[id].wrong;
  });
  const rate = totalAttempts > 0 ? Math.round((correctSum / totalAttempts) * 100) : 0;
  const weak = getWeakQuestions().length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-rate').textContent = totalAttempts > 0 ? rate + '%' : '--%';
  document.getElementById('stat-weak').textContent = weak;
}

/* ---------- 分野選択画面の構築 ---------- */
function buildCategoryList() {
  const list = document.getElementById('category-list');
  const records = loadRecords();
  list.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const qs = allQuestions.filter(q => q.category === cat);
    const attempted = qs.filter(q => records[q.id]).length;
    const correctCount = qs.reduce((sum, q) => {
      const r = records[q.id];
      return sum + (r ? r.correct : 0);
    }, 0);
    const totalAttempts = qs.reduce((sum, q) => {
      const r = records[q.id];
      return sum + (r ? r.correct + r.wrong : 0);
    }, 0);
    const rate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) + '%' : '--';

    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.innerHTML = `
      <span class="cat-name">${cat}</span>
      <span class="cat-count">${attempted}/${qs.length}</span>
      <span class="cat-rate">${rate}</span>
    `;
    btn.addEventListener('click', () => startCategoryQuiz(cat));
    list.appendChild(btn);
  });
}

/* ---------- クイズエンジン ---------- */
let currentQuiz = [];
let currentIndex = 0;
let quizResults = [];
let quizMode = '';
let quizCategory = '';

function startCategoryQuiz(cat) {
  quizMode = 'category';
  quizCategory = cat;
  currentQuiz = shuffle(allQuestions.filter(q => q.category === cat));
  currentIndex = 0;
  quizResults = [];
  showScreen('quiz');
  renderQuestion();
}

function startWeakQuiz() {
  quizMode = 'weak';
  const weak = getWeakQuestions();
  if (weak.length === 0) {
    showDialog('苦手問題がありません。まずは問題を解いてみましょう。', null);
    return;
  }
  currentQuiz = shuffle(weak);
  currentIndex = 0;
  quizResults = [];
  showScreen('quiz');
  renderQuestion();
}

function startRandomQuiz() {
  quizMode = 'random';
  const settings = loadSettings();
  const count = parseInt(settings.randomCount) || 10;
  const shuffled = shuffle(allQuestions);
  currentQuiz = count === 0 ? shuffled : shuffled.slice(0, count);
  currentIndex = 0;
  quizResults = [];
  showScreen('quiz');
  renderQuestion();
}

function startExamQuiz() {
  quizMode = 'exam';
  const oxPool = shuffle(questionsOX.map(q => ({ ...q, type: 'ox' })));
  const geoPool = shuffle(questionsGeo.map(q => ({ ...q, type: 'geo' })));
  const descPool = shuffle(questionsDesc.map(q => ({ ...q, type: 'desc' })));
  currentQuiz = [
    ...oxPool.slice(0, 20),
    ...geoPool.slice(0, 5),
    ...descPool.slice(0, 10)
  ];
  currentIndex = 0;
  quizResults = [];
  showScreen('quiz');
  renderQuestion();
}

/* ---------- 問題表示 ---------- */
function renderQuestion() {
  const q = currentQuiz[currentIndex];
  const total = currentQuiz.length;

  // カウンター・プログレス
  document.getElementById('quiz-counter').textContent = `${currentIndex + 1} / ${total}`;
  document.getElementById('progress-fill').style.width = `${((currentIndex + 1) / total) * 100}%`;

  // メタ情報
  document.getElementById('quiz-category').textContent = q.category;
  document.getElementById('quiz-type').textContent = TYPE_LABEL[q.type];
  document.getElementById('quiz-diff').textContent = DIFFICULTY_LABEL[q.difficulty];

  // 問題文
  document.getElementById('question-text').textContent = q.question;

  // 全回答エリアを非表示
  document.getElementById('answer-ox').style.display = 'none';
  document.getElementById('answer-geo').style.display = 'none';
  document.getElementById('answer-desc').style.display = 'none';
  document.getElementById('explanation-area').style.display = 'none';

  if (q.type === 'ox') {
    renderOX(q);
  } else if (q.type === 'geo') {
    renderGeo(q);
  } else {
    renderDesc(q);
  }
}

function renderOX(q) {
  const area = document.getElementById('answer-ox');
  area.style.display = 'flex';
  const btns = area.querySelectorAll('.ox-btn');
  btns.forEach(btn => {
    btn.className = 'ox-btn ' + (btn.dataset.answer === 'true' ? 'ox-true' : 'ox-false');
    btn.disabled = false;
    btn.onclick = () => handleOXAnswer(q, btn.dataset.answer === 'true');
  });
}

function handleOXAnswer(q, userAnswer) {
  const isCorrect = (userAnswer === q.answer);
  recordAnswer(q.id, isCorrect);
  quizResults.push({ id: q.id, correct: isCorrect });

  const btns = document.querySelectorAll('#answer-ox .ox-btn');
  btns.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
    const btnVal = btn.dataset.answer === 'true';
    if (btnVal === userAnswer) {
      btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
    }
    if (btnVal === q.answer && !isCorrect) {
      btn.classList.add('correct-answer');
    }
  });

  const correctLabel = q.answer ? '○（正しい）' : '✕（誤り）';
  showExplanation(isCorrect, q.explanation, correctLabel);
}

function renderGeo(q) {
  const area = document.getElementById('answer-geo');
  area.style.display = 'flex';
  const btns = area.querySelectorAll('.choice-btn');
  btns.forEach((btn, i) => {
    btn.textContent = q.choices[i];
    btn.className = 'choice-btn';
    btn.disabled = false;
    btn.onclick = () => handleGeoAnswer(q, i);
  });
}

function handleGeoAnswer(q, userIndex) {
  const isCorrect = (userIndex === q.answer);
  recordAnswer(q.id, isCorrect);
  quizResults.push({ id: q.id, correct: isCorrect });

  const btns = document.querySelectorAll('#answer-geo .choice-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    btn.classList.add('disabled');
    if (i === userIndex) {
      btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
    }
    if (i === q.answer && !isCorrect) {
      btn.classList.add('correct-answer');
    }
  });

  const correctLabel = q.choices[q.answer];
  showExplanation(isCorrect, q.explanation, correctLabel);
}

function renderDesc(q) {
  const area = document.getElementById('answer-desc');
  area.style.display = 'flex';
  document.getElementById('btn-show-answer').style.display = 'block';
  document.getElementById('desc-answer-area').style.display = 'none';

  document.getElementById('btn-show-answer').onclick = () => {
    document.getElementById('btn-show-answer').style.display = 'none';
    document.getElementById('desc-answer-area').style.display = 'block';
    document.getElementById('desc-model-answer').textContent = q.answer;

    const kwContainer = document.getElementById('desc-keywords');
    kwContainer.innerHTML = '';
    q.keywords.forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.textContent = kw;
      kwContainer.appendChild(tag);
    });

    // 自己採点ボタン
    document.querySelectorAll('.score-btn').forEach(btn => {
      btn.onclick = () => {
        const isCorrect = btn.dataset.correct === 'true';
        recordAnswer(q.id, isCorrect);
        quizResults.push({ id: q.id, correct: isCorrect });
        goNext();
      };
    });
  };
}

function showExplanation(isCorrect, text, correctLabel) {
  const area = document.getElementById('explanation-area');
  area.style.display = 'block';
  const iconEl = document.getElementById('result-icon');
  if (isCorrect) {
    iconEl.innerHTML = '<span class="result-correct-text">正解！</span>';
  } else {
    const hint = correctLabel ? `<span class="result-hint">正解は ${correctLabel}</span>` : '';
    iconEl.innerHTML = `<span class="result-wrong-text">不正解</span>${hint}`;
  }
  document.getElementById('explanation-text').textContent = text;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- 次の問題・結果 ---------- */
document.getElementById('btn-next').addEventListener('click', goNext);

function goNext() {
  currentIndex++;
  if (currentIndex >= currentQuiz.length) {
    showResult();
  } else {
    renderQuestion();
    window.scrollTo(0, 0);
  }
}

function showResult() {
  const total = quizResults.length;
  const correct = quizResults.filter(r => r.correct).length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  document.getElementById('result-correct').textContent = correct;
  document.getElementById('result-total').textContent = total;
  document.getElementById('result-rate').textContent = `正答率 ${rate}%`;

  // 種別ごとの内訳
  const breakdown = document.getElementById('result-breakdown');
  breakdown.innerHTML = '';
  ['ox', 'geo', 'desc'].forEach(type => {
    const typeQs = quizResults.filter(r => {
      const q = allQuestions.find(aq => aq.id === r.id);
      return q && q.type === type;
    });
    if (typeQs.length === 0) return;
    const typeCorrect = typeQs.filter(r => r.correct).length;
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `<span>${TYPE_LABEL[type]}</span><span>${typeCorrect} / ${typeQs.length}</span>`;
    breakdown.appendChild(row);
  });

  updateHomeStats();
  showScreen('result');
}

/* ---------- イベント登録 ---------- */
// モード選択
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === 'category') {
      buildCategoryList();
      showScreen('category');
    } else if (mode === 'weak') {
      startWeakQuiz();
    } else if (mode === 'random') {
      startRandomQuiz();
    } else if (mode === 'exam') {
      startExamQuiz();
    }
  });
});

// 戻るボタン
document.querySelectorAll('[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    updateHomeStats();
    showScreen(btn.dataset.target);
  });
});

// 設定ボタン
document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));

// 終了ボタン
document.getElementById('btn-quit').addEventListener('click', () => {
  if (quizResults.length > 0) {
    showResult();
  } else {
    updateHomeStats();
    showScreen('home');
  }
});

// もう一度ボタン
document.getElementById('btn-retry').addEventListener('click', () => {
  if (quizMode === 'category') startCategoryQuiz(quizCategory);
  else if (quizMode === 'weak') startWeakQuiz();
  else if (quizMode === 'random') startRandomQuiz();
  else if (quizMode === 'exam') startExamQuiz();
});

// ダークモード
const toggleDark = document.getElementById('toggle-dark');
toggleDark.addEventListener('change', () => {
  const isDark = toggleDark.checked;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const settings = loadSettings();
  settings.dark = isDark;
  saveSettings(settings);
});

// ランダム問題数
document.getElementById('select-count').addEventListener('change', (e) => {
  const settings = loadSettings();
  settings.randomCount = e.target.value;
  saveSettings(settings);
});

// 全記録リセット
document.getElementById('btn-reset-all').addEventListener('click', () => {
  showDialog('全ての学習記録をリセットしますか？この操作は元に戻せません。', () => {
    localStorage.removeItem(STORAGE_KEY);
    updateHomeStats();
    showScreen('home');
  });
});

/* ---------- ダイアログ ---------- */
let dialogCallback = null;

function showDialog(msg, onConfirm) {
  document.getElementById('dialog-msg').textContent = msg;
  document.getElementById('dialog-overlay').style.display = 'flex';
  dialogCallback = onConfirm;
  if (!onConfirm) {
    document.getElementById('dialog-confirm').style.display = 'none';
    document.getElementById('dialog-cancel').textContent = 'OK';
  } else {
    document.getElementById('dialog-confirm').style.display = '';
    document.getElementById('dialog-cancel').textContent = 'キャンセル';
  }
}

document.getElementById('dialog-cancel').addEventListener('click', () => {
  document.getElementById('dialog-overlay').style.display = 'none';
  dialogCallback = null;
});

document.getElementById('dialog-confirm').addEventListener('click', () => {
  document.getElementById('dialog-overlay').style.display = 'none';
  if (dialogCallback) dialogCallback();
  dialogCallback = null;
});

/* ---------- 初期化 ---------- */
function init() {
  // 設定復元
  const settings = loadSettings();
  if (settings.dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggleDark.checked = true;
  }
  if (settings.randomCount) {
    document.getElementById('select-count').value = settings.randomCount;
  }

  updateHomeStats();
}

init();

/* ---------- Service Worker 登録 ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
