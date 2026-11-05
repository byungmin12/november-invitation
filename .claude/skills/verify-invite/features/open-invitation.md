# 초대장 열기

손님이 자기 링크를 열면 크라프트 봉투가 먼저 보이고, 도장을 누르거나 3초가 지나면 봉투가 열리며 이름이 적힌 초대장과 파티 정보, 답변 폼이 나타난다.

## Sub-features

- `open-envelope` 도장 클릭 또는 3초 자동 열림으로 봉투가 사라진다.
- `open-personal` 제목·이름·호스트·장소·시간이 `config.js` 값으로 채워진다.
- `open-reveal` 본문 요소가 순서대로 나타나고(reveal), 애니메이션이 막혀도 결국 보인다.
- `open-phone` 폰 폭에서 가로 스크롤 없이 한 장으로 보인다.

## How to get to it (user POV)

- 카톡으로 받은 `invites/<guest>.html` 링크를 연다.
- `admin.html`의 "손님별 초대장 링크"에서 복사한 링크를 연다.

## Driving it with control-invite

Preconditions:

- 서버와 브라우저가 떠 있고 `$CI doctor`가 정상.
- `$CI responses --reset` 직후(미리 채우기 안내가 섞이지 않게).

- **폰으로 열기.** 손님처럼 폰에서 링크를 연다. `$CI browser phone` 뒤 `$CI browser open invites/choi-jihye.html`. `$CI browser wait "#envelope" --visible`이 통과하고 `$CI browser text ".env-letter"`가 `Invitation최지혜 님께`를 출력한다.
- **도장 누르기.** 봉투 가운데 도장을 누른다. `$CI browser click ".seal"`. `$CI browser wait "#envelope" --gone --timeout 8000`이 통과한다.
- **이름과 정보 확인.** 초대장 본문을 읽는다. `$CI browser text "#guestName"`은 `최지혜`, `$CI browser text "#host"`는 `최지원 · 김병민`, `$CI browser text "#place"`는 `서울특별시 금천구 벚꽃로 100, 101동 1004호`, `$CI browser text "#time"`은 `오후 4시`.
- **자동 열림.** 아무것도 누르지 않고 기다린다. `$CI browser open invites/kim-jiseon.html` 뒤 바로 `$CI browser wait "#envelope" --gone --timeout 8000`. 통과하면 3초 자동 열림이 동작한 것이다. `$CI browser text "#guestName"`은 `김지선`.
- **가로 넘침 없음.** `$CI browser eval 'document.documentElement.scrollWidth <= innerWidth'`가 `true`.
- **증거.** `$CI browser screenshot .verify/artifacts/open-invitation/phone-opened.png`와 `$CI browser aria .verify/artifacts/open-invitation/phone-opened.aria.txt`. 접근성 트리에 heading `당신을 초대합니다`와 `01 올 수 있어요?` 그룹이 있어야 한다.

## Gotchas

- 봉투 애니메이션은 2초 뒤 `#envelope.open`, 2.9초 뒤 `body.intro` 해제, 4.6초 뒤 강제 표시. `--gone` 대기는 8초로 준다.
- `wait "#envelope" --visible`은 페이지를 연 직후 3초 안에 쳐야 한다. 늦으면 자동으로 열려 버린다.
- 존재하지 않는 guest ID 의 HTML 은 없다. 새 손님은 `config.js`의 `GUESTS`와 `invites/` 파일을 둘 다 추가해야 한다.
- 폰트는 Google Fonts CDN 에서 온다. 오프라인이면 대체 폰트로 렌더링되며 레이아웃 검증에는 영향 없다.
