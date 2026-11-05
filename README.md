# 11월 21일 파티 초대장

손님마다 초대장 HTML 한 장씩, 그리고 호스트가 답변을 모아 보는 `admin.html` 로 구성되어 있습니다.

```
config.js            파티 정보 · 손님 목록 · 답변 수집 설정 (여기만 고치면 됨)
invites/*.html       손님별 초대장 (5장)
menu.html            당일 손님에게 보내는 메뉴장 (10코스 카드, 위로 넘김)
admin.html           호스트용 결과 확인 페이지 (임시)
assets/              공통 스타일 · 스크립트 · 메뉴장 그림 (assets/menu/)
backend/Code.gs      구글 시트에 답변을 저장하는 Apps Script
.claude/skills/      에이전트용 검증 스킬 (verify-invite, verify-rsvp-roundtrip)
```

## 1. 바로 써보기 (설정 없이)

`invites/choi-jihye.html` 등을 브라우저로 열면 바로 동작합니다.
`config.js` 의 `ENDPOINT` 가 비어 있으면 **답변 복사 모드**로 동작합니다.

- 손님이 "답변 복사하기"를 누르면 답변이 텍스트로 복사됩니다 → 카톡으로 보내달라고 안내됩니다.
- 받은 텍스트를 `admin.html` 아래 붙여넣기 칸에 넣으면 표와 요약이 채워집니다.

## 2. 자동 수집 (구글 시트 연결, 5분)

1. [sheets.new](https://sheets.new) 로 빈 시트를 만듭니다.
2. 메뉴 **확장 프로그램 → Apps Script** 를 열고, 기본 코드를 지운 뒤 `backend/Code.gs` 내용을 붙여넣고 저장합니다.
3. 오른쪽 위 **배포 → 새 배포** → 유형 선택(톱니) **웹 앱**
   - 실행 주체: **나**
   - 액세스 권한: **모든 사용자**
   - 배포 → 권한 허용 → **웹 앱 URL** 복사
4. `config.js` 의 `window.ENDPOINT = "..."` 에 그 URL 을 붙여넣습니다.
5. 필요하면 `ADMIN_KEY` 를 `config.js` 와 `Code.gs` 양쪽에서 같은 값으로 바꿉니다.

이후 손님이 "답변 보내기"를 누르면 시트에 한 줄씩 쌓이고, `admin.html` 이 그 시트를 읽어 보여줍니다.
(코드를 수정했다면 Apps Script 에서 **배포 → 배포 관리 → 새 버전** 으로 다시 배포해야 반영됩니다.)

## 3. 손님에게 보내기

파일을 그대로 보내도 되지만, 링크로 보내려면 정적 호스팅이 필요합니다.
GitHub Pages 가 가장 간단합니다: 저장소를 GitHub 에 올리고 **Settings → Pages → Branch: main / (root)** 를 켜면
`https://<아이디>.github.io/<저장소>/invites/choi-jihye.html` 형태로 열립니다.
`admin.html` 에 들어가면 손님별 링크를 복사할 수 있습니다.

메뉴장은 초대장과 별개로 파티 당일 보냅니다. 같은 호스팅에서 `https://<아이디>.github.io/<저장소>/menu.html` 로 열립니다.
표지의 "지도"를 누르면 네이버 지도에서 집 주소가 검색되고, 폰에서는 위로 쓸어 올려 다음 코스를 봅니다.

> `admin.html` 은 링크를 아는 사람은 누구나 열 수 있는 임시 페이지입니다. 결과만 볼 수 있고, 손님 이름과 못 먹는 음식 정도의 정보만 있으니 파티가 끝나면 지워도 됩니다.

## 손님 목록

| 이름 | 초대장 |
|---|---|
| 최지혜 | `invites/choi-jihye.html` |
| 권명회 | `invites/kwon-myeonghoe.html` |
| 백민기 | `invites/baek-mingi.html` |
| 최지원 | `invites/choi-jiwon.html` |
| 김지선 | `invites/kim-jiseon.html` |
