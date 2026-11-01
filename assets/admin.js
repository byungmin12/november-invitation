(function () {
  var $ = function (s) { return document.querySelector(s); };
  var GUESTS = window.GUESTS, P = window.PARTY;
  var manual = !window.ENDPOINT;
  $("#dateLabel").textContent = P.dateLabel;

  // 초대장 링크 목록
  var base = location.href.replace(/[^/]*$/, "");
  var links = $("#links");
  GUESTS.forEach(function (g) {
    var url = base + "invites/" + g.id + ".html";
    var li = document.createElement("li");
    li.innerHTML = "<b>" + g.name + "</b> <code>" + url + "</code> <button type='button' class='secondary'>복사</button>";
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
      var foods = get("못 먹는 음식"); foods = (!foods || foods === "없음") ? [] : foods.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var clean = function (v) { return v === "없음" ? "" : v; };
      out.push({ guestId: g ? g.id : name, name: name, attend: clean(get("참석")), foods: foods, other: clean(get("그 외")), note: clean(get("메모")), at: "" });
    });
    return out;
  }

  function latestPerGuest(responses) {
    var map = {};
    responses.forEach(function (r) { map[r.guestId] = r; }); // 뒤에 온 답변이 최신
    return map;
  }

  function pill(attend) {
    if (!attend) return "<span class='pill none'>아직 답 없음</span>";
    var cls = attend === "참석" ? "yes" : attend === "불참" ? "no" : "maybe";
    return "<span class='pill " + cls + "'>" + attend + "</span>";
  }

  function render(responses) {
    var byGuest = latestPerGuest(responses);
    var answered = 0, yes = 0, foodCount = {};
    var rows = GUESTS.map(function (g) {
      var r = byGuest[g.id];
      if (r) { answered++; if (r.attend === "참석") yes++; r.foods.forEach(function (f) { foodCount[f] = (foodCount[f] || 0) + 1; }); }
      var foods = r && r.foods.length ? r.foods.map(function (f) { return "<span class='tag'>" + f + "</span>"; }).join("") : "<span class='muted'>—</span>";
      return "<tr><td class='name'>" + g.name + "</td><td>" + pill(r && r.attend) + "</td><td>" + foods + "</td>" +
             "<td>" + ((r && r.other) || "<span class='muted'>—</span>") + "</td><td>" + ((r && r.note) || "<span class='muted'>—</span>") + "</td>" +
             "<td class='small muted'>" + (r && r.at ? new Date(r.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "") + "</td></tr>";
    });
    $("#rows").innerHTML = rows.join("");
    $("#nAnswered").textContent = answered + " / " + GUESTS.length;
    $("#nYes").textContent = yes;
    $("#nNo").textContent = GUESTS.filter(function (g) { return byGuest[g.id] && byGuest[g.id].attend === "불참"; }).length;
    $("#nPending").textContent = GUESTS.length - answered;

    var keys = Object.keys(foodCount).sort(function (a, b) { return foodCount[b] - foodCount[a]; });
    $("#foodsum").innerHTML = keys.length
      ? keys.map(function (k) { return "<li>" + k + "<b>" + foodCount[k] + "명</b></li>"; }).join("")
      : "<li style='background:transparent;color:var(--ink-soft);padding:0'>아직 피해야 할 음식이 없어요.</li>";
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
