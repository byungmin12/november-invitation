---
name: verify-invite
description: "11월 21일 파티 초대장(invites/*.html), 메뉴장(menu.html), 호스트 결과 페이지(admin.html)를 실제 헤드리스 크롬으로 구동해 변경이 손님 눈높이에서 동작하는지 증명한다. 운영 구글 시트로는 절대 보내지 않는다. 초대장·메뉴장·admin 의 UI 변경을 증명해야 할 때, /verify-invite, '실제로 열어서 확인해줘' 에 사용."
---

# verify-invite

이 저장소는 서버 없는 정적 HTML 세 묶음이다. 손님은 `invites/<guest>.html`(봉투 → 초대장 → 답변 폼), 메뉴장 `menu.html`(카드 덱, 위로 넘김), 호스트는 `admin.html`(답변 집계)을 본다. 답변은 `config.js`의 `ENDPOINT`(구글 Apps Script 웹앱)로 POST 된다. **이 스킬은 그 운영 엔드포인트를 절대 호출하지 않는다.** 검증 서버가 `config.js`를 내보낼 때 `ENDPOINT`를 로컬 가짜 엔드포인트로 바꿔치기하고, 받은 답변은 `.verify/run/responses.json`에 쌓는다. 가짜 엔드포인트는 `backend/Code.gs`와 같은 응답 모양(같은 guestId 는 덮어쓰기, `?guest=` 조회, `?key=` 전체 조회)을 흉내 낸다.

모든 명령은 저장소 루트에서 실행한다. 도구는 `.claude/skills/verify-invite/control-invite.mjs` 하나이며 의존성이 없다(Node 22+ 와 설치된 Google Chrome 만 필요).

```
CI=.claude/skills/verify-invite/control-invite.mjs
```

## Launch

```
$CI serve start            # http://127.0.0.1:4621 정적 서버 + 가짜 엔드포인트 (복사 모드를 보려면 --manual)
$CI browser start          # 헤드리스 크롬, CDP 9333, 프로필은 .verify/run/profile
$CI responses --reset      # 가짜 엔드포인트의 답변 저장소 비우기 (깨끗한 시작)
```

준비 완료의 기준: `serve start`가 `serve: http://127.0.0.1:4621 (pid …)`를, `browser start`가 `browser: pid …, CDP 9333, bridge 9334`를 출력한다. 서버, 크롬, 브리지 세 프로세스가 백그라운드로 분리되어 떠 있다. 브리지는 크롬 페이지에 CDP 세션 하나를 계속 붙잡고 있는 데몬이고, `browser …` 명령은 모두 브리지에 넘겨 실행된다(화면 에뮬레이션은 세션에 묶여 있어 명령마다 새로 붙으면 페이지에 resize 가 가서 메뉴장 넘김이 취소된다). 포트를 바꾸려면 `VERIFY_PORT`, `VERIFY_CDP_PORT`(브리지는 그 다음 번호, 또는 `VERIFY_BRIDGE_PORT`), 크롬 경로는 `VERIFY_CHROME` 환경변수. 두 런이 같은 포트를 쓰면 안 되므로 동시에 돌릴 땐 변수를 다르게 준다.

빌드·마이그레이션·시드 데이터는 없다. 시드가 필요한 여정(예: 답변 미리 채우기, admin 집계)은 먼저 `rsvp-submit` 여정으로 답변을 하나 만들어 두거나 `responses.json`에 직접 넣는다.

## Doctor

```
$CI doctor
```

읽기 전용. 서버가 응답하고 그 루트가 이 저장소인지, 크롬이 우리가 띄운 프로필로 떠 있는지, 어떤 모드(가짜 엔드포인트/복사)인지, git 리비전이 무엇인지 JSON 으로 출력하고 하나라도 어긋나면 종료 코드 1. 뭔가 이상하면 다른 명령보다 이걸 먼저 돌린다. `ownsPorts`가 false 면 다른 프로세스가 포트를 쥔 것이므로 그 인스턴스를 구동하지 말고 포트를 바꿔 다시 시작한다.

## Drive

```
$CI browser phone|desktop           # 390×844 @2x 터치(hover:none, pointer:coarse) / 1000×900 마우스. 이후 명령마다 적용
$CI browser open invites/choi-jihye.html
$CI browser wait "#envelope" --gone --timeout 8000   # 선택자가 사라질 때까지. --visible 은 보일 때까지, 기본은 DOM 존재
$CI browser wait --js 'document.querySelector("#rows").children.length>0'
$CI browser click ".seal"           # 요소 중앙에 실제 마우스 이벤트. 메뉴장 넘김을 일으키면 애니메이션 종료까지 대기
$CI browser fill "#cantEat" "고수"  # value 설정 + input/change 이벤트
$CI browser text "#status"          # textContent
$CI browser eval 'window.ENDPOINT'  # 표현식 결과를 JSON 으로
$CI browser swipe up|down           # 활성 카드 중앙에서 드래그, 넘김 애니메이션 종료까지 대기
$CI browser screenshot .verify/artifacts/<feature>/<name>.png
$CI browser aria .verify/artifacts/<feature>/<name>.aria.txt   # 역할/이름 접근성 트리
```

안정적인 손잡이: 초대장은 `#envelope`, `.seal`, `#guestName`, `#existing`, `.attend span`, `#attendYes`, `#cantEat`, `#wantEat`, `#note`, `#submit`, `#status`, `#done`, `#doneTitle`, `#editAgain`. 메뉴장은 `.card.active`, `.card.active h2`, `#count`, `#cueText`, `.cover .map`, `nav`. admin 은 `#mode`, `#nAnswered`, `#nYes`, `#nPending`, `#cantList`, `#wantList`, `#rows`, `#reload`, `#paste`. 손님 ID 는 `config.js`의 `GUESTS`(choi-jihye, kwon-myeonghoe, baek-mingi, choi-jiwon, kim-jiseon).

각 기능의 정확한 순서와 기대 결과는 [features/README.md](features/README.md)와 기능별 파일에 있다. 지도에 없는 경로를 검증했다면 지도에 추가한다.

## Evidence

증거는 `.verify/artifacts/<feature>/` 아래에 둔다. 이 폴더는 cleanup 이 지우지 않으며 `.gitignore`에 들어 있다.

증명 기준:
- 손님이 실제로 밟는 경로로 간다. 봉투를 열고, 버튼을 누르고, 폼을 채운다. 내부 함수 호출이나 `hidden` 속성 직접 조작은 증거가 아니다.
- 행동과 그 결과 상태를 둘 다 남긴다. 완료 화면 캡처만으로는 부족하고, 그 직전 상태(`#status` 문구, 체크 여부)도 `text`/`eval` 출력으로 남긴다.
- 부수효과를 따로 본다. 답변 전송은 `$CI responses` 출력에 그 손님의 줄이 있어야 증명된다. 화면의 "잘 받았어요"만으로는 안 된다.
- 가짜 엔드포인트는 `config.js`의 `ENDPOINT` 경계에서만 바꿔치기한다. 그 외 네트워크(폰트 CDN)는 그대로다. 운영 시트가 실제로 받는지는 이 스킬 범위 밖이며, 확인하려면 호스트가 수동으로 한 번 보내 본다.
- 휴대폰 전용 규칙(하단 nav 숨김, 넘김 안내, 터치 미디어쿼리)은 `browser phone` 상태에서만 켜진다. 캡처에 어떤 모드였는지 파일 이름에 적는다.

## Cleanup

```
$CI cleanup     # 우리가 띄운 서버·크롬만 pid 로 종료하고 .verify/run 삭제. .verify/artifacts 는 보존
```

이름으로 프로세스를 죽이지 않는다. 실패한 시도 뒤에도 반드시 cleanup 을 돌려 포트를 비운다. cleanup 뒤 `ls .verify/artifacts/<feature>`로 증거가 남아 있는지 확인한다.

## Helpers

`control-invite.mjs`는 실행 가능하고 인자 없이 돌리면 사용법을 출력한다. 서버 로그는 `.verify/run/serve.log`, 크롬 로그는 `.verify/run/chrome.log`, 브리지 로그는 `.verify/run/bridge.log`. CDP 호출은 10초 안에 응답이 없으면 에러로 끝나므로 명령이 영원히 멈추지는 않는다. 브리지가 죽으면(크롬이 종료되면 따라 죽는다) `doctor`의 `browser.ok`가 false 가 되고, `browser stop` 뒤 `browser start`로 되살린다.

## 알아둘 것

- 봉투는 도장(`.seal`)을 누르거나 3초 뒤 저절로 열린다. 열림 애니메이션이 약 2.9초이므로 `wait "#envelope" --gone --timeout 8000`으로 기다린다.
- 초대장은 열릴 때 `ENDPOINT?guest=<id>`로 기존 답변을 조회한다. 가짜 엔드포인트에 그 손님의 답변이 있으면 폼이 채워지고 `#submit` 라벨이 "수정해서 전달하기"로 바뀐다. 깨끗한 폼을 원하면 먼저 `responses --reset`.
- 복사 모드(`serve start --manual`)에서는 전송 대신 클립보드 복사를 시도한다. 헤드리스에서는 클립보드가 거부되어 "길게 눌러 복사" 안내와 `#copybox`가 뜬다. 그게 정상 경로다.
- 메뉴장 넘김은 활성 카드 위에서 시작한 드래그만 인식한다. `swipe`는 카드 중앙에서 시작하므로 지도 링크(`.cover .map`) 위를 지나지 않는다.
- 폰 모드에서 마우스 이벤트를 터치로 변환하는 CDP 옵션은 일부러 쓰지 않는다. 켜면 `mousePressed`가 응답하지 않아 명령이 멈춘다.
- 헤드리스 크롬은 창 폭을 500px 밑으로 줄이지 못한다. 폰 모드는 디바이스 메트릭 오버라이드로 390px 을 만들므로 캡처는 정상이다.

유지보수는 `/pstack:maintain-verification-skill`로 한다. 앱이 바뀌면 기능 지도부터 맞춘다.
