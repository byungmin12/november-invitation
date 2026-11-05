# 메뉴장

음식이 나갈 때 손님이 보는 카드 덱. 표지 카드 뒤로 10코스 카드가 이어지고, 위로 쓸어 올리면 종이가 말리며 다음 카드로 넘어간다. 표지에는 네이버 지도 링크가 있고, 폰에서는 하단 화살표 대신 카드 아래 넘김 안내와 카드 모서리의 접힌 귀로 넘김을 안내한다.

## Sub-features

- `deck-cover` 표지에 제목·날짜·지도 링크가 있고 코스 수는 10.
- `deck-swipe-next` 위로 쓸면 다음 코스, 카운터 `01 / 10`, 제목·재료·설명·그림이 보인다.
- `deck-swipe-back` 아래로 쓸면 이전 카드로 돌아간다.
- `deck-images` 각 코스 그림이 `assets/menu/course-NN.jpg`에서 로드된다(900px).
- `deck-map` 지도 링크가 새 탭으로 네이버 지도 검색을 연다.
- `deck-phone-cue` 폰에서는 `nav`가 숨고 `#cueText`가 카드에 맞춰 바뀐다. 마지막 카드는 아래 방향 안내.
- `deck-desktop-nav` PC 에서는 하단 ↑ ↓ 버튼과 휠·키보드로 넘긴다.

## How to get to it (user POV)

- 카톡으로 받은 `menu.html` 링크를 연다.
- 헤더의 `계절의 식탁`을 누르면 표지로 돌아간다.

## Driving it with control-invite

Preconditions:

- 서버와 브라우저가 떠 있고 `$CI browser phone`.

- **표지.** `$CI browser open menu.html`. `$CI browser eval 'document.querySelectorAll(".card").length'`가 `11`, `$CI browser text "#count"`가 `INVITATION`, `$CI browser text ".cover h1"`이 `당신을초대합니다`.
- **폰 규칙.** `$CI browser eval 'matchMedia("(hover:none) and (pointer:coarse)").matches'`가 `true`, `$CI browser eval 'getComputedStyle(document.querySelector("nav")).display'`가 `"none"`, `$CI browser text "#cueText"`가 `위로 쓸어 올려, 오늘의 식탁을 만나보세요`.
- **지도 링크.** `$CI browser eval 'document.querySelector(".cover .map").getAttribute("href")'`가 `https://map.naver.com/p/search/`로 시작하고 디코딩하면 `서울특별시 금천구 벚꽃로 100`. `$CI browser eval 'document.querySelector(".cover .map").target'`은 `"_blank"`.
- **다음 코스.** `$CI browser swipe up`. `$CI browser text "#count"`가 `01 / 10`, `$CI browser text ".card.active h2"`가 `맑은 첫 인사`, `$CI browser text ".card.active .ingredients"`가 `단새우 · 배 · 레몬 · 잣`, `$CI browser text "#cueText"`가 `위로 쓸어 올려 다음 코스로`.
- **그림 로드.** `$CI browser eval 'document.querySelector(".card.active img").naturalWidth'`가 `900`, `$CI browser eval 'document.querySelector(".card.active img").getAttribute("src")'`가 `assets/menu/course-01.jpg`.
- **되돌아가기.** `$CI browser swipe down`. `$CI browser text "#count"`가 `INVITATION`.
- **마지막 카드.** `$CI browser swipe up`을 10번 반복한다. `$CI browser text "#count"`가 `10 / 10`, `$CI browser text ".card.active h2"`가 `계절의 마지막 인사`, `$CI browser text "#cueText"`가 `아래로 쓸어 내리면 처음으로`, `$CI browser eval 'document.querySelector("#cue").classList.contains("down")'`이 `true`.
- **증거.** `$CI browser screenshot .verify/artifacts/menu-deck/phone-course-10.png`, `$CI browser aria .verify/artifacts/menu-deck/phone-course-10.aria.txt`.
- **PC 넘김.** `$CI browser desktop`, `$CI browser open menu.html`. `$CI browser eval 'getComputedStyle(document.querySelector("nav")).display'`가 `"flex"`, `$CI browser click "#next"` 뒤 `$CI browser text "#count"`가 `01 / 10`, 한 번 더 `click "#next"` 뒤 `02 / 10`, `click "#prev"` 뒤 `01 / 10`.

## Gotchas

- 넘김 애니메이션은 1.3초. `swipe`와 `click`은 둘 다 넘김이 끝날 때까지 기다린 뒤 돌아온다. 휠·키보드 넘김은 도구에 없다.
- 넘기는 중에는 다음 입력이 무시된다. 연속 `swipe`는 순서대로 치면 되고 사이에 `sleep`은 필요 없다.
- `swipe`는 활성 카드 중앙에서 시작한다. 표지의 지도 링크 위에서 시작하면 넘김이 아니라 링크 클릭이 된다(의도된 동작).
- 지도 링크를 실제로 누르면 새 탭이 생겨 이후 명령이 첫 탭에만 붙는다. href 만 확인하고 누르지 않는다.
- 메뉴장은 루트의 `menu.html`이고 그림은 `assets/menu/course-NN.jpg`를 상대 경로로 가리킨다. 파일을 다른 폴더로 옮기면 그 경로와 이 지도의 `src` 단정을 같이 고친다.
