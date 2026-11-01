(function () {
  var $ = function (s) { return document.querySelector(s); };
  var GUESTS = window.GUESTS, P = window.PARTY;
  var manual = !window.ENDPOINT;
  $("#dateLabel").textContent = P.dateLabel + " " + P.time;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // 초대장 링크 목록
  var base = location.href.replace(/[^/]*$/, "");
  var links = $("#links");
  GUESTS.forEach(function (g) {
    var url = base + "invites/" + g.id + ".html";
    var li = document.createElement("li");
    li.innerHTML = "<b>" + esc(g.name) + "</b> <code>" + esc(url) + "</code> <button type='button' class='secondary'>복사</button>";
    li.querySelector("button").addEventListener("click", function (ev) {
      var b = ev.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { b.textContent = "복사됨"; setTimeout(function () { b.textContent = "복사"; }, 1500); },
        function () { b.textContent = "직접 복사해주세요"; });
    });
    links.appendChild(li);
  });

  // 수동(붙여넣기) 모드 파서
  function parseManual(text) {
    var out = [];
    text.split("[초대장 답변]").forEach(function (block) {
      if (!block.trim()) return;
      var get = function (k) { var m = block.match(new RegExp("^\\s*" + k + ":\\s*(.*)$", "m")); return m ? m[1].trim() : ""; };
      var name = get("이름"); if (!name) return;
      var g = GUESTS.find(function (x) { return x.name === name; });
      var clean = function (v) { return (v === "없음" || v === "미응답") ? "" : v; };
      out.push({ guestId: g ? g.id : name, name: name, attend: clean(get("참석")),
                 cantEat: clean(get("못 먹는 음식")), wantEat: clean(get("먹고 싶은 음식")), note: clean(get("메모")), at: "" });
    });
    return out;
  }

  function latestPerGuest(responses) {
    var map = {};
    responses.forEach(function (r) { map[r.guestId] = r; }); // 뒤에 온 답변이 최신
    return map;
  }

  function fmtTime(v) {
    if (!v) return "";
    var d = new Date(v);
    return isNaN(d) ? "" : d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function pill(attend) {
    return attend ? "<span class='pill yes'>" + esc(attend) + "</span>" : "<span class='pill none'>아직 답 없음</span>";
  }
  function noteList(el, byGuest, key, emptyMsg) {
    var items = GUESTS.filter(function (g) { return byGuest[g.id] && byGuest[g.id][key]; })
      .map(function (g) { return "<li><b>" + esc(g.name) + "</b>" + esc(byGuest[g.id][key]) + "</li>"; });
    el.innerHTML = items.length ? items.join("") : "<li class='empty'>" + emptyMsg + "</li>";
  }

  function render(responses) {
    var byGuest = latestPerGuest(responses);
    var answered = GUESTS.filter(function (g) { return byGuest[g.id]; }).length;
    var rows = GUESTS.map(function (g) {
      var r = byGuest[g.id] || {};
      var cell = function (v) { return v ? esc(v) : "<span class='muted'>—</span>"; };
      return "<tr><td class='name'>" + esc(g.name) + "</td><td>" + pill(r.attend) + "</td><td>" + cell(r.cantEat) + "</td>" +
             "<td>" + cell(r.wantEat) + "</td><td>" + cell(r.note) + "</td>" +
             "<td class='small muted'>" + fmtTime(r.at) + "</td></tr>";
    });
    $("#rows").innerHTML = rows.join("");
    $("#nAnswered").textContent = answered + " / " + GUESTS.length;
    $("#nYes").textContent = GUESTS.filter(function (g) { return byGuest[g.id] && byGuest[g.id].attend === "참석"; }).length;
    $("#nPending").textContent = GUESTS.length - answered;
    noteList($("#cantList"), byGuest, "cantEat", "아직 피해야 할 음식이 없어요.");
    noteList($("#wantList"), byGuest, "wantEat", "아직 요청이 없어요. 그럼 호스트 마음대로.");
    $("#updated").textContent = "마지막 확인 " + new Date().toLocaleTimeString("ko-KR");
  }

  function load() {
    if (manual) {
      $("#manualBox").hidden = false;
      $("#mode").textContent = "답변 복사 모드 (config.js 의 ENDPOINT 가 비어 있음)";
      var saved = ""; try { saved = localStorage.getItem("admin:manual") || ""; } catch (e) {}
      $("#paste").value = saved;
      render(parseManual(saved));
      return;
    }
    $("#mode").textContent = "구글 시트에서 불러옴";
    $("#status").textContent = "불러오는 중…";
    fetch(window.ENDPOINT + "?key=" + encodeURIComponent(window.ADMIN_KEY))
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error(r.error); $("#status").textContent = ""; render(r.responses); })
      .catch(function (e) { $("#status").textContent = "불러오기 실패: " + e.message + " (ENDPOINT / ADMIN_KEY 확인)"; render([]); });
  }

  $("#reload").addEventListener("click", load);
  $("#paste").addEventListener("input", function () {
    try { localStorage.setItem("admin:manual", $("#paste").value); } catch (e) {}
    render(parseManual($("#paste").value));
  });
  load();
})();
