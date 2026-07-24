/* 댓글 패널 — GitHub Discussions(giscus) 기반, 모든 덱 공용.
 * 덱별 전체 스레드 + 슬라이드별 스레드(구글 문서 댓글처럼 특정 장표에 앵커) 지원.
 * 설정 변경은 이 파일의 GISCUS 상수만 수정하면 전 덱에 반영됨. */
(() => {
'use strict';

const GISCUS = {
  repo: 'hyunwoong-web/hyunwoong-slides',
  repoId: 'R_kgDOTYCYnQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTYCYnc4DB1mY',
};

const slug = (location.pathname.match(/\/decks\/([^/]+)\//) || [])[1]
  || location.pathname.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'home';

/* ---------- 스타일 ---------- */
const style = document.createElement('style');
style.textContent = `
#cmt-fab{position:fixed;top:14px;right:14px;z-index:99990;display:flex;align-items:center;gap:7px;
  padding:9px 16px;border-radius:100px;border:1.5px solid rgba(30,43,250,.28);background:rgba(255,255,255,.93);
  color:#1e2bfa;font:600 13.5px/1 'Pretendard',sans-serif;cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.1);backdrop-filter:blur(6px);transition:background .15s,color .15s}
#cmt-fab:hover{background:#1e2bfa;color:#fff}
#cmt-panel{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);z-index:99991;background:#fff;
  border-left:1.5px solid rgba(30,43,250,.18);box-shadow:-12px 0 32px rgba(0,0,0,.14);
  transform:translateX(105%);transition:transform .22s ease;display:flex;flex-direction:column;
  font-family:'Pretendard',sans-serif}
#cmt-panel.open{transform:translateX(0)}
.cmt-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px}
.cmt-head h3{font-size:16px;font-weight:700;color:#111;margin:0}
#cmt-close{border:0;background:none;font-size:22px;line-height:1;color:#888;cursor:pointer;padding:2px 8px}
#cmt-close:hover{color:#111}
.cmt-tabs{display:flex;gap:8px;padding:0 18px 12px}
.cmt-tab{flex:1;padding:9px 10px;border-radius:9px;border:1.5px solid rgba(30,43,250,.22);background:#fff;
  color:#555;font:600 12.5px 'Pretendard',sans-serif;cursor:pointer;transition:all .12s}
.cmt-tab.on{background:rgba(30,43,250,.08);color:#1e2bfa;border-color:#1e2bfa}
#cmt-body{flex:1;overflow-y:auto;padding:4px 14px 20px}
.cmt-hint{padding:9px 18px 13px;font-size:11.5px;line-height:1.55;color:#999;border-top:1px solid #eee}
.cmt-hint b{color:#666}
@media (max-width:600px){#cmt-fab{top:auto;bottom:14px}}
`;
document.head.appendChild(style);

/* ---------- DOM ---------- */
const fab = document.createElement('button');
fab.id = 'cmt-fab';
fab.type = 'button';
fab.innerHTML = '💬 댓글';
fab.title = '이 덱에 대한 논의 열기';

const panel = document.createElement('aside');
panel.id = 'cmt-panel';
panel.innerHTML = `
  <div class="cmt-head"><h3>💬 댓글 · 논의</h3><button id="cmt-close" type="button" title="닫기 (Esc)">×</button></div>
  <div class="cmt-tabs">
    <button class="cmt-tab on" id="cmt-tab-deck" type="button">덱 전체</button>
    <button class="cmt-tab" id="cmt-tab-slide" type="button">이 슬라이드 (p.1)</button>
  </div>
  <div id="cmt-body"></div>
  <div class="cmt-hint"><b>GitHub 계정</b>으로 로그인하면 댓글·답글·이모지 반응을 남길 수 있어요.
  스레드는 저장소 <b>Discussions</b>에 저장되어 어디서든 이어집니다.</div>`;

document.body.appendChild(fab);
document.body.appendChild(panel);

const body = panel.querySelector('#cmt-body');
const tabDeck = panel.querySelector('#cmt-tab-deck');
const tabSlide = panel.querySelector('#cmt-tab-slide');

/* ---------- giscus ---------- */
let mode = 'deck';       // 'deck' | 'slide'
let loadedTerm = null;
let isOpen = false;

const curSlide = () => {
  const n = parseInt((location.hash || '').slice(1), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};
const term = () => mode === 'deck'
  ? `[${slug}] 덱 전체 논의`
  : `[${slug}] p.${String(curSlide()).padStart(2, '0')}`;

function loadGiscus() {
  const t = term();
  if (t === loadedTerm) return;
  loadedTerm = t;
  body.textContent = '';
  const box = document.createElement('div');
  box.className = 'giscus';
  body.appendChild(box);
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  const attrs = {
    'data-repo': GISCUS.repo,
    'data-repo-id': GISCUS.repoId,
    'data-category': GISCUS.category,
    'data-category-id': GISCUS.categoryId,
    'data-mapping': 'specific',
    'data-term': t,
    'data-strict': '1',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': 'light',
    'data-lang': 'ko',
    'data-loading': 'eager',
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  body.appendChild(s);
}

/* ---------- 슬라이드 전환 감지 (replaceState 래핑 + hashchange, 디바운스 리로드) ---------- */
let reloadTimer = null;
function onSlideChange() {
  tabSlide.textContent = `이 슬라이드 (p.${curSlide()})`;
  if (isOpen && mode === 'slide') {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(loadGiscus, 450);
  }
}
const origReplace = history.replaceState.bind(history);
history.replaceState = function (...a) { origReplace(...a); onSlideChange(); };
window.addEventListener('hashchange', onSlideChange);
onSlideChange();

/* ---------- 패널 열기/닫기 ---------- */
function openPanel() { isOpen = true; panel.classList.add('open'); loadGiscus(); }
function closePanel() { isOpen = false; panel.classList.remove('open'); }
fab.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
panel.querySelector('#cmt-close').addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closePanel(); });

function setMode(m) {
  mode = m;
  tabDeck.classList.toggle('on', m === 'deck');
  tabSlide.classList.toggle('on', m === 'slide');
  loadGiscus();
}
tabDeck.addEventListener('click', () => setMode('deck'));
tabSlide.addEventListener('click', () => setMode('slide'));
})();
