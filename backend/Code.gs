/**
 * 초대장 답변 수집용 Google Apps Script.
 * 사용법: 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script → 이 코드 붙여넣기
 *       → 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
 *       → 웹 앱 URL 을 config.js 의 window.ENDPOINT 에 붙여넣기.
 */
var ADMIN_KEY = "nov21-host"; // config.js 의 ADMIN_KEY 와 동일하게
var SHEET_NAME = "답변";
var HEADERS = ["받은 시각", "guestId", "이름", "참석", "못 먹는 음식", "먹고 싶은 음식", "메모"];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 손님이 답변을 보낼 때 (초대장 페이지에서 POST)
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!body.guestId || !body.name) return json_({ ok: false, error: "missing fields" });
    var sh = sheet_();
    sh.appendRow([
      new Date(),
      String(body.guestId),
      String(body.name),
      String(body.attend || ""),
      String(body.cantEat || ""),
      String(body.wantEat || ""),
      String(body.note || "")
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 호스트가 결과를 볼 때 (admin.html 에서 GET ?key=...)
function doGet(e) {
  var key = e && e.parameter && e.parameter.key;
  if (key !== ADMIN_KEY) return json_({ ok: false, error: "forbidden" });
  var sh = sheet_();
  var rows = sh.getDataRange().getValues().slice(1);
  var out = rows.map(function (r) {
    return {
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      guestId: r[1], name: r[2], attend: r[3],
      cantEat: r[4], wantEat: r[5], note: r[6]
    };
  });
  return json_({ ok: true, responses: out });
}
