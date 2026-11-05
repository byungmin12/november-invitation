# 답변 보내기

손님이 "참석할게요"를 누르고 못 먹는 음식·먹고 싶은 음식·메모를 적어 "전달하기"를 누르면 답변이 엔드포인트에 한 줄로 저장되고 완료 화면이 뜬다. 참석을 누르지 않으면 위트 있는 오류로 막는다.

## Sub-features

- `rsvp-require-attend` 참석 체크 없이 전달하면 오류 문구가 돌아가며 뜨고 전송되지 않는다.
- `rsvp-attend-toggle` 참석 버튼이 체크되면 라벨이 `참석할게요. 11월 21일 저녁은 비워둘게요.`로 바뀐다.
- `rsvp-send` 전달하기가 엔드포인트에 POST 하고 완료 화면 `잘 받았어요`를 보인다.
- `rsvp-stored` 엔드포인트에 guestId·이름·참석·세 입력값이 그대로 저장된다.
- `rsvp-edit-again` 완료 화면의 "답변 수정하기"로 폼이 다시 열리고, 재전송은 같은 손님 줄을 덮어쓴다(`고친 답변, 잘 받았어요`).
- `rsvp-copy-mode` ENDPOINT 가 비었을 때는 텍스트 복사 안내와 `[초대장 답변]` 텍스트 박스가 뜬다.

## How to get to it (user POV)

- 초대장 아래 답변 폼의 `전달하기` 버튼.
- 완료 화면의 `답변 수정하기` 버튼.

## Driving it with control-invite

Preconditions:

- `$CI responses --reset` 직후.
- `$CI browser phone` 상태에서 `invites/choi-jihye.html`을 열고 봉투가 사라진 뒤(`wait "#envelope" --gone --timeout 8000`).
- `$CI browser text "#existing"`이 빈 문자열(기존 답변 없음).

- **빈 채로 전달.** 참석을 누르지 않고 전달하기를 누른다. `$CI browser click "#submit"`. `$CI browser text "#status"`가 `'참석할게요'를 눌러야 보낼 수 있어요. 선택지는 하나뿐이에요.`이고 `$CI responses`는 `[]`.
- **참석 누르기.** `$CI browser click ".attend span"`. `$CI browser eval 'document.querySelector("#attendYes").checked'`가 `true`, `$CI browser text "#attendLabel"`이 `참석할게요. 11월 21일 저녁은 비워둘게요.`.
- **입력.** `$CI browser fill "#cantEat" "고수, 새우"`, `$CI browser fill "#wantEat" "전골"`, `$CI browser fill "#note" "조금 늦을 것 같아요"`.
- **전달.** `$CI browser click "#submit"` 뒤 `$CI browser wait "#done" --visible`. `$CI browser text "#doneTitle"`은 `잘 받았어요`.
- **저장 확인.** `$CI responses`에 `guestId: "choi-jihye"`, `name: "최지혜"`, `attend: "참석"`, `cantEat: "고수, 새우"`, `wantEat: "전골"`, `note: "조금 늦을 것 같아요"`인 객체가 정확히 하나 있다.
- **수정해서 재전송.** `$CI browser click "#editAgain"`, `$CI browser wait "#rsvp" --visible`, `$CI browser fill "#wantEat" "전골, 귤"`, `$CI browser click "#submit"`, `$CI browser wait "#done" --visible`. `$CI browser text "#doneTitle"`은 `고친 답변, 잘 받았어요`이고 `$CI responses`는 여전히 한 객체이며 `wantEat`이 `전골, 귤`.
- **증거.** `$CI browser screenshot .verify/artifacts/rsvp-submit/done.png`, `$CI browser aria .verify/artifacts/rsvp-submit/done.aria.txt`, 그리고 `$CI responses > .verify/artifacts/rsvp-submit/responses.json`.
- **복사 모드.** `$CI cleanup` 뒤 `$CI serve start --manual`, `$CI browser start`, 같은 순서로 참석·입력 후 `$CI browser click "#submit"`. `$CI browser wait "#done" --visible` 뒤 `$CI browser text "#copybox"`가 `[초대장 답변]`으로 시작하고 `이름: 최지혜`, `못 먹는 음식: 고수, 새우` 줄을 가진다. `$CI browser text "#copyHint"`는 `아래 내용을 길게 눌러 복사한 뒤 지원과 병민한테 보내주세요.`.

## Gotchas

- 오류 문구는 누를 때마다 세 가지가 돌아간다. 첫 번째 클릭 문구만 단정하거나, 두 번째는 `안 오는 건 선택지에 없습니다. 위의 버튼을 눌러주세요.`로 단정한다.
- 전송 중 `#submit`은 비활성화된다. 완료 전에 다시 누르면 무시된다.
- `fill`은 value 를 바꾸고 input/change 를 쏜다. 실제 타이핑은 아니므로 입력 중 동작(없음)은 검증하지 않는다.
- 전송 실패 경로(엔드포인트 다운)는 `$CI serve stop` 뒤 전달하기를 눌러 본다. `#status`가 `전송이 안 됐어요…`이고 `#copyboxInline`에 텍스트가 뜬다. 끝나면 `serve start`로 되돌린다.
- 헤드리스 크롬은 클립보드 쓰기를 거부한다. 복사 모드의 "복사됐어요!" 분기는 헤드리스에서 닿지 않는다. 그 분기를 보려면 실제 브라우저가 필요하다.
