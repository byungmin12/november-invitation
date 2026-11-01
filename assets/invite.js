(function () {
  var P = window.PARTY, guestId = document.body.dataset.guest;
  var guest = (window.GUESTS || []).find(function (g) { return g.id === guestId; });
  if (!guest) { document.body.innerHTML = "<div class='card'>초대장을 찾을 수 없어요.</div>"; return; }
  var $ = function (s) { return document.querySelector(s) || document.createElement("div"); };

  // 기본 정보 채우기
  document.title = guest.name + "님께 · " + P.title;
  $("#title").textContent = P.title;
  $("#guestName").textContent = guest.name;
  $("#host").textContent = P.host;
  $("#time").textContent = P.time || "추후 안내";
  $("#place").textContent = P.place || "추후 안내";
  if (P.replyBy) $("#replyBy").textContent = P.replyBy + "까지 알려주면 " + P.hostShort + "가 장을 볼 수 있어요.";
  $("#witWant").textContent = "비워두면 " + P.hostShort + " 마음대로 차립니다. 그땐 나오는 대로, 토 달지 않고 맛있게 드시는 걸로.";

  // 봉투: 도장을 누르거나, 3초 지나면 저절로 열림
  var env = $("#envelope"), opened = false;
  document.body.classList.add("intro");
  function openEnvelope() {
    if (opened) return; opened = true;
    $(".env").classList.add("open");
    setTimeout(function () { env.classList.add("open"); document.body.classList.add("ready"); }, 2000);
    setTimeout(function () { document.body.classList.remove("intro"); }, 2900);
    // 애니메이션이 어떤 이유로든 안 돌아도 내용은 보이게
    setTimeout(function () { document.body.classList.add("revealed"); }, 4600);
  }
  env.addEventListener("click", openEnvelope);
  setTimeout(openEnvelope, 3000);

  // 참석 토글 문구
  var attend = $("#attendYes"), attendLabel = $("#attendLabel");
  attend.addEventListener("change", function () {
    attendLabel.textContent = attend.checked ? "참석할게요. 11월 21일 저녁은 비워둘게요." : "참석할게요";
  });

  var form = $("#rsvp"), status = $("#status"), submitBtn = $("#submit");
  var manual = !window.ENDPOINT;
  if (manual) submitBtn.textContent = "답변 복사하기";

  function collect() {
    return { guestId: guest.id, name: guest.name, attend: attend.checked ? "참석" : "",
             cantEat: $("#cantEat").value.trim(), wantEat: $("#wantEat").value.trim(), note: $("#note").value.trim() };
  }

  function asText(d) {
    return ["[초대장 답변]", "이름: " + d.name, "참석: " + (d.attend || "미응답"),
            "못 먹는 음식: " + (d.cantEat || "없음"), "먹고 싶은 음식: " + (d.wantEat || "없음"),
            "메모: " + (d.note || "없음")].join("\n");
  }

  function showDone(text) {
    form.hidden = true;
    var done = $("#done"); done.hidden = false;
    if (text) { var pre = $("#copybox"); pre.hidden = false; pre.textContent = text; $("#copyHint").hidden = false; }
    done.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  var witErrors = ["'참석할게요'를 눌러야 보낼 수 있어요. 선택지는 하나뿐이에요.",
                   "안 오는 건 선택지에 없습니다. 위의 버튼을 눌러주세요.",
                   "이 초대장에는 '불참' 버튼이 애초에 없습니다."];
  var errCount = 0;

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var d = collect();
    if (!d.attend) {
      status.className = "status err"; status.textContent = witErrors[errCount++ % witErrors.length];
      attendLabel.parentNode.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
      return;
    }
    status.className = "status"; status.textContent = "";

    if (manual) {
      var text = asText(d);
      var copy = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
      copy.then(function () { showDone(text); $("#copyHint").textContent = "복사됐어요! " + P.hostShort + "한테 카톡으로 붙여넣어 보내주세요."; },
                function () { showDone(text); $("#copyHint").textContent = "아래 내용을 길게 눌러 복사한 뒤 " + P.hostShort + "한테 보내주세요."; });
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
        status.textContent = "전송이 안 됐어요. 다시 눌러보거나, 아래 내용을 복사해서 보내주세요.";
        var pre = $("#copyboxInline"); pre.hidden = false; pre.textContent = asText(d);
      });
  });
})();
