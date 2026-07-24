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
  comments.js       ← 전 덱 공용 댓글 위젯 (GitHub Discussions/giscus 기반)
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

## 댓글 (giscus)

모든 덱 우상단 **💬 댓글** 버튼 → 사이드 패널에서 GitHub 계정으로 댓글·답글·이모지 반응.

- **덱 전체** / **이 슬라이드 (p.N)** 두 스코프 — 슬라이드별 스레드는 URL 해시(#N)에 앵커됨
- 스레드는 이 저장소의 **Discussions** (Announcements 카테고리)에 저장 — 첫 댓글 시 giscus 앱이 스레드 자동 생성
- 설정(repo ID·category ID 등)은 `assets/comments.js`의 `GISCUS` 상수 한 곳에서 관리
- 새 덱을 추가하면 `index.html` 끝에 한 줄만 넣으면 됨:
  `<script defer src="../../assets/comments.js"></script>`

> 최초 1회: 저장소에 [giscus GitHub App](https://github.com/apps/giscus) 설치(리포 접근 허용) 필요.
