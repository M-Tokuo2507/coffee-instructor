/* ===================================================================
   コーヒーインストラクター1級 対策アプリ – app.js
   =================================================================== */
'use strict';

/* ---------- データ準備 ---------- */
const CATEGORIES = [
  '商品名からコーヒーを理解する',
  '風味からコーヒーを理解する',
  'コーヒーをおいしく淹れるために',
  'コーヒーのおいしさを保つために',
  'コーヒーの周辺知識',
  '生豆',
  '焙煎',
  '粉砕',
  '包装',
  'カップテストの手順'
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
    if (mode === 'textbook') {
      buildChapterList();
      showScreen('textbook');
    } else if (mode === 'category') {
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

/* ---------- テキスト学習 ---------- */
let currentChapterIndex = 0;
let currentSearchQuery = '';   // 全文検索で指定されたクエリ（章を開いた時の自動ハイライト用）
let currentMatchIndex = 0;     // 章内検索の現在位置
let chapterTextsCache = null;  // 章テキストキャッシュ

function buildChapterList() {
  const list = document.getElementById('chapter-list');
  list.innerHTML = '';
  knowledgeData.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'chapter-btn';
    btn.innerHTML = `
      <span class="chapter-num">${i + 1}</span>
      <span class="chapter-title">${ch.title}</span>
      <span class="chevron">›</span>
    `;
    btn.addEventListener('click', () => {
      currentSearchQuery = ''; // 通常の章クリックは検索クエリをリセット
      openChapter(i);
    });
    list.appendChild(btn);
  });
}

function openChapter(index) {
  currentChapterIndex = index;
  const ch = knowledgeData[index];
  document.getElementById('textbook-title').textContent = ch.title;
  document.getElementById('textbook-content').innerHTML = ch.html;
  updateChapterNav();
  showScreen('textbook-read');

  // fixed sticky 分の余白を本文上に確保（タイトルの折り返し含めて毎回再計算）
  requestAnimationFrame(adjustTextbookStickyOffset);

  // 全文検索から開かれた場合は章内検索を自動実行
  const inChapterInput = document.getElementById('in-chapter-input');
  if (currentSearchQuery) {
    inChapterInput.value = currentSearchQuery;
    performInChapterSearch(currentSearchQuery, true);
  } else {
    inChapterInput.value = '';
    updateInChapterCount(0, 0);
  }
}

// fixed sticky ヘッダーの高さを取得して本文に余白を設定
function adjustTextbookStickyOffset() {
  const sticky = document.querySelector('#screen-textbook-read .textbook-sticky');
  const content = document.getElementById('textbook-content');
  if (!sticky || !content) return;
  const h = sticky.offsetHeight;
  content.style.marginTop = h + 'px';
  // 検索ハイライトジャンプ時のスクロール位置調整にも使用
  document.documentElement.style.setProperty('--sticky-h', h + 'px');
}
window.addEventListener('resize', adjustTextbookStickyOffset);
window.addEventListener('orientationchange', () => {
  setTimeout(adjustTextbookStickyOffset, 100);
});

function updateChapterNav() {
  document.getElementById('btn-prev-chapter').disabled = (currentChapterIndex <= 0);
  document.getElementById('btn-next-chapter').disabled = (currentChapterIndex >= knowledgeData.length - 1);
}

document.getElementById('btn-prev-chapter').addEventListener('click', () => {
  if (currentChapterIndex > 0) {
    currentSearchQuery = '';
    openChapter(currentChapterIndex - 1);
  }
});
document.getElementById('btn-next-chapter').addEventListener('click', () => {
  if (currentChapterIndex < knowledgeData.length - 1) {
    currentSearchQuery = '';
    openChapter(currentChapterIndex + 1);
  }
});

/* ---------- ナレッジ検索 ---------- */

// HTML文字列からテキストを抽出
function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// 章テキストキャッシュ取得（初回計算後再利用）
function getChapterTexts() {
  if (chapterTextsCache) return chapterTextsCache;
  chapterTextsCache = knowledgeData.map(ch => htmlToText(ch.html));
  return chapterTextsCache;
}

// HTMLエスケープ
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// debounce
function debounce(fn, wait) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// 全文検索
function performGlobalSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  const chapterList = document.getElementById('chapter-list');

  const q = (query || '').trim();
  if (q.length === 0) {
    resultsContainer.style.display = 'none';
    chapterList.style.display = '';
    return;
  }

  const qLower = q.toLowerCase();
  const texts = getChapterTexts();
  const results = [];

  knowledgeData.forEach((ch, i) => {
    const text = texts[i];
    const lower = text.toLowerCase();
    const matches = [];
    let pos = 0;
    while ((pos = lower.indexOf(qLower, pos)) !== -1) {
      matches.push(pos);
      pos += qLower.length;
      if (matches.length >= 100) break; // 上限
    }
    if (matches.length > 0) {
      results.push({
        index: i,
        title: ch.title,
        matches: matches,
        text: text
      });
    }
  });

  renderSearchResults(results, q);
  resultsContainer.style.display = '';
  chapterList.style.display = 'none';
}

function renderSearchResults(results, query) {
  const container = document.getElementById('search-results');
  if (results.length === 0) {
    container.innerHTML = `<div class="no-results">「${escapeHtml(query)}」に一致する結果はありません</div>`;
    return;
  }
  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
  const qLen = query.length;

  container.innerHTML =
    `<div class="search-summary">${results.length}章 / ${totalMatches}件のマッチ</div>` +
    results.map(r => `
      <div class="search-result-item" data-index="${r.index}">
        <div class="result-header">
          <span class="result-title">${escapeHtml(r.title)}</span>
          <span class="result-count">${r.matches.length}件</span>
        </div>
        <div class="result-snippet">${generateSnippet(r.text, r.matches[0], qLen)}</div>
      </div>
    `).join('');

  container.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      currentSearchQuery = query;
      openChapter(idx);
    });
  });
}

function generateSnippet(text, pos, queryLen) {
  const radius = 40;
  const before = Math.max(0, pos - radius);
  const after = Math.min(text.length, pos + queryLen + radius);
  const snippet = text.substring(before, after);
  const matchStart = pos - before;
  return (before > 0 ? '…' : '') +
    escapeHtml(snippet.substring(0, matchStart)) +
    '<mark>' + escapeHtml(snippet.substring(matchStart, matchStart + queryLen)) + '</mark>' +
    escapeHtml(snippet.substring(matchStart + queryLen)) +
    (after < text.length ? '…' : '');
}

/* ---------- 章内検索 ---------- */

function performInChapterSearch(query, scrollToFirst) {
  clearInChapterHighlights();
  const q = (query || '').trim();
  if (q.length === 0) {
    updateInChapterCount(0, 0);
    return;
  }
  const container = document.getElementById('textbook-content');
  highlightTextNodes(container, q);

  const marks = container.querySelectorAll('mark.in-chapter-match');
  if (marks.length === 0) {
    updateInChapterCount(0, 0);
    return;
  }
  currentMatchIndex = 0;
  marks[0].classList.add('current');
  updateInChapterCount(1, marks.length);
  if (scrollToFirst) {
    marks[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function highlightTextNodes(root, query) {
  const qLower = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') return NodeFilter.FILTER_REJECT;
      if (node.textContent.toLowerCase().indexOf(qLower) === -1) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(node => {
    const text = node.textContent;
    const lower = text.toLowerCase();
    const fragment = document.createDocumentFragment();
    let lastEnd = 0;
    let pos = 0;
    while ((pos = lower.indexOf(qLower, lastEnd)) !== -1) {
      if (pos > lastEnd) {
        fragment.appendChild(document.createTextNode(text.substring(lastEnd, pos)));
      }
      const mark = document.createElement('mark');
      mark.className = 'in-chapter-match';
      mark.textContent = text.substring(pos, pos + query.length);
      fragment.appendChild(mark);
      lastEnd = pos + query.length;
    }
    if (lastEnd < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastEnd)));
    }
    node.parentNode.replaceChild(fragment, node);
  });
}

function clearInChapterHighlights() {
  const container = document.getElementById('textbook-content');
  if (!container) return;
  const marks = container.querySelectorAll('mark.in-chapter-match');
  marks.forEach(m => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
  });
  // テキストノードを統合
  container.normalize();
}

function updateInChapterCount(current, total) {
  const counter = document.getElementById('in-chapter-count');
  counter.textContent = total === 0 ? '' : `${current} / ${total}`;
}

function navigateMatch(direction) {
  const marks = document.querySelectorAll('#textbook-content mark.in-chapter-match');
  if (marks.length === 0) return;
  marks[currentMatchIndex].classList.remove('current');
  currentMatchIndex = (currentMatchIndex + direction + marks.length) % marks.length;
  marks[currentMatchIndex].classList.add('current');
  marks[currentMatchIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
  updateInChapterCount(currentMatchIndex + 1, marks.length);
}

/* ---------- 検索UIイベント ---------- */
document.getElementById('knowledge-search').addEventListener('input', debounce((e) => {
  const q = e.target.value;
  document.getElementById('btn-clear-search').style.display = q ? '' : 'none';
  performGlobalSearch(q);
}, 200));

document.getElementById('btn-clear-search').addEventListener('click', () => {
  const input = document.getElementById('knowledge-search');
  input.value = '';
  document.getElementById('btn-clear-search').style.display = 'none';
  performGlobalSearch('');
  currentSearchQuery = '';
  input.focus();
});

document.getElementById('in-chapter-input').addEventListener('input', debounce((e) => {
  performInChapterSearch(e.target.value, true);
}, 200));

document.getElementById('btn-prev-match').addEventListener('click', () => navigateMatch(-1));
document.getElementById('btn-next-match').addEventListener('click', () => navigateMatch(1));

document.getElementById('btn-clear-in-chapter').addEventListener('click', () => {
  const input = document.getElementById('in-chapter-input');
  input.value = '';
  performInChapterSearch('', false);
  input.focus();
});

// Enter / Shift+Enter で前後マッチに移動
document.getElementById('in-chapter-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    navigateMatch(e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    const input = e.target;
    input.value = '';
    performInChapterSearch('', false);
  }
});

/* ---------- Service Worker 登録 ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
