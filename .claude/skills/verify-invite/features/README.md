# 초대장 검증 지도

이 폴더는 손님과 호스트가 보는 동작을 검증하는 유지 대상 지도다. 앱을 구동하기 전에 이 색인을 읽고, 해당 기능 파일을 레시피로 쓴다.

## 기준 전제

- 저장소 루트에서 `CI=.claude/skills/verify-invite/control-invite.mjs`.
- `$CI serve start`로 `http://127.0.0.1:4621`에 띄운다. `config.js`의 `ENDPOINT`는 자동으로 `http://127.0.0.1:4621/mock-endpoint`로 바뀐다. 운영 시트는 호출되지 않는다.
- `$CI browser start` 뒤 `$CI doctor`가 `ownsPorts` 둘 다 true 를 보고해야 한다.
- `$CI responses --reset`으로 답변 저장소를 비운 상태에서 시작한다.
- 손님 ID 와 이름은 `config.js`의 `GUESTS`를 따른다. 레시피는 `choi-jihye`(최지혜)를 쓴다.
- 이 런이 띄우지 않은 인스턴스는 구동하지 않는다.

## 구동 규칙

- 각 레시피는 기준 전제 상태에서 시작한다. 다른 전제가 필요하면 Preconditions 에 적혀 있다.
- 폰 전용 규칙을 보려면 `$CI browser phone`, 호스트 페이지는 `$CI browser desktop`.
- 선택자는 ID 와 클래스 손잡이를 쓴다. 좌표는 쓰지 않는다.
- 명령은 그대로 친다. 따옴표와 값도 바꾸지 않는다.
- 답변을 바꾼 뒤에는 `responses --reset`으로 되돌린다. 증거 파일은 지우지 않는다.

## 증명과 건너뜀 보고

- 행동과 결과 상태를 둘 다 남긴다. 완료 화면만으로는 부족하다.
- UI 증거는 `aria` 스냅샷과 `screenshot`. 캡처에는 초대장 제목이나 메뉴장 헤더가 보여야 한다.
- 전송 증거는 `$CI responses` 출력에 해당 손님 줄이 있는 것이다.
- 증거마다 기능 ID 와 사용한 진입점을 함께 적는다.
- 닿지 못한 경로는 시도한 명령과 충족되지 않은 전제를 적어 보고한다. 다른 경로로 대신 검증했다고 적지 않는다.

## 기능 파일 규약

각 파일은 H1 제목과 한 문단 설명으로 시작하고, 네 개의 H2 를 이 순서로 가진다.

1. `Sub-features`: 짧은 ID 와 한 줄 설명.
2. `How to get to it (user POV)`: 사용자 진입점 전부.
3. `Driving it with control-invite`: `Preconditions:`로 시작하고, 사용자 행동·정확한 명령·관찰 결과를 짝지은 굵은 글머리.
4. `Gotchas`: 검증 런을 망치거나 낭비하게 하는 함정.

## Features

- [초대장 열기](./open-invitation.md): 봉투 인트로, 손님 이름, 파티 정보, 폰 레이아웃.
- [답변 보내기](./rsvp-submit.md): 참석 버튼 강제, 폼 전송, 가짜 엔드포인트 저장, 완료 화면과 수정.
- [답변 미리 채우기](./rsvp-prefill.md): 이미 보낸 손님이 다시 열었을 때 폼 복원과 덮어쓰기.
- [호스트 결과 페이지](./admin-dashboard.md): 집계 타일, 빼야 할 음식 목록, 표, 복사 모드 붙여넣기.
- [메뉴장](./menu-deck.md): 카드 넘김, 코스 내용과 그림, 지도 링크, 폰 전용 넘김 안내.
