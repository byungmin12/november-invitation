(function () {
  var P = window.PARTY, guestId = document.body.dataset.guest;
  var guest = (window.GUESTS || []).find(function (g) { return g.id === guestId; });
  if (!guest) { document.body.innerHTML = "<div class='card'>초대장을 찾을 수 없어요.</div>"; return; }
  var $ = function (s) { return document.querySelector(s); };

  // 기본 정보 채우기
  document.title = guest.name + "님께 · " + P.title;
  $("#title").textContent = P.title;
  $("#guestName").textContent = guest.name;
  $("#host").textContent = P.host;
  $("#date").textContent = P.dateLabel;
  $("#time").textContent = P.time || "추후 안내";
  $("#place").textContent = P.place || "추후 안내";
  if (P.replyBy) $("#replyBy").textContent = P.replyBy + "까지 알려주면 준비에 큰 도움이 돼요.";

  // 체크박스 생성
  var choices = $("#foods");
  window.FOOD_OPTIONS.forEach(function (label, i) {
    var id = "food" + i;
    var l = document.createElement("label"); l.className = "chip";
    l.innerHTML = "<input type='checkbox' id='" + id + "' name='foods' value=\"" + label + "\"><span>" + label + "</span>";
    choices.appendChild(l);
  });

  var form = $("#rsvp"), status = $("#status"), submitBtn = $("#submit");
  var manual = !window.ENDPOINT;
  if (manual) submitBtn.textContent = "답변 복사하기";

  function collect() {
    var attend = (form.querySelector("input[name=attend]:checked") || {}).value || "";
    var foods = Array.prototype.map.call(form.querySelectorAll("input[name=foods]:checked"), function (c) { return c.value; });
    return { guestId: guest.id, name: guest.name, attend: attend, foods: foods,
             other: $("#other").value.trim(), note: $("#note").value.trim() };
  }

  function asText(d) {
    return ["[초대장 답변]", "이름: " + d.name, "참석: " + (d.attend || "미응답"),
            "못 먹는 음식: " + (d.foods.length ? d.foods.join(", ") : "없음"),
            "그 외: " + (d.other || "없음"), "메모: " + (d.note || "없음")].join("\n");
  }

  function showDone(text) {
    form.hidden = true;
    var done = $("#done"); done.hidden = false;
    if (text) {
      var pre = $("#copybox"); pre.hidden = false; pre.textContent = text;
      $("#copyHint").hidden = false;
    }
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var d = collect();
    if (!d.attend) { status.className = "status err"; status.textContent = "참석 여부를 먼저 골라주세요."; return; }
    status.className = "status"; status.textContent = "";

    if (manual) {
      var text = asText(d);
      var copy = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
      copy.then(function () { showDone(text); $("#copyHint").textContent = "복사됐어요! " + P.host + "에게 카톡으로 붙여넣어 보내주세요."; },
                function () { showDone(text); $("#copyHint").textContent = "아래 내용을 길게 눌러 복사한 뒤 " + P.host + "에게 보내주세요."; });
      return;
    }

    submitBtn.disabled = true; status.textContent = "보내는 중…";
    fetch(window.ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(d) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error || "fail");
        try { localStorage.setItem("rsvp:" + guest.id, "1"); } catch (e) {}
        showDone();
      })
      .catch(function () {
        submitBtn.disabled = false;
        status.className = "status err";
        status.textContent = "전송이 안 됐어요. 잠시 후 다시 눌러보거나, 아래 내용을 복사해서 보내주세요.";
        var pre = $("#copyboxInline"); pre.hidden = false; pre.textContent = asText(d);
      });
  });
})();
