/**
 * 초대장 답변 수집용 Google Apps Script.
 * 사용법: 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script → 이 코드 붙여넣기
 *       → 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
 *       → 웹 앱 URL 을 config.js 의 window.ENDPOINT 에 붙여넣기.
 * 코드를 고친 뒤에는: 배포 → 배포 관리 → 연필 아이콘 → 버전 "새 버전" → 배포
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

function rowToObj_(r) {
  return {
    at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    guestId: String(r[1]), name: String(r[2]), attend: String(r[3]),
    cantEat: String(r[4]), wantEat: String(r[5]), note: String(r[6])
  };
}

// 손님이 답변을 보낼 때 (초대장 페이지에서 POST). 같은 guestId 가 있으면 그 줄을 덮어쓴다.
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse(e.postData.contents);
    if (!body.guestId || !body.name) return json_({ ok: false, error: "missing fields" });
    var sh = sheet_();
    var row = [
      new Date(),
      String(body.guestId),
      String(body.name),
      String(body.attend || ""),
      String(body.cantEat || ""),
      String(body.wantEat || ""),
      String(body.note || "")
    ];
    var ids = sh.getRange(2, 2, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
    var found = -1;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(body.guestId)) found = i + 2;
    if (found > 0) sh.getRange(found, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return json_({ ok: true, updated: found > 0 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// GET ?guest=<guestId>  → 그 손님의 답변 하나 (초대장에서 미리 채우기용)
// GET ?key=<ADMIN_KEY> → 전체 답변 (admin.html 용)
function doGet(e) {
  var p = (e && e.parameter) || {};
  var sh = sheet_();
  var last = sh.getLastRow();
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues().map(rowToObj_) : [];
  if (p.guest) {
    var mine = rows.filter(function (r) { return r.guestId === String(p.guest); });
    return json_({ ok: true, response: mine.length ? mine[mine.length - 1] : null });
  }
  if (p.key !== ADMIN_KEY) return json_({ ok: false, error: "forbidden" });
  return json_({ ok: true, responses: rows });
}
