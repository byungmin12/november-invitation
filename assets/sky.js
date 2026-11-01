// 배경 캔버스: 낙엽이 흩날리다가 사이사이 첫눈이 섞여 내린다.
(function () {
  var c = document.getElementById("sky"); if (!c) return;
  var ctx = c.getContext("2d"), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var leafColors = ["#a9825f", "#8d6b4e", "#c4a584", "#b08e6a"];
  var items = [];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(kind, randomY) {
    var leaf = kind === "leaf";
    return {
      kind: kind, x: Math.random() * W, y: randomY ? Math.random() * H : -30,
      size: leaf ? 6 + Math.random() * 6 : 1 + Math.random() * 1.8,
      vy: leaf ? .35 + Math.random() * .5 : .25 + Math.random() * .4,
      drift: Math.random() * Math.PI * 2, driftSpeed: .01 + Math.random() * .02,
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - .5) * .04,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      alpha: leaf ? .25 + Math.random() * .3 : .35 + Math.random() * .4
    };
  }
  function drawLeaf(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color; ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.bezierCurveTo(p.size, -p.size * .6, p.size * .9, p.size * .5, 0, p.size);
    ctx.bezierCurveTo(-p.size * .9, p.size * .5, -p.size, -p.size * .6, 0, -p.size);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,60,30,.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -p.size * .7); ctx.lineTo(0, p.size); ctx.stroke();
    ctx.restore();
  }
  function drawSnow(p) {
    ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = "#c9d3dd";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function step() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      p.drift += p.driftSpeed; p.y += p.vy; p.x += Math.sin(p.drift) * (p.kind === "leaf" ? .9 : .4) + .15; p.rot += p.rotSpeed;
      if (p.y > H + 30 || p.x > W + 40) items[i] = spawn(p.kind, false);
      (p.kind === "leaf" ? drawLeaf : drawSnow)(p);
    }
    if (!reduce) requestAnimationFrame(step);
  }
  resize(); window.addEventListener("resize", resize);
  var nLeaf = W < 500 ? 7 : 12, nSnow = W < 500 ? 14 : 24;
  for (var i = 0; i < nLeaf; i++) items.push(spawn("leaf", true));
  for (var j = 0; j < nSnow; j++) items.push(spawn("snow", true));
  step();
})();
