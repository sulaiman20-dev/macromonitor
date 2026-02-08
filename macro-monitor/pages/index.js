import { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

// Dynamic import recharts to avoid SSR issues
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

/* ═══ CONSTANTS ══════════════════════════════════════════════════ */
const SK = "macroMonitor:v5";
const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSd-XpZ_JvNZbF9QgzfmmhrfwNF5CkCSAmFUAjpZ2vNpVsrrpA/viewform?usp=pp_url";
const FM = {
  date: "entry.2005875987", fat: "entry.177798724", protein: "entry.274477235",
  netCarbs: "entry.627541876", calories: "entry.17219735", sodium: "entry.2109942087",
  potassium: "entry.75882861", magnesium: "entry.1303264367",
};
const Z = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, netCarbs: 0, sodium: 0, potassium: 0, magnesium: 0 };
const DN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SEED_CUSTOM = [
  { id: "cf-lmnt", name: "LMNT (1 packet)", calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 1000, potassium: 200, magnesium: 60 },
  { id: "cf-fairlife", name: "Fairlife Nutrition Plan (1 bottle)", calories: 150, protein: 30, fat: 2.5, carbs: 3, fiber: 0, sodium: 230, potassium: 350, magnesium: 30 },
];

/* ═══ HELPERS ════════════════════════════════════════════════════ */
const td = () => new Date().toISOString().slice(0, 10);
const r1 = (n) => Math.round((n || 0) * 10) / 10;
const ri = (n) => Math.round(n || 0);
const sum = (items) => {
  const t = { ...Z };
  items.forEach((i) => { for (const k in Z) if (k !== "netCarbs") t[k] += i[k] || 0; });
  t.netCarbs = Math.max(0, t.carbs - t.fiber);
  return t;
};
const monday = (ds) => {
  const d = new Date(ds + "T12:00:00"), w = d.getDay();
  d.setDate(d.getDate() - w + (w === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
};
const weekOf = (ds) => {
  const m = new Date(monday(ds) + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(m); x.setDate(m.getDate() + i); return x.toISOString().slice(0, 10);
  });
};

/* ═══ STORAGE (localStorage) ═════════════════════════════════════ */
const loadDB = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SK);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return { days: {}, customFoods: SEED_CUSTOM, v: 5 };
};
const saveDB = (d) => {
  try { localStorage.setItem(SK, JSON.stringify(d)); } catch (e) { }
};

/* ═══ THEME ══════════════════════════════════════════════════════ */
const T = {
  bg: "#06090f", sf: "#0d1320", sf2: "#141d2f", bd: "#1b2740", bd2: "#253350",
  tx: "#e4eaf2", txd: "#8694ad", txm: "#4e5d76",
  ac: "#10b981", warn: "#f59e0b", warnBg: "#3b2506", err: "#ef4444", errBg: "#3b0a0a",
  prot: "#a78bfa", fat: "#fb923c", carb: "#34d399", cal: "#f472b6",
  na: "#60a5fa", k: "#c084fc", mg: "#2dd4bf",
};

/* ═══ SMALL COMPONENTS ═══════════════════════════════════════════ */
const Card = ({ children, style }) => (
  <div style={{ background: T.sf, borderRadius: 14, border: `1px solid ${T.bd}`, padding: 16, ...style }}>{children}</div>
);

const Metric = ({ label, value, unit, color, target, warn }) => (
  <div style={{ background: T.sf2, borderRadius: 11, padding: "13px 15px", border: `1px solid ${warn ? T.warn : T.bd}`, flex: "1 1 110px", minWidth: 110, position: "relative", overflow: "hidden" }}>
    {warn && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: T.warn }} />}
    <div style={{ fontSize: 10.5, color: color || T.txd, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: T.tx, fontFamily: "'JetBrains Mono', monospace" }}>
      {typeof value === "number" ? (unit === "mg" ? ri(value) : r1(value)) : value}
      <span style={{ fontSize: 12, color: T.txd, fontWeight: 400, marginLeft: 3 }}>{unit}</span>
    </div>
    {target != null && <div style={{ fontSize: 10.5, color: T.txm, marginTop: 1 }}>/ {target}{unit}</div>}
  </div>
);

const Alert = ({ children, danger }) => (
  <div style={{ background: danger ? T.errBg : T.warnBg, border: `1px solid ${danger ? T.err : T.warn}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: danger ? "#fca5a5" : "#fcd34d", display: "flex", alignItems: "center", gap: 8 }}>
    <span>{danger ? "⚠️" : "⚡"}</span>{children}
  </div>
);

/* ═══ REVIEW MODAL ═══════════════════════════════════════════════ */
const ReviewModal = ({ items, onConfirm, onCancel }) => {
  const [ed, setEd] = useState(items);
  const upd = (i, k, v) => { const n = [...ed]; n[i] = { ...n[i], [k]: k === "name" ? v : (+v || 0) }; setEd(n); };
  const del = (i) => setEd((p) => p.filter((_, j) => j !== i));
  const flds = [["calories", "Cal"], ["protein", "Prot"], ["fat", "Fat"], ["carbs", "Carbs"], ["fiber", "Fiber"], ["sodium", "Na"], ["potassium", "K"], ["magnesium", "Mg"]];
  const preview = sum(ed);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)", padding: 16 }}>
      <div style={{ background: T.sf, borderRadius: 16, border: `1px solid ${T.bd}`, width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: T.tx }}>Review & Edit</div><div style={{ fontSize: 12, color: T.txd, marginTop: 2 }}>Adjust values before logging</div></div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: T.txd, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {ed.map((item, i) => (
            <div key={i} style={{ background: T.sf2, borderRadius: 12, border: `1px solid ${T.bd}`, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <input value={item.name} onChange={(e) => upd(i, "name", e.target.value)} style={{ flex: 1, background: "transparent", border: "none", color: T.tx, fontSize: 14, fontWeight: 600, padding: 0 }} />
                <button onClick={() => del(i)} style={{ background: "none", border: "none", color: T.txm, cursor: "pointer", fontSize: 16, marginLeft: 8 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {flds.map(([k, lab]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9.5, color: T.txm, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>{lab}</label>
                    <input type="number" step="any" value={item[k] ?? 0} onChange={(e) => upd(i, k, e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 6, padding: "6px 8px", color: T.tx, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.bd}`, flexShrink: 0 }}>
          {ed.length > 0 && <div style={{ fontSize: 11.5, color: T.txd, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{ri(preview.calories)}cal · {r1(preview.protein)}p · {r1(preview.fat)}f · {r1(preview.netCarbs)}nc</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={{ flex: 1, background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 12, color: T.txd, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={() => onConfirm(ed)} disabled={!ed.length} style={{ flex: 2, background: ed.length ? T.ac : T.sf2, border: "none", borderRadius: 10, padding: 12, color: ed.length ? "#fff" : T.txm, cursor: ed.length ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}>✓ Log {ed.length} item{ed.length !== 1 ? "s" : ""}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ CUSTOM FOOD EDITOR ═════════════════════════════════════════ */
const FoodEditor = ({ food, onSave, onClose }) => {
  const [v, setV] = useState(food || { name: "", calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, potassium: 0, magnesium: 0 });
  const s = (k, val) => setV((p) => ({ ...p, [k]: val }));
  const flds = [["calories", "Calories", "kcal"], ["protein", "Protein", "g"], ["fat", "Fat", "g"], ["carbs", "Carbs", "g"], ["fiber", "Fiber", "g"], ["sodium", "Sodium", "mg"], ["potassium", "Potassium", "mg"], ["magnesium", "Magnesium", "mg"]];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}>
      <div style={{ background: T.sf, borderRadius: 16, border: `1px solid ${T.bd}`, padding: 24, width: "90%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: T.tx, fontSize: 16 }}>{food ? "Edit" : "Add"} Custom Food</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.txd, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <input value={v.name} onChange={(e) => s("name", e.target.value)} placeholder="Food name + serving" style={{ width: "100%", boxSizing: "border-box", background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", color: T.tx, fontSize: 14, marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {flds.map(([k, l, u]) => (
            <div key={k}>
              <label style={{ fontSize: 10.5, color: T.txd }}>{l} ({u})</label>
              <input type="number" step="any" value={v[k]} onChange={(e) => s(k, e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 6, padding: "8px 10px", color: T.tx, fontSize: 13, marginTop: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10, color: T.txd, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave({ ...v, calories: +v.calories || 0, protein: +v.protein || 0, fat: +v.fat || 0, carbs: +v.carbs || 0, fiber: +v.fiber || 0, sodium: +v.sodium || 0, potassium: +v.potassium || 0, magnesium: +v.magnesium || 0, id: food?.id || `cf-${Date.now()}` })}
            style={{ flex: 1, background: T.ac, border: "none", borderRadius: 8, padding: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
export default function MacroMonitor() {
  const [tab, setTab] = useState("today");
  const [data, setData] = useState(null);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState(null);
  const [review, setReview] = useState(null);
  const [formLink, setFormLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editFood, setEditFood] = useState(null);
  const [addFood, setAddFood] = useState(false);
  const [mounted, setMounted] = useState(false);
  const recRef = useRef(null);

  useEffect(() => { setData(loadDB()); setMounted(true); }, []);
  useEffect(() => { if (data) saveDB(data); }, [data]);

  const today = td();
  const dayItems = data?.days?.[today]?.items || [];
  const totals = useMemo(() => sum(dayItems), [dayItems]);

  /* ─── Voice ────────────────────────────────────────────────── */
  const toggleVoice = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus({ t: "Speech not supported", type: "err" }); return; }
    const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
    r.onresult = (e) => { setInput((p) => p ? p + ", " + e.results[0][0].transcript : e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r; r.start(); setListening(true);
  };

  /* ─── Parse via serverless function ────────────────────────── */
  const handleParse = async () => {
    const txt = input.trim();
    if (!txt) return;
    setParsing(true);
    setStatus({ t: "🧠 Claude is analyzing your food...", type: "info" });

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: txt, customFoods: data?.customFoods || [] }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || `Server error ${res.status}`);
      }

      if (!body.items || !body.items.length) {
        throw new Error("No food items parsed — try being more specific");
      }

      setReview(body.items);
      setStatus({ t: `✓ Parsed ${body.items.length} item${body.items.length > 1 ? "s" : ""} — review & confirm`, type: "ok" });
    } catch (e) {
      console.error("Parse error:", e);
      setStatus({ t: e.message, type: "err" });
    }
    setParsing(false);
  };

  /* ─── Confirm & Log ────────────────────────────────────────── */
  const confirmItems = (items) => {
    setData((prev) => {
      const d = { ...prev };
      const existing = d.days?.[today]?.items || [];
      const stamped = items.map((it) => ({ ...it, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
      const merged = [...existing, ...stamped];
      d.days = { ...d.days, [today]: { items: merged, totals: sum(merged) } };
      return d;
    });
    setReview(null); setInput("");
    setStatus({ t: `✓ Logged ${items.length} item${items.length > 1 ? "s" : ""}`, type: "ok" });
  };

  const deleteItem = (id) => {
    setData((prev) => {
      const d = { ...prev };
      const items = (d.days?.[today]?.items || []).filter((i) => i.id !== id);
      d.days = { ...d.days, [today]: { items, totals: sum(items) } };
      return d;
    });
  };

  /* ─── Form Link ────────────────────────────────────────────── */
  const genLink = () => {
    const p = new URLSearchParams();
    p.set(FM.date, today); p.set(FM.fat, r1(totals.fat)); p.set(FM.protein, r1(totals.protein));
    p.set(FM.netCarbs, r1(totals.netCarbs)); p.set(FM.calories, ri(totals.calories));
    p.set(FM.sodium, ri(totals.sodium)); p.set(FM.potassium, ri(totals.potassium)); p.set(FM.magnesium, ri(totals.magnesium));
    setFormLink(`${FORM}&${p.toString()}`); setCopied(false);
  };

  /* ─── Week ─────────────────────────────────────────────────── */
  const wkDates = weekOf(today);
  const wkData = wkDates.map((d) => {
    const di = data?.days?.[d]; const dt = new Date(d + "T12:00:00"); const dow = dt.getDay();
    return { date: d, label: DN[dow === 0 ? 6 : dow - 1], ...(di?.items?.length ? sum(di.items) : Z), has: !!(di?.items?.length) };
  });
  const wkAvg = useMemo(() => {
    const f = wkData.filter((d) => d.has); if (!f.length) return Z;
    const s = { ...Z }; f.forEach((d) => Object.keys(s).forEach((k) => (s[k] += d[k])));
    Object.keys(s).forEach((k) => (s[k] /= f.length)); return s;
  }, [wkData]);

  /* ─── Warnings ─────────────────────────────────────────────── */
  const warns = [];
  if (totals.protein < 145 && dayItems.length > 0) warns.push({ m: `Protein at ${r1(totals.protein)}g — need ${r1(145 - totals.protein)}g more`, d: false });
  if (totals.netCarbs > 45) warns.push({ m: `Net carbs ${r1(totals.netCarbs)}g — over 45g!`, d: true });
  else if (totals.netCarbs > 40) warns.push({ m: `Net carbs ${r1(totals.netCarbs)}g — above 40g`, d: false });
  if (totals.netCarbs > 0 && totals.netCarbs < 30) warns.push({ m: `Net carbs ${r1(totals.netCarbs)}g — below 30g min`, d: false });
  if (wkAvg.fat > 80 && wkData.filter((d) => d.has).length > 1) warns.push({ m: `Weekly avg fat ${r1(wkAvg.fat)}g — over 80g`, d: false });

  /* ─── Custom Foods ─────────────────────────────────────────── */
  const saveCF = (f) => { setData((p) => { const i = p.customFoods.findIndex((x) => x.id === f.id); const n = [...p.customFoods]; if (i >= 0) n[i] = f; else n.push(f); return { ...p, customFoods: n }; }); setEditFood(null); setAddFood(false); };
  const delCF = (id) => setData((p) => ({ ...p, customFoods: p.customFoods.filter((f) => f.id !== id) }));

  /* ─── Import/Export ────────────────────────────────────────── */
  const doExport = () => { const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `macro-${today}.json`; a.click(); };
  const doImport = () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.onchange = async (e) => { try { const j = JSON.parse(await e.target.files[0].text()); if (j.days) setData(j); } catch { setStatus({ t: "Invalid file", type: "err" }); } }; inp.click(); };

  if (!data || !mounted) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.tx, fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 44, marginBottom: 12 }}>🥩</div><div style={{ fontSize: 15, fontWeight: 600 }}>Loading...</div></div>
    </div>
  );

  const stColor = status?.type === "err" ? { bg: T.errBg, fg: "#fca5a5", bd: "rgba(239,68,68,0.3)" } : status?.type === "ok" ? { bg: "rgba(16,185,129,0.1)", fg: T.ac, bd: "rgba(16,185,129,0.3)" } : { bg: "rgba(96,165,250,0.1)", fg: T.na, bd: "rgba(96,165,250,0.3)" };

  return (
    <>
      <Head>
        <title>Macro Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        input:focus, textarea:focus { outline: none; border-color: ${T.ac} !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.bd2}; border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, color: T.tx, fontFamily: "'IBM Plex Sans', -apple-system, sans-serif" }}>

        {/* Header */}
        <div style={{ background: T.sf, borderBottom: `1px solid ${T.bd}`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>🥩</span>
              <div><div style={{ fontSize: 17, fontWeight: 700 }}>Macro Monitor</div><div style={{ fontSize: 10.5, color: T.txm }}>{today} · powered by Claude</div></div>
            </div>
            <div style={{ display: "flex", gap: 3, background: T.sf2, borderRadius: 12, padding: 3 }}>
              {[["today", "📋", "Today"], ["week", "📊", "Week"], ["settings", "⚙️", "Settings"]].map(([k, ic, lb]) =>
                <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? T.ac : "transparent", color: tab === k ? "#fff" : T.txd, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 14 }}>{ic}</span>{lb}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ═══ TODAY ═══ */}
          {tab === "today" && <>
            <Card>
              <div style={{ fontSize: 13, color: T.txd, marginBottom: 10, fontWeight: 500 }}>Describe what you ate — Claude will break it down and calculate macros</div>
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleParse(); } }}
                placeholder='e.g. "3 scrambled eggs with spinach and butter, a Fairlife shake, and an LMNT packet"'
                rows={3} style={{ width: "100%", background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "12px 14px", color: T.tx, fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={toggleVoice} style={{ background: listening ? T.err : T.sf2, border: `1px solid ${listening ? T.err : T.bd}`, borderRadius: 10, padding: "11px 16px", color: listening ? "#fff" : T.tx, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ animation: listening ? "pulse 1s infinite" : "none" }}>{listening ? "🔴" : "🎤"}</span>{listening ? "Listening..." : "Voice"}
                </button>
                <button onClick={handleParse} disabled={!input.trim() || parsing} style={{ flex: 1, background: (input.trim() && !parsing) ? T.ac : T.sf2, border: "none", borderRadius: 10, padding: "11px 16px", color: (input.trim() && !parsing) ? "#fff" : T.txm, cursor: (input.trim() && !parsing) ? "pointer" : "default", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {parsing ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Analyzing...</> : "🧠 Analyze & Add"}
                </button>
              </div>
              {status && <div style={{ marginTop: 10, fontSize: 13, padding: "8px 12px", borderRadius: 8, background: stColor.bg, color: stColor.fg, border: `1px solid ${stColor.bd}` }}>{status.t}</div>}
            </Card>

            {warns.length > 0 && warns.map((w, i) => <Alert key={i} danger={w.d}>{w.m}</Alert>)}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Metric label="Calories" value={totals.calories} unit="kcal" color={T.cal} />
              <Metric label="Protein" value={totals.protein} unit="g" color={T.prot} target={145} warn={totals.protein < 145 && dayItems.length > 2} />
              <Metric label="Fat" value={totals.fat} unit="g" color={T.fat} />
              <Metric label="Net Carbs" value={totals.netCarbs} unit="g" color={T.carb} target="30–35" warn={totals.netCarbs > 40 || (totals.netCarbs > 0 && totals.netCarbs < 30)} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Metric label="Sodium" value={totals.sodium} unit="mg" color={T.na} />
              <Metric label="Potassium" value={totals.potassium} unit="mg" color={T.k} />
              <Metric label="Magnesium" value={totals.magnesium} unit="mg" color={T.mg} />
            </div>

            {dayItems.length > 0 && <Card style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, fontSize: 12.5, fontWeight: 600, color: T.txd }}>Today's Log · {dayItems.length} item{dayItems.length > 1 ? "s" : ""}</div>
              {dayItems.map((it) => (
                <div key={it.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: T.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: T.txd, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {ri(it.calories)}cal · {r1(it.protein)}p · {r1(it.fat)}f · {r1(Math.max(0, (it.carbs || 0) - (it.fiber || 0)))}nc
                      <span style={{ color: T.txm }}> · {ri(it.sodium)}Na · {ri(it.potassium)}K · {ri(it.magnesium)}Mg</span>
                    </div>
                  </div>
                  <button onClick={() => deleteItem(it.id)} style={{ background: "none", border: "none", color: T.txm, cursor: "pointer", fontSize: 15 }}>✕</button>
                </div>
              ))}
            </Card>}

            <Card>
              <button onClick={genLink} disabled={!dayItems.length} style={{ width: "100%", background: dayItems.length ? "#2563eb" : T.sf2, border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, color: dayItems.length ? "#fff" : T.txm, cursor: dayItems.length ? "pointer" : "default" }}>📤 Submit Day to Google Form</button>
              {formLink && <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <a href={formLink} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "#1d4ed8", borderRadius: 10, padding: 14, color: "#fff", textAlign: "center", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>🔗 Open Prefilled Form →</a>
                <button onClick={() => { navigator.clipboard.writeText(formLink).then(() => setCopied(true)); }} style={{ background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 10, color: copied ? T.ac : T.txd, cursor: "pointer", fontSize: 13 }}>{copied ? "✓ Copied!" : "📋 Copy Link"}</button>
              </div>}
            </Card>
          </>}

          {/* ═══ WEEK ═══ */}
          {tab === "week" && <>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.txd, marginBottom: 12 }}>Weekly Averages · {wkData.filter((d) => d.has).length} days logged</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Metric label="Avg Cal" value={wkAvg.calories} unit="kcal" color={T.cal} />
                <Metric label="Avg Prot" value={wkAvg.protein} unit="g" color={T.prot} target={145} />
                <Metric label="Avg Fat" value={wkAvg.fat} unit="g" color={T.fat} warn={wkAvg.fat > 80} />
                <Metric label="Avg NC" value={wkAvg.netCarbs} unit="g" color={T.carb} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                <Metric label="Avg Na" value={wkAvg.sodium} unit="mg" color={T.na} />
                <Metric label="Avg K" value={wkAvg.potassium} unit="mg" color={T.k} />
                <Metric label="Avg Mg" value={wkAvg.magnesium} unit="mg" color={T.mg} />
              </div>
            </Card>
            {warns.filter((w) => w.m.toLowerCase().includes("weekly")).map((w, i) => <Alert key={i} danger={w.d}>{w.m}</Alert>)}
            {mounted && <>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.txd, marginBottom: 14 }}>Macros · Weekly</div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={wkData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.bd} />
                    <XAxis dataKey="label" stroke={T.txm} fontSize={11} />
                    <YAxis stroke={T.txm} fontSize={10} />
                    <Tooltip contentStyle={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 8, fontSize: 11.5, color: T.tx }} />
                    <Legend wrapperStyle={{ fontSize: 10.5 }} />
                    <Line type="monotone" dataKey="calories" name="Cal" stroke={T.cal} strokeWidth={2} dot={{ fill: T.cal, r: 3 }} />
                    <Line type="monotone" dataKey="protein" name="Prot" stroke={T.prot} strokeWidth={2} dot={{ fill: T.prot, r: 3 }} />
                    <Line type="monotone" dataKey="fat" name="Fat" stroke={T.fat} strokeWidth={2} dot={{ fill: T.fat, r: 3 }} />
                    <Line type="monotone" dataKey="netCarbs" name="NC" stroke={T.carb} strokeWidth={2} dot={{ fill: T.carb, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.txd, marginBottom: 14 }}>Electrolytes · Weekly (mg)</div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={wkData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.bd} />
                    <XAxis dataKey="label" stroke={T.txm} fontSize={11} />
                    <YAxis stroke={T.txm} fontSize={10} />
                    <Tooltip contentStyle={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 8, fontSize: 11.5, color: T.tx }} />
                    <Legend wrapperStyle={{ fontSize: 10.5 }} />
                    <Line type="monotone" dataKey="sodium" name="Na" stroke={T.na} strokeWidth={2} dot={{ fill: T.na, r: 3 }} />
                    <Line type="monotone" dataKey="potassium" name="K" stroke={T.k} strokeWidth={2} dot={{ fill: T.k, r: 3 }} />
                    <Line type="monotone" dataKey="magnesium" name="Mg" stroke={T.mg} strokeWidth={2} dot={{ fill: T.mg, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>}
          </>}

          {/* ═══ SETTINGS ═══ */}
          {tab === "settings" && <>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.txd }}>Custom Foods ({(data.customFoods || []).length})</div>
                <button onClick={() => setAddFood(true)} style={{ background: T.ac, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>+ Add</button>
              </div>
              {(data.customFoods || []).map((f) => (
                <div key={f.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: T.tx }}>{f.name}</div>
                    <div style={{ fontSize: 10.5, color: T.txd, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{f.calories}cal · {f.protein}p · {f.fat}f · {f.carbs}c · Na:{f.sodium} K:{f.potassium} Mg:{f.magnesium}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditFood(f)} style={{ background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 6, padding: "4px 10px", color: T.txd, cursor: "pointer", fontSize: 11 }}>Edit</button>
                    <button onClick={() => delCF(f.id)} style={{ background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 6, padding: "4px 10px", color: T.err, cursor: "pointer", fontSize: 11 }}>Del</button>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.txd, marginBottom: 10 }}>Targets</div>
              <div style={{ fontSize: 12.5, color: T.txd, lineHeight: 1.9 }}>
                <div>🎯 Protein: <span style={{ color: T.prot, fontWeight: 600 }}>145g/day</span></div>
                <div>🎯 Net Carbs: <span style={{ color: T.carb, fontWeight: 600 }}>30–35g</span> · <span style={{ color: T.warn }}>40g</span> upper · <span style={{ color: T.err }}>45g</span> max</div>
                <div>🎯 Fat: weekly avg under <span style={{ color: T.fat, fontWeight: 600 }}>80g/day</span></div>
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.txd, marginBottom: 10 }}>Data</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={doExport} style={{ flex: 1, background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10, color: T.tx, cursor: "pointer", fontSize: 13 }}>📤 Export</button>
                <button onClick={doImport} style={{ flex: 1, background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10, color: T.tx, cursor: "pointer", fontSize: 13 }}>📥 Import</button>
              </div>
            </Card>
          </>}
        </div>

        {review && <ReviewModal items={review} onConfirm={confirmItems} onCancel={() => { setReview(null); setStatus(null); }} />}
        {editFood && <FoodEditor food={editFood} onSave={saveCF} onClose={() => setEditFood(null)} />}
        {addFood && <FoodEditor food={null} onSave={saveCF} onClose={() => setAddFood(false)} />}
      </div>
    </>
  );
}
