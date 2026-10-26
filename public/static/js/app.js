const $ = id => document.getElementById(id);
const POLL_MS = 8000;
let csrf = null, last = null, busy = false, charts = {};

const fmt = (x, d = 1) => (x === null || x === undefined) ? "डेटा नहीं है" : (+x).toFixed(d);
const set = (id, t) => { $(id).textContent = t; };
const hn = s => s === "ON" ? "चालू" : s === "OFF" ? "बंद" : "पता नहीं";
const yn = (s, yes, no) => s === "ON" ? yes : s === "OFF" ? no : "पता नहीं";

async function api(url, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const r = await fetch(url, { ...opts, headers, credentials: "same-origin" });
  let data = {}; try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}

// ---------- charts ----------
function mkChart(id) {
  return new Chart($(id), { type: "line", data: { labels: [], datasets: [{ data: [], borderColor: "#2e6b4a",
    backgroundColor: "#2e6b4a22", fill: true, tension: .3, pointRadius: 0, borderWidth: 2 }] },
    options: { animation: false, plugins: { legend: { display: false } },
      scales: { x: { ticks: { maxTicksLimit: 4 } }, y: { ticks: { maxTicksLimit: 5 } } } } });
}
function drawChart(key, pts, field, elId) {
  const rows = pts.filter(p => p[field] !== null && p[field] !== undefined);
  $(elId).hidden = rows.length > 1;
  if (!charts[key]) charts[key] = mkChart(key);
  charts[key].data.labels = rows.map(p => new Date(p.t).toLocaleTimeString());
  charts[key].data.datasets[0].data = rows.map(p => p[field]);
  charts[key].update();
}
async function loadHistory() {
  const { ok, data } = await api("/api/history");
  if (!ok) return;
  drawChart("c-temp", data.points, "temperature", "e-temp");
  drawChart("c-hum", data.points, "humidity", "e-hum");
  drawChart("c-soil", data.points, "soil_raw", "e-soil");
  $("hist-note").textContent = (data.mode === "demo" ? "नमूना (सैंपल) डेटा। " : "") +
    "यह ग्राफ़ तभी तक याद रहता है जब तक सर्वर चल रहा है। बंद करने पर मिट जाता है।";
}

// ---------- render ----------
const RESET = ["v-temp","v-hum","v-soil","v-light","v-rain","p-temp","p-hum","p-light","p-rain","g-temp","g-hum","g-soil","a-auto","a-pump"];
function render(d) {
  csrf = d.csrf || csrf;
  const conn = $("conn");
  conn.className = "pill " + (d.connected ? (d.mode === "demo" ? "pill-demo" : "pill-ok") : "pill-bad");
  conn.textContent = !d.connected ? "जुड़ा नहीं ❌" : (d.mode === "demo" ? "नमूना डेटा (डेमो)" : "Blynk से जुड़ा ✅");
  set("a-conn", conn.textContent);
  set("f-conn", !d.connected ? "जुड़ा नहीं" : (d.mode === "demo" ? "डेमो (नमूना)" : "जुड़ा हुआ"));
  const b = $("banner");
  b.hidden = d.connected && d.mode !== "demo";
  b.className = "banner" + (d.connected ? "" : " err");
  b.textContent = !d.connected ? "Blynk से डेटा नहीं आ रहा, इसलिए कोई रीडिंग नहीं दिखा रहे। (" + (d.error || "कनेक्शन में दिक्कत") + ")" :
    "यह नमूना (सैंपल) डेटा है, असली नहीं। असली डेटा के लिए .env में BLYNK_TOKEN डालें।";
  if (d.updated) { const t = new Date(d.updated).toLocaleTimeString(); set("updated", "आख़िरी अपडेट: " + t); set("a-time", t); }
  if (d.controls_enabled !== undefined) renderControls(d);
  if (!d.connected || !d.sensors) { last = null; RESET.forEach(i => set(i, "–")); return; }
  last = d; const s = d.sensors;
  const tt = s.temperature.available ? fmt(s.temperature.value) + " °C" : "डेटा नहीं";
  const hh = s.humidity.available ? fmt(s.humidity.value) + " %" : "डेटा नहीं";
  const lt = s.light.state, rn = s.rain.state;
  set("v-temp", tt); set("s-temp", s.temperature.available ? "सेंसर से सीधा" : "V0 से डेटा नहीं आ रहा");
  set("v-hum", hh); set("s-hum", s.humidity.available ? "सेंसर से सीधा" : "V1 से डेटा नहीं आ रहा");
  set("v-soil", s.soil_raw.available ? fmt(s.soil_raw.value, 0) : "डेटा नहीं");
  set("s-soil", !s.soil_raw.available ? "V2 से डेटा नहीं आ रहा" : s.soil_raw.suspect ?
     "4095: सेंसर या वायर में दिक्कत हो सकती है" : "यह % नहीं है, सिर्फ़ नंबर है");
  set("v-light", yn(lt, "हाँ ☀️", "नहीं 🌙")); set("s-light", yn(lt, "रोशनी है", "अँधेरा है"));
  set("v-rain", yn(rn, "हाँ 🌧️", "नहीं ☁️")); set("s-rain", yn(rn, "बारिश हो रही है", "बारिश नहीं है"));
  set("p-temp", tt); set("g-temp", tt); set("p-hum", hh); set("g-hum", hh);
  set("p-light", yn(lt, "रोशनी है", "अँधेरा है")); set("p-rain", yn(rn, "बारिश है", "बारिश नहीं"));
  set("g-soil", s.soil_raw.available ? fmt(s.soil_raw.value, 0) : "डेटा नहीं");
  set("g-src", d.mode === "demo" ? "नमूना डेटा" : "सीधे खेत से");
  set("f-rain", yn(rn, "बारिश है", "बारिश नहीं")); set("f-light", yn(lt, "रोशनी है", "अँधेरा है"));
  const pm = s.pump_status.available ? hn(s.pump_status.state) : "पता नहीं";
  set("f-pump", pm); set("a-pump", pm); set("m-pump", pm);
  set("f-cmd", hn(s.pump_cmd.state) + " (आख़िरी आदेश)");
  set("f-auto", hn(s.auto_mode.state)); set("a-auto", hn(s.auto_mode.state)); set("m-auto", hn(s.auto_mode.state));
  $("t-auto").classList.toggle("on", s.auto_mode.state === "ON");
  $("t-pump").classList.toggle("on", s.pump_status.state === "ON");
  $("auto").checked = s.auto_mode.state === "ON";
  set("a-dec", s.ai_decision.available ? s.ai_decision.value : "डेटा नहीं है");
  set("a-score-l", "एआई स्कोर");
  set("a-score", s.ai_score.available ? fmt(s.ai_score.value, 2) : "डेटा नहीं है");
  set("a-amt", s.ai_amount.available ? fmt(s.ai_amount.value) + " " + d.labels.ai_unit : "डेटा नहीं है");
  set("a-run", s.pump_runtime.available ? fmt(s.pump_runtime.value, 0) + " " + d.labels.runtime_unit : "डेटा नहीं है");
}
function renderControls(d) {
  $("ctl-off").hidden = d.controls_enabled;
  $("ctl-login").hidden = !d.controls_enabled || d.authenticated;
  $("ctl-main").hidden = !d.controls_enabled || !d.authenticated;
}

// ---------- polling (never overlaps) ----------
async function poll() {
  if (busy) return; busy = true;
  try {
    const { data } = await api("/api/status");
    render(data); await loadHistory();
  } catch (e) {
    render({ connected: false, error: "AgriSense सर्वर तक नहीं पहुँच पाए", mode: "live" });
  } finally { busy = false; clearTimeout(poll.t); poll.t = setTimeout(poll, POLL_MS); }
}
$("refresh").onclick = poll;

// ---------- controls ----------
const msg = (t, bad) => { $("ctl-msg").textContent = t; $("ctl-msg").style.color = bad ? "#b3261e" : "#16643a"; };
async function command(url, body, btns) {
  btns.forEach(b => b.disabled = true); msg("आदेश भेज रहे हैं…");
  try {
    const { ok, data } = await api(url, { method: "POST", body: JSON.stringify(body) });
    msg(ok ? "आदेश भेज दिया गया। पंप सच में चला या नहीं, खेत पर देखकर पक्का करें।" : (data.error || "आदेश नहीं गया।"), !ok);
  } catch (e) { msg("नेटवर्क की दिक्कत है।", true); }
  setTimeout(() => { btns.forEach(b => b.disabled = false); poll(); }, 3000);   // cooldown vs double clicks
}
$("login").onclick = async () => {
  const { ok, data } = await api("/api/login", { method: "POST", body: JSON.stringify({ password: $("pw").value }) });
  $("pw").value = ""; if (ok) { csrf = data.csrf; poll(); msg(""); } else msg(data.error || "पासवर्ड गलत है।", true);
};
$("logout").onclick = async () => { await api("/api/logout", { method: "POST" }); csrf = null; poll(); };
const pb = [$("pump-on"), $("pump-off")];
$("pump-on").onclick = () => { if (confirm("पंप चालू करना है?\nपहले देख लें कि पानी सही से जा रहा है और कुछ ओवरफ़्लो नहीं होगा।")) command("/api/pump", { action: "on", confirm: true }, pb); };
$("pump-off").onclick = () => command("/api/pump", { action: "off" }, pb);
$("auto").onchange = e => { if (!confirm("ऑटो सिंचाई का मोड बदलना है?")) { e.target.checked = !e.target.checked; return; }
  command("/api/auto-mode", { enabled: e.target.checked }, [e.target]); };

// ---------- Hindi voice assistant (answers use real values only) ----------
function hindiAnswer(q) {
  if (!last || !last.sensors) return "अभी सर्वर से डेटा नहीं मिल रहा है।";
  const s = last.sensors, pre = last.mode === "demo" ? "यह नमूना डेटा है। " : "";
  if (/तापमान|टेम्प|गर्मी/.test(q)) return pre + (s.temperature.available ? `तापमान ${fmt(s.temperature.value)} डिग्री सेल्सियस है।` : "तापमान का डेटा उपलब्ध नहीं है।");
  if (/नमी|मिट्टी|मृदा/.test(q)) return pre + (s.soil_raw.available ? `मिट्टी सेंसर का कच्चा मान ${fmt(s.soil_raw.value, 0)} है। यह प्रतिशत नहीं है, क्योंकि सेंसर अभी कैलिब्रेट नहीं है।` : "मिट्टी सेंसर का डेटा उपलब्ध नहीं है।");
  if (/बारिश|बरसात|वर्षा/.test(q)) { const r = s.rain.state; return pre + (r === "Unknown" ? "बारिश सेंसर का डेटा उपलब्ध नहीं है।" : r === "ON" ? "बारिश सेंसर बारिश का संकेत दे रहा है।" : "बारिश सेंसर बारिश का संकेत नहीं दे रहा है।"); }
  if (/पंप|पम्प/.test(q)) { const p = s.pump_status.state; return pre + (p === "Unknown" ? "पंप की पुष्टि वाली स्थिति उपलब्ध नहीं है, इसलिए मैं पक्का नहीं कह सकता कि पंप चालू है या बंद।" : p === "ON" ? "पंप चालू है।" : "पंप बंद है।"); }
  if (/AI|एआई|सिंचाई/.test(q)) return pre + (s.ai_decision.available ? `एआई का निर्णय: ${s.ai_decision.value}।` : "एआई सिंचाई का डेटा उपलब्ध नहीं है।");
  return "माफ़ कीजिए, मैं यह प्रश्न नहीं समझ पाया। तापमान, मिट्टी, बारिश, पंप या एआई सिंचाई के बारे में पूछिए।";
}
function speak(t) { $("answer").textContent = t; say(t); }
function say(t) {
  if (!("speechSynthesis" in window)) { $("voice-msg").textContent = "इस ब्राउज़र में आवाज़ नहीं चलती। जवाब नीचे लिखा है।"; return; }
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "hi-IN"; speechSynthesis.speak(u);
}
document.querySelectorAll(".qbtn").forEach(b => b.onclick = () => { $("heard").textContent = b.dataset.q; speak(hindiAnswer(b.dataset.q)); });
$("speak-all").onclick = () => { const t = ["तापमान", "मिट्टी", "बारिश", "पंप"].map(hindiAnswer).join(" "); $("heard").textContent = "पूरी जानकारी"; speak(t); };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
$("mic").onclick = () => {
  if (!SR) { $("voice-msg").textContent = "इस ब्राउज़र में बोलना नहीं चलता। Chrome या Edge इस्तेमाल करें, या ऊपर के बटन दबाएँ।"; return; }
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = "hi-IN"; rec.interimResults = true; rec.continuous = false;
  rec.onstart = () => { $("mic").classList.add("live"); $("voice-msg").textContent = "सुन रहे हैं… बोलिए"; };
  rec.onresult = e => { const t = Array.from(e.results).map(r => r[0].transcript).join(""); $("heard").textContent = t;
    if (e.results[e.results.length - 1].isFinal) speak(hindiAnswer(t)); };
  rec.onerror = e => { $("voice-msg").textContent = e.error === "not-allowed" ? "माइक की इजाज़त नहीं मिली। ब्राउज़र सेटिंग में Allow करें।" : "आवाज़ में दिक्कत: " + e.error; };
  rec.onend = () => { $("mic").classList.remove("live"); rec = null; };
  rec.start();
};
$("stop").onclick = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); };

// ---------- AI adviser (server calls Claude with real readings only) ----------
let aiText = "";
$("ai-go").onclick = async () => {
  const btn = $("ai-go"); btn.disabled = true; $("ai-say").hidden = true;
  $("ai-out").textContent = "एआई सोच रहा है…"; $("ai-msg").textContent = "";
  try {
    const { ok, data } = await api("/api/ai-advice", { method: "POST", body: JSON.stringify({ question: $("ai-q").value.trim() }) });
    if (ok) { aiText = data.advice; $("ai-out").textContent = aiText; $("ai-say").hidden = false;
      $("ai-msg").textContent = data.demo ? "ध्यान दें: यह नमूना डेटा पर आधारित है।" : ""; }
    else $("ai-out").textContent = data.error || "सलाह नहीं मिल पाई।";
  } catch (e) { $("ai-out").textContent = "नेटवर्क की दिक्कत है।"; }
  setTimeout(() => { btn.disabled = false; }, 3000);
};
$("ai-say").onclick = () => say(aiText);

{ const hr = new Date().getHours(); set("greet", hr < 12 ? "सुप्रभात, किसान भाई! 🌅" : hr < 17 ? "नमस्ते, किसान भाई! 🙏" : "शुभ संध्या, किसान भाई! 🌇"); }
set("now-date", new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
poll();