# 답변 미리 채우기

이미 답한 손님이 초대장을 다시 열면 엔드포인트에서 자기 답변을 받아 폼에 채워 넣고, "이미 보낸 답변이 있어요" 안내와 함께 버튼이 "수정해서 전달하기"로 바뀐다. 엔드포인트가 없거나 실패하면 이 브라우저의 localStorage 사본으로 대신 채운다.

## Sub-features

- `prefill-server` 엔드포인트 `?guest=<id>` 응답으로 폼이 채워진다.
- `prefill-notice` `#existing`에 보낸 시각이 포함된 안내가 뜨고 `#submit` 라벨이 `수정해서 전달하기`.
- `prefill-local` 엔드포인트 응답이 없을 때 localStorage 사본으로 채운다.
- `prefill-isolation` 다른 손님의 답변은 채워지지 않는다.

## How to get to it (user POV)

- 답변을 보낸 뒤 같은 링크를 다시 연다.
- 완료 화면에서 새로고침한다.

## Driving it with control-invite

Preconditions:

- `rsvp-submit` 여정으로 `choi-jihye`의 답변(못 먹는 음식 `고수, 새우`)이 `$CI responses`에 하나 있다.
- `$CI browser phone`.

- **다시 열기.** `$CI browser open invites/choi-jihye.html` 뒤 `$CI browser wait "#envelope" --gone --timeout 8000`.
- **채워짐 확인.** `$CI browser eval 'document.querySelector("#cantEat").value'`가 `"고수, 새우"`, `$CI browser eval 'document.querySelector("#attendYes").checked'`가 `true`.
- **안내 확인.** `$CI browser text "#existing"`이 `이미 보낸 답변이 있어요 (`로 시작하고 `고칠 게 있으면 바꾸고 다시 전달하면 돼요.`로 끝난다. `$CI browser text "#submit"`은 `수정해서 전달하기`.
- **다른 손님 격리.** `$CI browser open invites/baek-mingi.html`, `wait "#envelope" --gone --timeout 8000`. `$CI browser eval 'document.querySelector("#cantEat").value'`는 `""`, `$CI browser text "#existing"`은 빈 문자열.
- **로컬 사본 대체.** `$CI serve stop` 뒤 `$CI browser open http://127.0.0.1:4621/invites/choi-jihye.html`은 서버가 없어 실패하므로 대신: 서버를 띄운 채 `$CI responses --reset`으로 서버 쪽 답변만 비우고 `$CI browser open invites/choi-jihye.html`, `wait "#envelope" --gone --timeout 8000`. 서버가 `response: null`을 주면 코드가 localStorage 사본으로 채운다. `$CI browser eval 'document.querySelector("#cantEat").value'`가 `"고수, 새우"`이면 통과.
- **증거.** `$CI browser screenshot .verify/artifacts/rsvp-prefill/prefilled.png`와 `$CI browser text "#existing" > .verify/artifacts/rsvp-prefill/notice.txt`.

## Gotchas

- localStorage 는 크롬 프로필(`.verify/run/profile`)에 묶여 있다. `cleanup`하면 사본도 사라지므로 `prefill-local`은 같은 브라우저 세션 안에서 이어서 해야 한다.
- 안내 문구의 시각은 로컬 시간대로 찍힌다. 시각 부분은 단정하지 말고 앞뒤 문구만 본다.
- 서버 응답이 있으면 localStorage 보다 서버가 우선한다. 둘을 다르게 만들어 두면 서버 값이 보여야 한다.
