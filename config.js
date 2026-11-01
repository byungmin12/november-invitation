// 파티 기본 정보와 답변 수집 설정. 이 파일만 고치면 모든 페이지에 반영됩니다.
window.PARTY = {
  title: "11월의 저녁 초대",
  date: "2026.11.21",
  dateLabel: "2026년 11월 21일 토요일",
  time: "",            // 예: "오후 6시" (비우면 '추후 안내'로 표시)
  place: "",           // 예: "우리집 (주소는 따로 보낼게)"
  host: "병민",        // 초대장에 표시될 호스트 이름
  replyBy: "11월 14일" // 답변 마감 안내 (비우면 숨김)
};

// 답변 저장 위치: Google Apps Script 웹앱 URL. (설정 방법은 README.md 참고)
// 비워두면 "답변 복사" 모드로 동작합니다. 손님이 복사한 답변을 카톡으로 보내면
// admin.html 에 붙여넣어 확인할 수 있습니다.
window.ENDPOINT = "";

// admin.html 에서 결과를 불러올 때 쓰는 키. backend/Code.gs 의 ADMIN_KEY 와 같아야 합니다.
window.ADMIN_KEY = "nov21-host";

window.GUESTS = [
  { id: "choi-jihye",     name: "최지혜" },
  { id: "kwon-myeonghoe", name: "권명회" },
  { id: "baek-mingi",     name: "백민기" },
  { id: "choi-jiwon",     name: "최지원" },
  { id: "kim-jiseon",     name: "김지선" }
];

// 초대장 체크박스 항목
window.FOOD_OPTIONS = [
  "갑각류 (새우·게)", "조개류", "생선·회", "견과류", "땅콩",
  "우유·유제품", "달걀", "밀·글루텐", "돼지고기", "소고기",
  "매운 음식", "고수", "오이", "술 (안 마셔요)"
];
