# 호스트 결과 페이지

호스트가 `admin.html`을 열면 엔드포인트에서 전체 답변을 받아 답변 완료·참석·미응답 타일, "메뉴에서 빼야 할 것"과 "먹고 싶다는 것" 목록, 손님별 표를 보여준다. 엔드포인트가 비어 있으면 카톡으로 받은 `[초대장 답변]` 텍스트를 붙여넣어 같은 화면을 채운다.

## Sub-features

- `admin-load` ADMIN_KEY 로 전체 답변을 받아 표를 그린다.
- `admin-tiles` `답변 완료 n / 5`, `참석`, `아직 답 없음` 숫자가 답변과 맞는다.
- `admin-lists` 못 먹는 음식·먹고 싶은 음식이 손님 이름과 함께 목록에 뜬다.
- `admin-links` 손님별 초대장 링크 다섯 개가 현재 주소 기준으로 만들어진다.
- `admin-manual` 복사 모드에서 붙여넣은 텍스트를 파싱해 같은 표를 그리고 이 브라우저에 기억한다.

## How to get to it (user POV)

- `admin.html`을 연다.
- 페이지의 `새로 고침` 버튼.

## Driving it with control-invite

Preconditions:

- `rsvp-submit` 여정으로 `choi-jihye` 답변(참석, 못 먹는 음식 `고수, 새우`, 먹고 싶은 음식 `전골`)이 `$CI responses`에 하나 있다.
- `$CI browser desktop`.

- **열기.** `$CI browser open admin.html` 뒤 `$CI browser wait --js 'document.querySelector("#rows").children.length>0'`. `$CI browser text "#mode"`는 `구글 시트에서 불러옴`, `$CI browser text "#status"`는 빈 문자열.
- **타일.** `$CI browser text "#nAnswered"`가 `1 / 5`, `$CI browser text "#nYes"`가 `1`, `$CI browser text "#nPending"`이 `4`.
- **목록.** `$CI browser text "#cantList"`가 `최지혜고수, 새우`, `$CI browser text "#wantList"`가 `최지혜전골`.
- **표.** `$CI browser eval 'document.querySelector("#rows tr td.name").textContent + " / " + document.querySelector("#rows tr .pill").textContent'`가 `"최지혜 / 참석"`. `$CI browser eval 'document.querySelectorAll("#rows tr").length'`는 `5`.
- **링크.** `$CI browser eval 'document.querySelectorAll("#links li").length'`가 `5`, `$CI browser text "#links li:first-child code"`가 `http://127.0.0.1:4621/invites/choi-jihye.html`.
- **새로 고침.** 다른 손님 답변을 추가한 뒤 새로 고침이 반영되는지 본다. `rsvp-submit` 순서로 `invites/kwon-myeonghoe.html`에서 답변 하나 보내고 `$CI browser open admin.html`, `$CI browser click "#reload"`, `$CI browser wait --js 'document.querySelector("#nAnswered").textContent==="2 / 5"'`.
- **증거.** `$CI browser screenshot .verify/artifacts/admin-dashboard/desktop.png`, `$CI browser aria .verify/artifacts/admin-dashboard/desktop.aria.txt`.
- **복사 모드.** `$CI cleanup`, `$CI serve start --manual`, `$CI browser start`, `$CI browser desktop`, `$CI browser open admin.html`. `$CI browser text "#mode"`가 `답변 복사 모드 (config.js 의 ENDPOINT 가 비어 있음)`이고 `$CI browser wait "#manualBox" --visible`. `$CI browser fill "#paste" "[초대장 답변]
이름: 최지혜
참석: 참석
못 먹는 음식: 고수
먹고 싶은 음식: 전골
메모: 없음"` 뒤 `$CI browser text "#nAnswered"`가 `1 / 5`, `$CI browser text "#cantList"`가 `최지혜고수`.

## Gotchas

- 표의 첫 줄은 `GUESTS` 순서(최지혜 먼저)다. 답변 순서가 아니다.
- 복사 모드 파서는 `[초대장 답변]` 블록 하나당 첫 줄만 읽는다. 메모에 줄바꿈이 있으면 둘째 줄부터 사라진다(형식 검증 스킬 `verify-rsvp-roundtrip`의 알려진 발견).
- `ADMIN_KEY`가 `config.js`와 가짜 엔드포인트(= `config.js`에서 읽음)에서 같으므로 forbidden 경로는 `config.js`를 고치지 않는 한 닿지 않는다.
- 붙여넣기 내용은 `admin:manual` localStorage 키에 남는다. 다음 런이 섞이지 않게 `cleanup`으로 프로필을 지운다.
