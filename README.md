# hyunwoong-slides

박현웅 발표 자료 모음 — GitHub Pages로 서빙되는 HTML 슬라이드 덱.

**메인(덱 목록)**: https://hyunwoong-web.github.io/hyunwoong-slides/

## 구조

```
index.html          ← 랜딩 페이지 (decks.json을 읽어 덱 목록 자동 렌더링)
decks.json          ← 덱 목록 매니페스트
decks/
  <slug>/
    index.html      ← 슬라이드 덱 본체 (단일 HTML)
    ...             ← 차트 등 부속 파일
assets/
  comments.js       ← 전 덱 공용 댓글 위젯 (팀 댓글 + giscus 폴백)
apps-script/
  Code.gs           ← 팀 댓글 백엔드 (Google Apps Script — 저장·@멘션 메일 발송)
.github/workflows/
  mention-notify.yml ← giscus(Discussions) 댓글 @멘션 → 이메일 알림 발송
```

## 새 덱 추가하는 법

1. `decks/<새-슬러그>/index.html` 로 덱 폴더 추가 (슬러그는 영문-하이픈)
2. `decks.json`의 `decks` 배열에 항목 1개 추가:

```json
{
  "slug": "새-슬러그",
  "title": "덱 제목",
  "desc": "한 줄 설명",
  "date": "YYYY-MM-DD",
  "tags": ["태그"],
  "extras": [{ "label": "부속 자료명", "path": "파일명.html" }]
}
```

3. commit & push — 메인 목록에 자동 반영 (날짜 내림차순 정렬)

## 조작

덱 안에서: ← → / Space / PgUp·PgDn / Home·End · 전체화면(F11) 권장

## 댓글 (팀 댓글 + @멘션 이메일 알림)

모든 덱 우상단 **💬 댓글** 버튼 → 사이드 패널. **덱 전체** / **이 슬라이드 (p.N)** 두 스코프(슬라이드별 스레드는 URL 해시 `#N`에 앵커).

### 팀 댓글 모드 (기본)

GitHub 로그인 없이 이름 선택 후 바로 작성. `@이름` 입력 시 자동완성되고, 멘션된 팀원과 답글의 원 댓글 작성자에게 **이메일 알림**이 발송됩니다(구글 문서 댓글과 동일한 UX).

- 백엔드: `apps-script/Code.gs` (Google Apps Script 웹앱 — 파일 상단에 배포 방법 주석)
- 저장: Google Sheet 자동 생성 / 메일: MailApp
- **팀원 명단(이름→이메일)은 Apps Script 스크립트 속성 `ROSTER_JSON`에만 저장** — 공개 리포·사이트에 이메일 미노출
- 배포한 웹앱 URL(`…/exec`)을 `assets/comments.js`의 `CONFIG.endpoint`에 기입하면 활성화
- (선택) 스크립트 속성 `TEAM_CODE` 설정 시 프런트 `CONFIG.code`와 일치해야 등록 가능 (외부인 등록 차단)

### giscus 폴백

`CONFIG.endpoint`가 비어 있으면 GitHub Discussions(giscus, Announcements 카테고리) 위젯으로 동작. giscus 앱 설치 완료 상태.

새 덱을 추가하면 `index.html` 끝에 한 줄만 넣으면 됩니다:
`<script defer src="../../assets/comments.js"></script>`

### giscus 경로의 @멘션 알림 (mention-notify.yml)

giscus 폴백으로 달린 Discussions 댓글에 `@이름`이 포함되면 Actions 워크플로가 이메일을 발송합니다.

- 이름→이메일 매핑: 저장소 **Variable `MENTIONS_JSON`** (설정 완료 — 공개 리포에 이메일을 커밋하지 않기 위해 Variable 사용)
- 발송 SMTP: Secrets `MAIL_USERNAME` / `MAIL_PASSWORD` (Google Workspace 앱 비밀번호) — **미설정 시 이 경로만 비활성**
- 팀 댓글 모드의 메일 발송은 Apps Script(MailApp)가 담당하므로 SMTP 설정과 무관하게 동작
