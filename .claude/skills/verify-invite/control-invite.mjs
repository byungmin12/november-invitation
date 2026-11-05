#!/usr/bin/env node
// control-invite: 초대장·메뉴장·admin 페이지를 실제 브라우저로 구동해 검증하는 도구.
// 의존성 없음 (Node 22+ 의 내장 WebSocket 과 fetch 사용). 사용법은 SKILL.md 참고.
//
//   control-invite serve start [--manual]   정적 서버 + 가짜 답변 수집 엔드포인트 시작
//   control-invite serve stop
//   control-invite browser start|stop       헤드리스 크롬 시작/종료
//   control-invite browser phone|desktop    화면·터치 에뮬레이션 전환 (이후 명령마다 적용)
//   control-invite browser open <path>      서버 루트 기준 경로 열기 (예: invites/choi-jihye.html)
//   control-invite browser wait <selector> [--visible] [--gone] [--timeout 8000]
//   control-invite browser wait --js "<expr>" [--timeout 8000]
//   control-invite browser click <selector>
//   control-invite browser fill <selector> <value>
//   control-invite browser text <selector>
//   control-invite browser eval "<js expression>"
//   control-invite browser swipe up|down
//   control-invite browser screenshot <path>
//   control-invite browser aria <path>
//   control-invite responses [--reset]      가짜 엔드포인트가 받은 답변 출력 / 초기화
//   control-invite doctor
//   control-invite cleanup                  서버·브라우저 종료, .verify/run 삭제 (artifacts 는 보존)

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUN = path.join(ROOT, ".verify/run");
const ARTIFACTS = path.join(ROOT, ".verify/artifacts");
const PORT = Number(process.env.VERIFY_PORT || 4621);
const CDP_PORT = Number(process.env.VERIFY_CDP_PORT || 9333);
const BRIDGE_PORT = Number(process.env.VERIFY_BRIDGE_PORT || CDP_PORT + 1);
const CHROME = process.env.VERIFY_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SELF = fileURLToPath(import.meta.url);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };

const die = (m) => { console.error("control-invite: " + m); process.exit(1); };
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gitRev = () => { try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { return "?"; } };
const configText = () => fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
const adminKey = () => (configText().match(/window\.ADMIN_KEY\s*=\s*"([^"]*)"/) || [])[1] || "";

// ---------- 정적 서버 + 가짜 Apps Script 엔드포인트 (backend/Code.gs 와 같은 응답 모양) ----------
function serveForever(manual) {
  const respPath = path.join(RUN, "responses.json");
  const mockUrl = `http://127.0.0.1:${PORT}/mock-endpoint`;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const send = (code, body, type = "application/json; charset=utf-8") => {
      res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body);
    };
    if (url.pathname === "/__doctor") return send(200, JSON.stringify({ ok: true, root: ROOT, port: PORT, manual, mock: mockUrl, git: gitRev() }));
    if (url.pathname === "/mock-endpoint") {
      const rows = readJSON(respPath, []);
      if (req.method === "POST") {
        let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
          let b; try { b = JSON.parse(body); } catch { return send(200, JSON.stringify({ ok: false, error: "bad json" })); }
          if (!b.guestId || !b.name) return send(200, JSON.stringify({ ok: false, error: "missing fields" }));
          const row = { at: new Date().toISOString(), guestId: String(b.guestId), name: String(b.name), attend: String(b.attend || ""),
            cantEat: String(b.cantEat || ""), wantEat: String(b.wantEat || ""), note: String(b.note || "") };
          const i = rows.findIndex((r) => r.guestId === row.guestId);
          if (i >= 0) rows[i] = row; else rows.push(row);
          writeJSON(respPath, rows);
          send(200, JSON.stringify({ ok: true, updated: i >= 0 }));
        }); return;
      }
      if (url.searchParams.get("guest")) {
        const mine = rows.filter((r) => r.guestId === url.searchParams.get("guest"));
        return send(200, JSON.stringify({ ok: true, response: mine.length ? mine[mine.length - 1] : null }));
      }
      if (url.searchParams.get("key") !== adminKey()) return send(200, JSON.stringify({ ok: false, error: "forbidden" }));
      return send(200, JSON.stringify({ ok: true, responses: rows }));
    }
    if (url.pathname === "/config.js") {
      // 운영 ENDPOINT(구글 시트)로는 절대 보내지 않는다. 가짜 엔드포인트 또는 복사 모드("")로 바꿔 내보낸다.
      const text = configText().replace(/window\.ENDPOINT\s*=\s*"[^"]*"/, `window.ENDPOINT = "${manual ? "" : mockUrl}"`);
      return send(200, text, MIME[".js"]);
    }
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(404, "not found", "text/plain");
    send(200, fs.readFileSync(file), MIME[path.extname(file)] || "application/octet-stream");
  });
  server.listen(PORT, "127.0.0.1", () => writeJSON(path.join(RUN, "serve.json"), { pid: process.pid, port: PORT, manual, root: ROOT, git: gitRev() }));
}

async function serve(cmd, flags) {
  const state = readJSON(path.join(RUN, "serve.json"), null);
  if (cmd === "start") {
    if (state && alive(state.pid)) return console.log(`serve: already running pid ${state.pid} on http://127.0.0.1:${state.port}`);
    fs.mkdirSync(RUN, { recursive: true });
    const log = fs.openSync(path.join(RUN, "serve.log"), "a");
    const child = spawn(process.execPath, [SELF, "__serve", ...(flags.manual ? ["--manual"] : [])], { detached: true, stdio: ["ignore", log, log] });
    child.unref();
    for (let i = 0; i < 40; i++) { await sleep(100); if (await doctorServe()) return console.log(`serve: http://127.0.0.1:${PORT} (pid ${child.pid}${flags.manual ? ", 복사 모드" : ", 가짜 엔드포인트"})`); }
    die("server did not come up; see .verify/run/serve.log");
  }
  if (cmd === "stop") {
    if (state && alive(state.pid)) process.kill(state.pid);
    try { fs.unlinkSync(path.join(RUN, "serve.json")); } catch {}
    return console.log("serve: stopped");
  }
  die("serve start|stop");
}
async function doctorServe() { try { return (await (await fetch(`http://127.0.0.1:${PORT}/__doctor`)).json()).ok === true; } catch { return false; } }

// ---------- 헤드리스 크롬 (CDP) ----------
const chromePath = path.join(RUN, "chrome.json");
async function browserStart() {
  const st = readJSON(chromePath, null);
  if (st && alive(st.pid)) return console.log(`browser: already running pid ${st.pid}`);
  if (!fs.existsSync(CHROME)) die(`Chrome not found at ${CHROME} (set VERIFY_CHROME)`);
  const profile = path.join(RUN, "profile"); fs.mkdirSync(profile, { recursive: true });
  const log = fs.openSync(path.join(RUN, "chrome.log"), "a");
  const child = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--no-first-run",
    "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "--window-size=1000,900", "about:blank"], { detached: true, stdio: ["ignore", log, log] });
  child.unref();
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(150); up = !!(await cdpVersion()); }
  if (!up) die("Chrome did not come up; see .verify/run/chrome.log");
  writeJSON(chromePath, { pid: child.pid, port: CDP_PORT, profile });
  // 브리지: 페이지 CDP 세션을 하나 붙잡고 있는 데몬. 에뮬레이션이 세션에 묶여 있어 명령마다 새로 붙으면 resize 가 난다.
  const blog = fs.openSync(path.join(RUN, "bridge.log"), "a");
  const bridge = spawn(process.execPath, [SELF, "__bridge"], { detached: true, stdio: ["ignore", blog, blog] });
  bridge.unref();
  for (let i = 0; i < 60; i++) { await sleep(150); if (await bridgeHealth()) { writeJSON(chromePath, { pid: child.pid, port: CDP_PORT, profile, bridgePid: bridge.pid, bridgePort: BRIDGE_PORT }); return console.log(`browser: pid ${child.pid}, CDP ${CDP_PORT}, bridge ${BRIDGE_PORT}`); } }
  die("bridge did not come up; see .verify/run/bridge.log");
}
async function bridgeHealth() { try { return await (await fetch(`http://127.0.0.1:${BRIDGE_PORT}/health`)).json(); } catch { return null; } }
async function bridgeCall(cmd, args, flags) {
  const r = await (await fetch(`http://127.0.0.1:${BRIDGE_PORT}/cmd`, { method: "POST", body: JSON.stringify({ cmd, args, flags }) })).json();
  for (const line of r.out) console.log(line);
  if (!r.ok) die(r.error);
}
async function cdpVersion() { try { return await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { return null; } }
function browserStop() {
  const st = readJSON(chromePath, null);
  if (st && st.bridgePid && alive(st.bridgePid)) process.kill(st.bridgePid);
  if (st && alive(st.pid)) process.kill(st.pid);
  try { fs.unlinkSync(chromePath); } catch {}
  console.log("browser: stopped");
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else this.events.push(m); }; }
  static async connect() {
    const st = readJSON(chromePath, null); if (!st || !alive(st.pid)) die("browser not running; run `control-invite browser start`");
    const pages = (await (await fetch(`http://127.0.0.1:${st.port}/json/list`)).json()).filter((t) => t.type === "page");
    if (!pages.length) die("no page target");
    const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("ws error")); });
    const c = new CDP(ws); c.mode = "desktop"; await c.applyMode(); return c;
  }
  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.id; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.delete(id)) rej(new Error(`CDP ${method} did not answer within 10s`)); }, 10000).unref();
    });
  }
  async applyMode() {
    // 에뮬레이션은 세션에 묶여 있어 명령마다 다시 건다.
    if (this.mode === "phone") {
      await this.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await this.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    } else {
      await this.send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
      await this.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + "\n  in: " + expr);
    return r.result.value;
  }
  close() { this.ws.close(); }
}
const q = (s) => JSON.stringify(s);
const visibleExpr = (sel) => `(function(){var e=document.querySelector(${q(sel)});if(!e)return false;var r=e.getBoundingClientRect();return !!(r.width&&r.height)&&getComputedStyle(e).visibility!=="hidden"&&!e.closest("[hidden]")})()`;

async function browser(cmd, args, flags) {
  if (cmd === "start") return browserStart();
  if (cmd === "stop") return browserStop();
  const st = readJSON(chromePath, null);
  if (!st || !alive(st.pid) || !(await bridgeHealth())) die("browser not running; run `control-invite browser start`");
  return bridgeCall(cmd, args, flags);
}

async function bridgeForever() {
  const c = await CDP.connect();
  c.ws.onclose = () => process.exit(0);
  let queue = Promise.resolve();
  http.createServer((req, res) => {
    const reply = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (req.url === "/health") return reply({ ok: true, mode: c.mode, pid: process.pid });
    let body = ""; req.on("data", (d) => (body += d)); req.on("end", () => {
      const { cmd, args, flags } = JSON.parse(body); const out = [];
      queue = queue.then(() => runBrowserCommand(c, cmd, args, flags, (l) => out.push(l))).then(() => reply({ ok: true, out }), (e) => reply({ ok: false, out, error: e.message }));
    });
  }).listen(BRIDGE_PORT, "127.0.0.1");
}

async function runBrowserCommand(c, cmd, args, flags, log) {
  if (cmd === "phone" || cmd === "desktop") { c.mode = cmd; await c.applyMode(); return log("browser: mode " + cmd); }
  {
    const timeout = Number(flags.timeout || 8000);
    const waitFor = async (expr, what) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) { if (await c.eval(expr)) return; await sleep(100); }
      throw new Error(`timeout waiting for ${what}`);
    };
    switch (cmd) {
      case "open": {
        const url = /^https?:/.test(args[0]) ? args[0] : `http://127.0.0.1:${PORT}/${args[0].replace(/^\//, "")}`;
        await c.send("Page.enable"); await c.send("Page.navigate", { url });
        await waitFor(`document.readyState==="complete"`, "load"); await sleep(150);
        return log("open: " + url);
      }
      case "wait": {
        if (flags.js) { await waitFor(`!!(${flags.js})`, flags.js); return log("wait: ok"); }
        const sel = args[0];
        if (flags.gone) await waitFor(`!document.querySelector(${q(sel)})||!${visibleExpr(sel)}`, sel + " gone");
        else if (flags.visible) await waitFor(visibleExpr(sel), sel + " visible");
        else await waitFor(`!!document.querySelector(${q(sel)})`, sel);
        return log("wait: ok " + sel);
      }
      case "click": {
        const box = await c.eval(`(function(){var e=document.querySelector(${q(args[0])});if(!e)return null;e.scrollIntoView({block:"center"});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
        if (!box) throw new Error("no element " + args[0]);
        for (const type of ["mousePressed", "mouseReleased"]) await c.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
        await sleep(100);
        await waitFor(`!document.querySelector(".curl-layer,.return-layer")`, "page turn to finish");
        return log("click: " + args[0]);
      }
      case "fill": {
        await c.eval(`(function(){var e=document.querySelector(${q(args[0])});if(!e)throw new Error("no element");e.focus();e.value=${q(args[1] ?? "")};e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))})()`);
        return log("fill: " + args[0]);
      }
      case "text": return log(await c.eval(`(document.querySelector(${q(args[0])})||{}).textContent?.trim() ?? "(no element)"`));
      case "eval": return log(JSON.stringify(await c.eval(args.join(" "))));
      case "swipe": {
        const dir = args[0] === "down" ? 1 : -1;
        // --fraction 0.2 처럼 카드 높이 대비 끄는 거리를 지정할 수 있다. 기본 0.6 은 넘김 기준(0.38)을 넘고, 0.2 는 못 넘어 되돌아온다.
        const fraction = Number(flags.fraction || 0.6);
        const box = await c.eval(`(function(){var e=document.querySelector(".card.active")||document.body;var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,h:r.height}})()`);
        const dist = Math.round(box.h * fraction), steps = 16;
        await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
        for (let i = 1; i <= steps; i++) { await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y + dir * Math.round(dist * i / steps), button: "left" }); await sleep(16); }
        await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y + dir * dist, button: "left", clickCount: 1 });
        if (!flags.nowait) await waitFor(`!document.querySelector(".curl-layer,.return-layer")`, "page turn to finish");
        return log(`swipe: ${dir < 0 ? "up" : "down"} ${dist}px (${fraction} of card height)${flags.nowait ? ", not waited" : ""}`);
      }
      case "screenshot": {
        const out = path.resolve(ROOT, args[0]); fs.mkdirSync(path.dirname(out), { recursive: true });
        const r = await c.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(r.data, "base64"));
        return log("screenshot: " + path.relative(ROOT, out));
      }
      case "aria": {
        const out = path.resolve(ROOT, args[0]); fs.mkdirSync(path.dirname(out), { recursive: true });
        await c.send("Accessibility.enable");
        const { nodes } = await c.send("Accessibility.getFullAXTree");
        const byId = new Map(nodes.map((n) => [n.nodeId, n])); const lines = [];
        const walk = (id, depth) => { const n = byId.get(id); if (!n) return; const role = n.role?.value, name = n.name?.value;
          const skip = n.ignored || ["none", "generic", "InlineTextBox", "StaticText", "LineBreak"].includes(role);
          if (!skip) lines.push("  ".repeat(depth) + role + (name ? ` "${name}"` : "")); for (const ch of n.childIds || []) walk(ch, skip ? depth : depth + 1); };
        walk(nodes[0].nodeId, 0); fs.writeFileSync(out, lines.join("\n") + "\n");
        return log(`aria: ${path.relative(ROOT, out)} (${lines.length} nodes)`);
      }
      default: throw new Error("unknown browser command " + cmd);
    }
  }
}

async function doctor() {
  const serveOk = await doctorServe(); const serveInfo = serveOk ? await (await fetch(`http://127.0.0.1:${PORT}/__doctor`)).json() : null;
  const st = readJSON(chromePath, null); const ver = st && alive(st.pid) ? await cdpVersion() : null; const bridge = ver ? await bridgeHealth() : null;
  const report = { serve: serveOk ? { ok: true, url: `http://127.0.0.1:${PORT}`, mode: serveInfo.manual ? "manual(copy)" : "mock endpoint", git: serveInfo.git, root: serveInfo.root }
      : { ok: false, hint: "control-invite serve start" },
    browser: ver && bridge ? { ok: true, pid: st.pid, mode: bridge.mode, chrome: ver.Browser, profile: st.profile, bridge: BRIDGE_PORT } : { ok: false, hint: "control-invite browser start" },
    ownsPorts: { serve: serveOk && serveInfo.root === ROOT, cdp: !!ver && !!st && st.profile.startsWith(RUN) } };
  console.log(JSON.stringify(report, null, 2));
  if (!(report.serve.ok && report.browser.ok && report.ownsPorts.serve && report.ownsPorts.cdp)) process.exit(1);
}

function responses(flags) {
  const p = path.join(RUN, "responses.json");
  if (flags.reset) { writeJSON(p, []); return console.log("responses: reset"); }
  console.log(JSON.stringify(readJSON(p, []), null, 2));
}

async function waitDead(pid) { for (let i = 0; i < 50 && pid && alive(pid); i++) await sleep(100); }
async function cleanup() {
  const servePid = readJSON(path.join(RUN, "serve.json"), {}).pid, { pid: chromePid, bridgePid } = readJSON(chromePath, {});
  await serve("stop", {}); browserStop();
  await waitDead(servePid); await waitDead(bridgePid); await waitDead(chromePid);
  fs.rmSync(RUN, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  console.log(`cleanup: removed .verify/run (kept ${path.relative(ROOT, ARTIFACTS)})`);
}

// ---------- CLI ----------
const argv = process.argv.slice(2); const flags = {}; const pos = [];
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith("--")) { const k = a.slice(2); const next = argv[i + 1]; if (next !== undefined && !next.startsWith("--") && ["timeout", "js", "fraction"].includes(k)) { flags[k] = next; i++; } else flags[k] = true; } else pos.push(a); }
const [group, cmd, ...rest] = pos;
if (group === "__serve") serveForever(!!flags.manual);
else if (group === "__bridge") await bridgeForever();
else if (group === "serve") await serve(cmd, flags);
else if (group === "browser") await browser(cmd, rest, flags);
else if (group === "doctor") await doctor();
else if (group === "responses") responses(flags);
else if (group === "cleanup") await cleanup();
else die("usage: control-invite serve|browser|doctor|responses|cleanup (see SKILL.md)");
