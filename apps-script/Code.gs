/** hyunwoong-slides 팀 댓글 백엔드 — Google Apps Script
 *
 * [배포 방법]
 * 1. script.google.com → 새 프로젝트 → 이 파일 내용 붙여넣기
 * 2. 프로젝트 설정(⚙) → 스크립트 속성 → ROSTER_JSON 추가:
 *    {"이름":"이메일", ...}  ← 팀원 명단 (여기에만 저장, 공개 리포에 노출 안 됨)
 *    (선택) TEAM_CODE: 설정하면 프런트 CONFIG.code와 일치해야 등록 가능
 * 3. 배포 → 새 배포 → 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 → 배포
 * 4. 웹 앱 URL(…/exec)을 assets/comments.js의 CONFIG.endpoint에 기입
 *
 * 저장: Google Sheet 자동 생성 (최초 요청 시 'hyunwoong-slides 댓글')
 * 알림: @이름 멘션 + 답글의 원 댓글 작성자에게 MailApp으로 발송 (본인 제외)
 */

var SITE = 'https://hyunwoong-web.github.io/hyunwoong-slides';

function props() { return PropertiesService.getScriptProperties(); }
function roster() {
  try { return JSON.parse(props().getProperty('ROSTER_JSON') || '{}'); }
  catch (e) { return {}; }
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet() {
  var p = props(), id = p.getProperty('SHEET_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('hyunwoong-slides 댓글'); p.setProperty('SHEET_ID', ss.getId()); }
  var sh = ss.getSheetByName('comments');
  if (!sh) {
    sh = ss.getSheets()[0].getName() === 'comments' ? ss.getSheets()[0] : ss.insertSheet('comments');
    if (sh.getLastRow() === 0) sh.appendRow(['id', 'ts', 'deck', 'term', 'parentId', 'author', 'text']);
  }
  return sh;
}

function doGet(e) {
  var a = (e.parameter.action || '');
  if (a === 'list') {
    var deck = e.parameter.deck || '', t = e.parameter.term || '';
    var all = e.parameter.all === '1';   /* all=1 → 덱의 모든 스레드 모아보기 */
    var rows = sheet().getDataRange().getValues().slice(1);
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][2] === deck && (all || rows[i][3] === t)) {
        var anch = null;
        try { anch = rows[i][7] ? JSON.parse(rows[i][7]) : null; } catch (ig) { anch = null; }
        items.push({ id: rows[i][0], ts: rows[i][1], term: rows[i][3], parentId: rows[i][4] || null,
                     author: rows[i][5], text: rows[i][6],
                     anchor: anch, quote: rows[i][8] || '', edited: !!rows[i][9] });
      }
    }
    return json({ ok: true, items: items, names: Object.keys(roster()) });
  }
  return json({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, error: '잘못된 요청 형식' }); }

  var teamCode = props().getProperty('TEAM_CODE');
  if (teamCode && b.code !== teamCode) return json({ ok: false, error: '인증 코드가 올바르지 않습니다' });

  if (b.action === 'edit') return editComment(b);
  if (b.action === 'del') return delComment(b);
  if (b.action !== 'add') return json({ ok: false, error: 'unknown action' });

  var R = roster();
  var author = String(b.author || '').trim();
  if (!R[author]) return json({ ok: false, error: '등록된 팀원 이름이 아닙니다' });
  var text = String(b.text || '').trim().slice(0, 4000);
  if (!text) return json({ ok: false, error: '내용이 비었습니다' });
  var deck = String(b.deck || '').slice(0, 100);
  var termStr = String(b.term || '').slice(0, 200);
  var parentId = String(b.parentId || '');
  /* 핀 앵커(슬라이드 내 위치 %)와 인용문 — 선택 사항 */
  var anchor = null;
  if (b.anchor && isFinite(b.anchor.x) && isFinite(b.anchor.y)) {
    anchor = { x: Math.max(0, Math.min(100, Number(b.anchor.x))),
               y: Math.max(0, Math.min(100, Number(b.anchor.y))) };
  }
  var quote = String(b.quote || '').trim().slice(0, 300);
  var id = Utilities.getUuid();
  var ts = new Date().toISOString();

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var parentAuthor = null;
  try {
    var sh = sheet();
    if (parentId) {
      var rows = sh.getDataRange().getValues().slice(1);
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] === parentId) { parentAuthor = rows[i][5]; break; }
      }
    }
    sh.appendRow([id, ts, deck, termStr, parentId, author, text,
                  anchor ? JSON.stringify(anchor) : '', quote]);
  } finally { lock.releaseLock(); }

  /* 알림 수신자: @멘션된 팀원 + 답글의 원 댓글 작성자 (본인 제외) */
  var to = {};
  for (var name in R) if (text.indexOf('@' + name) !== -1) to[name] = true;
  if (parentAuthor && R[parentAuthor]) to[parentAuthor] = true;
  delete to[author];

  var m = termStr.match(/p\.(\d+)/);
  var link = SITE + '/decks/' + deck + '/' + (m ? '?cmt=slide#' + Number(m[1]) : '?cmt=deck');
  var where = m ? deck + ' 덱 ' + Number(m[1]) + 'p' : deck + ' 덱 전체';
  var notified = [];
  for (var nm in to) {
    try {
      var mentioned = text.indexOf('@' + nm) !== -1;
      MailApp.sendEmail({
        to: R[nm],
        subject: '[슬라이드 댓글] ' + author + '님이 ' +
          (mentioned ? '회원님을 언급했습니다' : '회원님 댓글에 답글을 남겼습니다') + ' — ' + where,
        body: nm + '님, 안녕하세요.\n\n' +
          author + '님이 ' + where + '에 남긴 댓글:\n\n' +
          (quote ? '인용한 내용: "' + quote + '"\n\n' : '') +
          '───────────────────────\n' + text + '\n───────────────────────\n\n' +
          '바로 보기: ' + link + '\n\n' +
          '(hyunwoong-slides 댓글 알림 · 회신은 위 링크에서)',
      });
      notified.push(nm);
    } catch (err) { /* 개별 발송 실패는 무시 */ }
  }
  return json({ ok: true, item: { id: id, ts: ts, term: termStr, parentId: parentId || null, author: author,
                                  text: text, anchor: anchor, quote: quote },
                notified: notified });
}

/* 수정: 작성자 본인만 (이름 일치 검증). editedTs를 J열에 기록 → "(수정됨)" 표시 */
function editComment(b) {
  var author = String(b.author || '').trim();
  if (!roster()[author]) return json({ ok: false, error: '등록된 팀원 이름이 아닙니다' });
  var id = String(b.id || '');
  var text = String(b.text || '').trim().slice(0, 4000);
  if (!id || !text) return json({ ok: false, error: '내용이 비었습니다' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet();
    var rows = sh.getDataRange().getValues().slice(1);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0] === id) {
        if (rows[i][5] !== author) return json({ ok: false, error: '본인이 작성한 댓글만 수정할 수 있습니다' });
        sh.getRange(i + 2, 7).setValue(text);
        sh.getRange(i + 2, 10).setValue(new Date().toISOString());
        return json({ ok: true, id: id, text: text });
      }
    }
    return json({ ok: false, error: '댓글을 찾을 수 없습니다' });
  } finally { lock.releaseLock(); }
}

/* 삭제: 작성자 본인만. 루트 댓글이면 달린 답글도 함께 삭제 */
function delComment(b) {
  var author = String(b.author || '').trim();
  if (!roster()[author]) return json({ ok: false, error: '등록된 팀원 이름이 아닙니다' });
  var id = String(b.id || '');
  if (!id) return json({ ok: false, error: '대상이 없습니다' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet();
    var rows = sh.getDataRange().getValues().slice(1);
    var target = null;
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) { target = i; break; }
    if (target === null) return json({ ok: false, error: '댓글을 찾을 수 없습니다' });
    if (rows[target][5] !== author) return json({ ok: false, error: '본인이 작성한 댓글만 삭제할 수 있습니다' });

    var doomed = [target];                       /* 시트 인덱스(0-based, 헤더 제외) */
    var removedIds = [id];
    for (var k = 0; k < rows.length; k++) {
      if (rows[k][4] === id) { doomed.push(k); removedIds.push(rows[k][0]); }
    }
    doomed.sort(function (a, c) { return c - a; });   /* 아래쪽부터 삭제해야 인덱스 안 밀림 */
    for (var d = 0; d < doomed.length; d++) sh.deleteRow(doomed[d] + 2);
    return json({ ok: true, removed: removedIds });
  } finally { lock.releaseLock(); }
}
