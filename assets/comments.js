/* 댓글 패널 — 전 덱 공용.
 * 기본: 팀 댓글(Apps Script 백엔드) — GitHub 로그인 없이 이름 선택 + @이름 멘션 이메일 알림.
 * 슬라이드 내 특정 지점에 핀(📍)을 찍거나, 텍스트를 드래그해 인용과 함께 댓글 작성 가능.
 * CONFIG.endpoint가 비어 있으면 giscus(GitHub Discussions)로 폴백.
 * 팀원 이메일은 백엔드(Script Properties)에만 저장되어 프런트에 노출되지 않음. */
(() => {
'use strict';

const CONFIG = {
  /* Apps Script 웹앱 배포 URL(…/exec). 비어 있으면 giscus 폴백. */
  endpoint: 'https://script.google.com/macros/s/AKfycbw8CdIV8OSLFGAERmz0vZ3cbshKKnsUJ51khcjGJrUx909CbS9Tk5vV6QdiaYE5XyM0/exec',
  /* 백엔드 Script Properties에 TEAM_CODE를 설정한 경우 동일 값 기입 */
  code: '',
  giscus: {
    repo: 'hyunwoong-web/hyunwoong-slides',
    repoId: 'R_kgDOTYCYnQ',
    category: 'Announcements',
    categoryId: 'DIC_kwDOTYCYnc4DB1mY',
  },
};
/* 테스트용 오버라이드: localStorage.setItem('cmt-endpoint', 'https://…/exec') */
const ENDPOINT = localStorage.getItem('cmt-endpoint') || CONFIG.endpoint;

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
.cmt-head{display:flex;align-items:center;gap:8px;padding:16px 18px 10px}
.cmt-head h3{font-size:16px;font-weight:700;color:#111;margin:0;flex:1}
.cmt-head button{border:0;background:none;font-size:16px;line-height:1;color:#888;cursor:pointer;padding:2px 6px}
.cmt-head button:hover{color:#111}
#cmt-close{font-size:22px}
.cmt-tabs{display:flex;gap:8px;padding:0 18px 12px}
.cmt-tab{flex:1;padding:9px 10px;border-radius:9px;border:1.5px solid rgba(30,43,250,.22);background:#fff;
  color:#555;font:600 12.5px 'Pretendard',sans-serif;cursor:pointer;transition:all .12s}
.cmt-tab.on{background:rgba(30,43,250,.08);color:#1e2bfa;border-color:#1e2bfa}
#cmt-body{flex:1;overflow-y:auto;padding:4px 16px 20px}
.cmt-hint{padding:9px 18px 13px;font-size:11.5px;line-height:1.55;color:#999;border-top:1px solid #eee}
.cmt-hint b{color:#666}
/* composer */
.cmt-composer{border:1.5px solid rgba(30,43,250,.22);border-radius:12px;padding:10px;margin:2px 0 14px;background:#fafaff}
.cmt-composer select{width:100%;padding:7px 8px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;
  font:500 13px 'Pretendard',sans-serif;color:#333;background:#fff}
.cmt-ta-wrap{position:relative}
.cmt-composer textarea{width:100%;min-height:66px;padding:8px 9px;border:1px solid #ddd;border-radius:8px;
  font:400 13.5px/1.55 'Pretendard',sans-serif;resize:vertical;box-sizing:border-box}
.cmt-composer textarea:focus,.cmt-composer select:focus{outline:none;border-color:#1e2bfa}
.cmt-ac{position:absolute;left:0;right:0;top:100%;z-index:5;background:#fff;border:1px solid #ddd;border-radius:8px;
  box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:180px;overflow-y:auto}
.cmt-ac div{padding:8px 12px;font-size:13px;cursor:pointer}
.cmt-ac div:hover,.cmt-ac div.sel{background:rgba(30,43,250,.08);color:#1e2bfa}
.cmt-reply-chip{display:none;align-items:center;gap:6px;font-size:12px;color:#1e2bfa;margin-bottom:8px}
.cmt-reply-chip.on{display:flex}
.cmt-reply-chip button{border:0;background:none;color:#999;cursor:pointer;font-size:14px;padding:0 2px}
#cmt-anchor{display:none;align-items:flex-start;gap:6px;font-size:12px;color:#1e2bfa;margin-bottom:8px;
  background:rgba(30,43,250,.06);border-radius:8px;padding:7px 9px;line-height:1.5}
#cmt-anchor.on{display:flex}
#cmt-anchor .q{color:#555;font-style:italic;word-break:break-word}
#cmt-anchor button{border:0;background:none;color:#999;cursor:pointer;font-size:14px;padding:0 2px;flex:none}
.cmt-send-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px}
#cmt-pin-btn{border:1px solid rgba(30,43,250,.3);background:#fff;color:#1e2bfa;padding:7px 12px;border-radius:8px;
  font:600 12px 'Pretendard',sans-serif;cursor:pointer}
#cmt-pin-btn:hover{background:rgba(30,43,250,.06)}
#cmt-send{border:0;background:#1e2bfa;color:#fff;padding:8px 18px;border-radius:8px;
  font:600 13px 'Pretendard',sans-serif;cursor:pointer;margin-left:auto}
#cmt-send:disabled{background:#c5c9f5;cursor:default}
#cmt-err{color:#d6336c;font-size:12px;margin-top:6px;display:none}
/* list */
.cmt-item{display:flex;gap:10px;padding:10px 2px;border-radius:10px;transition:background .4s}
.cmt-item.flash{background:rgba(30,43,250,.1)}
.cmt-item.reply{margin-left:34px;padding-top:2px}
.cmt-av{flex:none;width:30px;height:30px;border-radius:50%;background:rgba(30,43,250,.12);color:#1e2bfa;
  display:flex;align-items:center;justify-content:center;font:700 13px 'Pretendard',sans-serif}
.cmt-c{flex:1;min-width:0}
.cmt-meta{display:flex;align-items:baseline;gap:8px}
.cmt-meta .nm{font-weight:700;font-size:13px;color:#111}
.cmt-meta .tm{font-size:11px;color:#aaa}
.cmt-pin-badge{font-size:11px;color:#fff;background:#1e2bfa;border-radius:100px;padding:1px 7px;font-weight:700;cursor:pointer}
.cmt-q{border-left:3px solid rgba(30,43,250,.4);background:rgba(30,43,250,.05);color:#555;font-size:12.5px;
  font-style:italic;padding:5px 9px;border-radius:0 6px 6px 0;margin:4px 0 2px;word-break:break-word}
.cmt-txt{font-size:13.5px;line-height:1.6;color:#333;margin-top:2px;word-break:break-word;white-space:pre-wrap}
.cmt-txt .cmt-m{color:#1e2bfa;font-weight:600}
.cmt-actions{margin-top:3px}
.cmt-actions button{border:0;background:none;color:#999;font-size:11.5px;cursor:pointer;padding:0}
.cmt-actions button:hover{color:#1e2bfa}
.cmt-empty,.cmt-load{color:#aaa;font-size:13px;text-align:center;padding:26px 0}
.cmt-thread{border-bottom:1px solid #f2f2f2}
/* 슬라이드 위 핀 */
.cmt-pinlayer{position:absolute;inset:0;pointer-events:none;z-index:80}
.cmt-pin{position:absolute;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;
  width:34px;height:34px;border-radius:50% 50% 50% 4px;background:#1e2bfa;color:#fff;border:2.5px solid #fff;
  display:flex;align-items:center;justify-content:center;font:700 14px 'Pretendard',sans-serif;
  box-shadow:0 3px 10px rgba(0,0,0,.28)}
.cmt-pin:hover{background:#0f1ac9}
/* 선택 팝오버 + 토스트 */
#cmt-selpop{position:fixed;z-index:99993;display:none;border:0;background:#1e2bfa;color:#fff;
  padding:7px 13px;border-radius:100px;font:600 12.5px 'Pretendard',sans-serif;cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.25)}
#cmt-toast{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:99993;display:none;
  background:#111;color:#fff;padding:10px 20px;border-radius:100px;font:500 13px 'Pretendard',sans-serif;
  box-shadow:0 6px 18px rgba(0,0,0,.3)}
body.cmt-picking, body.cmt-picking *{cursor:crosshair !important}
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
  <div class="cmt-head"><h3>💬 댓글 · 논의</h3>
    <button id="cmt-refresh" type="button" title="새로고침">↻</button>
    <button id="cmt-close" type="button" title="닫기 (Esc)">×</button></div>
  <div class="cmt-tabs">
    <button class="cmt-tab on" id="cmt-tab-deck" type="button">덱 전체</button>
    <button class="cmt-tab" id="cmt-tab-slide" type="button">이 슬라이드 (p.1)</button>
  </div>
  <div id="cmt-body"></div>
  <div class="cmt-hint" id="cmt-hint"></div>`;

const selpop = document.createElement('button');
selpop.id = 'cmt-selpop';
selpop.type = 'button';
selpop.textContent = '💬 이 내용에 댓글';

const toast = document.createElement('div');
toast.id = 'cmt-toast';

document.body.appendChild(fab);
document.body.appendChild(panel);
document.body.appendChild(selpop);
document.body.appendChild(toast);

const body = panel.querySelector('#cmt-body');
const hint = panel.querySelector('#cmt-hint');
const tabDeck = panel.querySelector('#cmt-tab-deck');
const tabSlide = panel.querySelector('#cmt-tab-slide');

/* 패널 안 키·휠 입력이 아래 덱 내비(Space/화살표/휠)로 새지 않도록 차단 */
for (const ev of ['keydown', 'keyup', 'keypress', 'wheel']) {
  panel.addEventListener(ev, (e) => {
    if (ev === 'keydown' && e.key === 'Escape') closePanel();
    e.stopPropagation();
  });
}

/* ---------- 공통 상태 ---------- */
let mode = 'deck';       // 'deck' | 'slide'
let isOpen = false;
let loadedTerm = null;

const curSlide = () => {
  const n = parseInt((location.hash || '').slice(1), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};
const term = () => mode === 'deck'
  ? `[${slug}] 덱 전체 논의`
  : `[${slug}] p.${String(curSlide()).padStart(2, '0')}`;
const activeSlideEl = () => document.querySelector('.slide.active');

/* ================= 팀 댓글 모드 ================= */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let roster = [];         // 이름 목록 (이메일은 서버에만 있음)
let items = [];
let replyTo = null;      // {id, author}
let mentionRe = null;
let draftText = '';      // 탭 전환·재렌더에도 입력 보존
let anchorDraft = null;  // {x, y, quote, term} — 작성 중인 핀/인용
let pinPicking = false;

function fmtTime(iso) {
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  const y = d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear() + '.';
  return `${y}${d.getMonth() + 1}.${d.getDate()}`;
}
function renderText(t) {
  let h = esc(t);
  if (mentionRe) h = h.replace(mentionRe, '<span class="cmt-m">@$1</span>');
  return h;
}

async function api(params, post) {
  const url = ENDPOINT + (post ? '' : '?' + new URLSearchParams(params));
  const res = await fetch(url, post
    ? { method: 'POST', body: JSON.stringify(params) }   // text/plain → 프리플라이트 없음
    : undefined);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || '요청 실패');
  return j;
}

function composerHTML() {
  const opts = roster.map((n) => `<option${localStorage.getItem('cmt-author') === n ? ' selected' : ''}>${esc(n)}</option>`).join('');
  return `<div class="cmt-composer">
    <div class="cmt-reply-chip" id="cmt-chip">↩ <b id="cmt-chip-nm"></b>님에게 답글 <button id="cmt-chip-x" type="button" title="답글 취소">×</button></div>
    <div id="cmt-anchor"></div>
    <select id="cmt-author"><option value="">이름 선택…</option>${opts}</select>
    <div class="cmt-ta-wrap">
      <textarea id="cmt-ta" placeholder="댓글 입력 — @이름 을 쓰면 이메일로 알림이 갑니다">${esc(draftText)}</textarea>
      <div class="cmt-ac" id="cmt-ac" hidden></div>
    </div>
    <div class="cmt-send-row">
      <button id="cmt-pin-btn" type="button" title="슬라이드의 특정 지점에 핀을 찍고 댓글 달기">📍 위치 지정</button>
      <button id="cmt-send" type="button">등록</button>
    </div>
    <div id="cmt-err"></div>
  </div>
  <div id="cmt-list"></div>`;
}

function updateAnchorChip() {
  const el = body.querySelector('#cmt-anchor');
  if (!el) return;
  if (anchorDraft && anchorDraft.term === term()) {
    el.innerHTML = `<span>📍 p.${curSlide()} 위치 지정됨${anchorDraft.quote
      ? ` — <span class="q">"${esc(anchorDraft.quote.slice(0, 80))}${anchorDraft.quote.length > 80 ? '…' : ''}"</span>` : ''}</span>
      <button type="button" id="cmt-anchor-x" title="위치 지정 해제">×</button>`;
    el.classList.add('on');
    el.querySelector('#cmt-anchor-x').addEventListener('click', () => { anchorDraft = null; updateAnchorChip(); renderPins(); });
  } else {
    el.classList.remove('on');
    el.innerHTML = '';
  }
}

/* 핀 번호: 앵커 있는 루트 댓글, 오래된 순으로 1번부터 */
function pinMap() {
  const map = {};
  items.filter((c) => !c.parentId && c.anchor)
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .forEach((c, i) => { map[c.id] = i + 1; });
  return map;
}

function renderPins() {
  document.querySelectorAll('.cmt-pinlayer').forEach((l) => l.remove());
  if (!ENDPOINT || !isOpen || mode !== 'slide') return;
  const slide = activeSlideEl();
  if (!slide) return;
  if (getComputedStyle(slide).position === 'static') slide.style.position = 'relative';
  const layer = document.createElement('div');
  layer.className = 'cmt-pinlayer';
  const map = pinMap();
  for (const c of items) {
    const n = map[c.id];
    if (!n) continue;
    const pin = document.createElement('div');
    pin.className = 'cmt-pin';
    pin.style.left = c.anchor.x + '%';
    pin.style.top = c.anchor.y + '%';
    pin.textContent = n;
    pin.title = `${c.author}: ${c.text.slice(0, 60)}`;
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      focusComment(c.id);
    });
    layer.appendChild(pin);
  }
  /* 작성 중인 핀 미리보기 */
  if (anchorDraft && anchorDraft.term === term()) {
    const pv = document.createElement('div');
    pv.className = 'cmt-pin';
    pv.style.left = anchorDraft.x + '%';
    pv.style.top = anchorDraft.y + '%';
    pv.style.background = '#d6336c';
    pv.textContent = '+';
    pv.title = '작성 중인 댓글 위치';
    layer.appendChild(pv);
  }
  slide.appendChild(layer);
}

function focusComment(id) {
  const el = body.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1200);
}

function renderList() {
  const list = body.querySelector('#cmt-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="cmt-empty">아직 댓글이 없습니다 — 첫 의견을 남겨보세요.</div>';
    renderPins();
    return;
  }
  const roots = items.filter((c) => !c.parentId).sort((a, b) => b.ts.localeCompare(a.ts));
  const kids = {};
  items.filter((c) => c.parentId).sort((a, b) => a.ts.localeCompare(b.ts))
    .forEach((c) => (kids[c.parentId] = kids[c.parentId] || []).push(c));
  const map = pinMap();
  const node = (c, reply) => `<div class="cmt-item${reply ? ' reply' : ''}" data-id="${c.id}">
    <div class="cmt-av">${esc(c.author.charAt(0))}</div>
    <div class="cmt-c"><div class="cmt-meta"><span class="nm">${esc(c.author)}</span><span class="tm">${fmtTime(c.ts)}</span>${
      map[c.id] ? `<span class="cmt-pin-badge" data-pin="${c.id}" title="슬라이드에서 위치 보기">📍${map[c.id]}</span>` : ''}</div>
    ${c.quote ? `<div class="cmt-q">"${esc(c.quote)}"</div>` : ''}
    <div class="cmt-txt">${renderText(c.text)}</div>
    ${reply ? '' : `<div class="cmt-actions"><button type="button" data-reply="${c.id}" data-author="${esc(c.author)}">답글</button></div>`}</div></div>`;
  list.innerHTML = roots.map((r) =>
    `<div class="cmt-thread">${node(r, false)}${(kids[r.id] || []).map((k) => node(k, true)).join('')}</div>`).join('');
  list.querySelectorAll('[data-reply]').forEach((b) => b.addEventListener('click', () => {
    replyTo = { id: b.dataset.reply, author: b.dataset.author };
    const chip = body.querySelector('#cmt-chip');
    chip.classList.add('on');
    body.querySelector('#cmt-chip-nm').textContent = replyTo.author;
    const ta = body.querySelector('#cmt-ta');
    if (!ta.value.includes('@' + replyTo.author)) { ta.value = `@${replyTo.author} ` + ta.value; draftText = ta.value; }
    body.scrollTop = 0; ta.focus();
  }));
  list.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', () => {
    const c = items.find((i) => i.id === b.dataset.pin);
    if (!c) return;
    const layerPin = [...document.querySelectorAll('.cmt-pin')].find((p) => p.textContent === String(pinMap()[c.id]));
    if (layerPin) {
      layerPin.style.transition = 'transform .18s';
      layerPin.style.transform = 'translate(-50%,-100%) scale(1.45)';
      setTimeout(() => { layerPin.style.transform = 'translate(-50%,-100%)'; }, 500);
    }
  }));
  renderPins();
}

function showErr(msg) {
  const el = body.querySelector('#cmt-err');
  if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function bindComposer() {
  const ta = body.querySelector('#cmt-ta');
  const ac = body.querySelector('#cmt-ac');
  const sel = body.querySelector('#cmt-author');
  const send = body.querySelector('#cmt-send');
  body.querySelector('#cmt-chip-x').addEventListener('click', () => {
    replyTo = null; body.querySelector('#cmt-chip').classList.remove('on');
  });
  body.querySelector('#cmt-pin-btn').addEventListener('click', startPinPick);
  sel.addEventListener('change', () => localStorage.setItem('cmt-author', sel.value));
  updateAnchorChip();

  /* @자동완성 */
  const closeAc = () => { ac.hidden = true; };
  const token = () => {
    const m = ta.value.slice(0, ta.selectionStart).match(/@([가-힣a-zA-Z]{0,10})$/);
    return m ? m[1] : null;
  };
  const pick = (name) => {
    const pos = ta.selectionStart, t = token();
    if (t === null) return closeAc();
    ta.value = ta.value.slice(0, pos - t.length) + name + ' ' + ta.value.slice(pos);
    draftText = ta.value;
    const np = pos - t.length + name.length + 1;
    ta.setSelectionRange(np, np); ta.focus(); closeAc();
  };
  ta.addEventListener('input', () => {
    draftText = ta.value;
    const t = token();
    if (t === null) return closeAc();
    const found = roster.filter((n) => n.startsWith(t));
    if (!found.length) return closeAc();
    ac.innerHTML = found.map((n, i) => `<div${i === 0 ? ' class="sel"' : ''} data-n="${esc(n)}">@${esc(n)}</div>`).join('');
    ac.hidden = false;
    ac.querySelectorAll('[data-n]').forEach((d) => d.addEventListener('mousedown', (e) => { e.preventDefault(); pick(d.dataset.n); }));
  });
  ta.addEventListener('keydown', (e) => {
    if (ac.hidden) return;
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(ac.querySelector('.sel').dataset.n); }
    else if (e.key === 'Escape') { e.stopPropagation(); closeAc(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const all = [...ac.children], i = all.findIndex((d) => d.classList.contains('sel'));
      all[i].classList.remove('sel');
      all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length].classList.add('sel');
    }
  });
  ta.addEventListener('blur', () => setTimeout(closeAc, 150));

  send.addEventListener('click', async () => {
    const author = sel.value, text = ta.value.trim();
    if (!author) return showErr('이름을 먼저 선택해 주세요.');
    if (!text) return showErr('내용을 입력해 주세요.');
    send.disabled = true; showErr('');
    const anchored = anchorDraft && anchorDraft.term === term();
    try {
      const j = await api({ action: 'add', deck: slug, term: term(), author, text,
        parentId: replyTo ? replyTo.id : '',
        anchor: anchored ? { x: anchorDraft.x, y: anchorDraft.y } : null,
        quote: anchored ? (anchorDraft.quote || '') : '',
        code: CONFIG.code }, true);
      items.push(j.item);
      ta.value = ''; draftText = ''; replyTo = null; anchorDraft = null;
      body.querySelector('#cmt-chip').classList.remove('on');
      updateAnchorChip();
      renderList();
    } catch (e) { showErr(e.message); }
    send.disabled = false;
  });
}

async function loadTeam(force) {
  const t = term();
  if (!force && t === loadedTerm) return;
  loadedTerm = t;
  body.innerHTML = '<div class="cmt-load">불러오는 중…</div>';
  try {
    const j = await api({ action: 'list', deck: slug, term: t });
    roster = j.names || [];
    mentionRe = roster.length ? new RegExp('@(' + roster.map(escRe).join('|') + ')', 'g') : null;
    items = j.items || [];
    replyTo = null;
    body.innerHTML = composerHTML();
    bindComposer();
    renderList();
  } catch (e) {
    loadedTerm = null;
    body.innerHTML = `<div class="cmt-empty">댓글을 불러오지 못했습니다.<br>${esc(e.message)}<br><br>
      <button type="button" id="cmt-retry" style="border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 16px;cursor:pointer">다시 시도</button></div>`;
    body.querySelector('#cmt-retry').addEventListener('click', () => loadTeam(true));
  }
}

/* ---------- 핀 찍기 (Figma 스타일) ---------- */
function showToast(msg) { toast.textContent = msg; toast.style.display = 'block'; }
function hideToast() { toast.style.display = 'none'; }

function startPinPick() {
  if (mode !== 'slide') setMode('slide');
  pinPicking = true;
  document.body.classList.add('cmt-picking');
  showToast('📍 핀을 찍을 위치를 슬라이드에서 클릭하세요 (Esc 취소)');
}
function endPinPick() {
  pinPicking = false;
  document.body.classList.remove('cmt-picking');
  hideToast();
}
document.addEventListener('click', (e) => {
  if (!pinPicking) return;
  if (panel.contains(e.target) || e.target === fab) return; // 패널 조작은 허용
  e.preventDefault(); e.stopPropagation();
  const slide = activeSlideEl();
  if (!slide) { endPinPick(); return; }
  const r = slide.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) { endPinPick(); return; } // 슬라이드 밖 클릭 → 취소
  anchorDraft = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, quote: '', term: term() };
  endPinPick();
  updateAnchorChip();
  renderPins();
  const ta = body.querySelector('#cmt-ta');
  if (ta) ta.focus();
}, true);

/* ---------- 텍스트 드래그 → 인용 댓글 (구글 문서 스타일) ---------- */
document.addEventListener('mouseup', (e) => {
  if (!ENDPOINT || pinPicking) return;
  if (panel.contains(e.target) || e.target === selpop) return;
  setTimeout(() => {
    const s = window.getSelection();
    const text = s ? String(s).trim() : '';
    const slide = activeSlideEl();
    if (!text || text.length < 2 || !slide || s.rangeCount === 0
        || !slide.contains(s.getRangeAt(0).commonAncestorContainer)) {
      selpop.style.display = 'none';
      return;
    }
    selpop.style.display = 'block';
    selpop.style.left = Math.min(e.clientX, innerWidth - 150) + 'px';
    selpop.style.top = Math.max(8, e.clientY - 44) + 'px';
    selpop.dataset.quote = text.slice(0, 300);
    const rect = s.getRangeAt(0).getBoundingClientRect();
    const r = slide.getBoundingClientRect();
    selpop.dataset.x = String(Math.round(((rect.left + rect.width / 2 - r.left) / r.width) * 1000) / 10);
    selpop.dataset.y = String(Math.round(((rect.top + rect.height / 2 - r.top) / r.height) * 1000) / 10);
  }, 0);
});
document.addEventListener('mousedown', (e) => {
  if (e.target !== selpop) selpop.style.display = 'none';
});
selpop.addEventListener('mousedown', (e) => e.preventDefault());
selpop.addEventListener('click', () => {
  anchorDraft = {
    x: Number(selpop.dataset.x), y: Number(selpop.dataset.y),
    quote: selpop.dataset.quote, term: null,             // term은 slide 모드 확정 후 기록
  };
  selpop.style.display = 'none';
  window.getSelection().removeAllRanges();
  if (!isOpen) openPanel();
  if (mode !== 'slide') setMode('slide'); else { anchorDraft.term = term(); updateAnchorChip(); renderPins(); }
  anchorDraft.term = term();
  setTimeout(() => {
    updateAnchorChip(); renderPins();
    const ta = body.querySelector('#cmt-ta');
    if (ta) ta.focus();
  }, 350);
});

/* ================= giscus 폴백 (endpoint 미설정 시) ================= */
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
  const g = CONFIG.giscus;
  const attrs = {
    'data-repo': g.repo, 'data-repo-id': g.repoId,
    'data-category': g.category, 'data-category-id': g.categoryId,
    'data-mapping': 'specific', 'data-term': t, 'data-strict': '1',
    'data-reactions-enabled': '1', 'data-emit-metadata': '0',
    'data-input-position': 'top', 'data-theme': 'light', 'data-lang': 'ko', 'data-loading': 'eager',
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  body.appendChild(s);
}

/* ================= 공통 동작 ================= */
const load = (force) => (ENDPOINT ? loadTeam(force) : loadGiscus());
hint.innerHTML = ENDPOINT
  ? '이름을 선택해 바로 댓글을 남길 수 있어요. <b>@이름</b> 멘션 시 이메일 알림. <b>📍 위치 지정</b>이나 <b>슬라이드 텍스트 드래그</b>로 특정 내용에 댓글을 달 수 있습니다.'
  : '<b>GitHub 계정</b>으로 로그인하면 댓글·답글·이모지 반응을 남길 수 있어요. 스레드는 저장소 <b>Discussions</b>에 저장됩니다.';

/* 슬라이드 전환 감지 (replaceState 래핑 + hashchange, 디바운스) */
let reloadTimer = null;
function onSlideChange() {
  tabSlide.textContent = `이 슬라이드 (p.${curSlide()})`;
  document.querySelectorAll('.cmt-pinlayer').forEach((l) => l.remove());
  if (isOpen && mode === 'slide') {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => load(), 450);
  }
}
const origReplace = history.replaceState.bind(history);
history.replaceState = function (...a) { origReplace(...a); onSlideChange(); };
window.addEventListener('hashchange', onSlideChange);
onSlideChange();

function openPanel() { isOpen = true; panel.classList.add('open'); load(); }
function closePanel() {
  if (pinPicking) { endPinPick(); return; }
  isOpen = false; panel.classList.remove('open');
  document.querySelectorAll('.cmt-pinlayer').forEach((l) => l.remove());
  if (panel.contains(document.activeElement)) document.activeElement.blur();
}
fab.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
panel.querySelector('#cmt-close').addEventListener('click', closePanel);
panel.querySelector('#cmt-refresh').addEventListener('click', () => load(true));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (pinPicking) { endPinPick(); return; }
  if (isOpen) closePanel();
});

function setMode(m) {
  mode = m;
  tabDeck.classList.toggle('on', m === 'deck');
  tabSlide.classList.toggle('on', m === 'slide');
  if (isOpen) load();
  if (m === 'deck') document.querySelectorAll('.cmt-pinlayer').forEach((l) => l.remove());
}
tabDeck.addEventListener('click', () => setMode('deck'));
tabSlide.addEventListener('click', () => setMode('slide'));

/* 이메일 링크로 진입: ?cmt=deck|slide → 패널 자동 열기 */
const q = new URLSearchParams(location.search).get('cmt');
if (q) { setMode(q === 'slide' ? 'slide' : 'deck'); openPanel(); }
})();
