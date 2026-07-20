import React, { useState, useEffect, useCallback } from "react";
import { Crown, Calendar, Plus, Trash2, X, Clock, Phone, ChevronLeft, ChevronRight, Euro, Sparkles, Check, Image as ImageIcon, Video, Link as LinkIcon, Play, CreditCard, Share2, Copy, Send, ShieldCheck, ChevronDown, LogOut, Lock, User, UserPlus, AlertTriangle, Hourglass, Menu, BarChart2, Download, FileSpreadsheet, Mail, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import storage from "./storage.js";

if (typeof window !== "undefined") window.storage = storage;

// ── Password validation ───────────────────────────────────────────
function validatePassword(pwd) {
  if (pwd.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[a-zA-Z]/.test(pwd)) return "Le mot de passe doit contenir au moins une lettre.";
  if (!/[0-9]/.test(pwd)) return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isPhone(v) { return /^[0-9+\s]{6,}$/.test(v.replace(/\s/g, "")); }

// ── Responsive hook ───────────────────────────────────────────────
function useResponsive() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 768);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { isDesktop: width >= 768, width };
}

const SERVICES = [
  { id: "s1", name: "Retwist + Coiffure", price: 50, duration: 90 },
  { id: "s2", name: "Resserage crochet broderie", price: 150, duration: 180, from: true },
  { id: "s3", name: "Resserage crochet latshing", price: 100, duration: 150, from: true },
  { id: "s4", name: "Départ de locks crochet broderie", price: 250, duration: 240, from: true },
  { id: "s5", name: "Départ micro locks twist ou braid", price: 350, duration: 300, from: true },
  { id: "s6", name: "Départ de locks en vanille ou braid", price: 130, duration: 180 },
  { id: "s7", name: "Créations locks avec cheveux naturel", price: null, duration: 240, devis: true },
  { id: "s8", name: "Pose extension locks", price: 180, duration: 200, from: true },
  { id: "s9", name: "Décoloration et coloration", price: 40, duration: 60, extra: true },
  { id: "s10", name: "Shampoing soins retwist", price: 70, duration: 45, extra: true },
  { id: "s11", name: "Décapage et retwist", price: 100, duration: 90, extra: true },
];

const GOLD       = "#c9a259";
const GOLD_LIGHT = "#e8cb8c";
const BG         = "#0c0a08";
const BG2        = "#141009";
const BORDER     = "#231d12";
const TEXT       = "#f3ead9";
const TEXT_MUTED = "#9c8c6e";
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pad(n) { return n.toString().padStart(2, "0"); }

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

const DEFAULT_SETTINGS = {
  salonName: "Locks by Slo",
  lydia: "",
  paypal: "",
  stripe: "",
  iban: "",
  ibanName: "",
  depositPercent: 30,
  cgv: "Le rendez-vous est confirmé après réception de l'acompte. Acompte non remboursable en cas d'annulation moins de 48h avant le rendez-vous. Merci d'arriver 5 min avant l'heure prévue.",
};

async function hashPassword(pwd) {
  try {
    const enc = new TextEncoder().encode(pwd);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    let h = 0;
    for (let i = 0; i < pwd.length; i++) { h = (h << 5) - h + pwd.charCodeAt(i); h |= 0; }
    return String(h);
  }
}

function formatDateFr(datetime) {
  const d = new Date(datetime.replace(" ", "T"));
  const day = WEEKDAYS[(d.getDay() + 6) % 7];
  return `${day} ${d.getDate()} ${MONTHS[d.getMonth()]} à ${pad(d.getHours())}h${pad(d.getMinutes())}`;
}

function buildConfirmationMessage(appt, settings) {
  const lines = [];
  lines.push(`✨ ${settings.salonName} ✨`);
  lines.push("");
  lines.push(`Bonjour ${appt.clientName}, votre rendez-vous est confirmé :`);
  lines.push(`📅 ${formatDateFr(appt.datetime)}`);
  lines.push(`💇 ${appt.service}`);
  if (appt.price) lines.push(`💶 Prix total : ${appt.price} €`);
  if (appt.deposit) lines.push(`💳 Acompte à régler : ${appt.deposit} €`);
  const links = [];
  if (settings.lydia) links.push(`Lydia : ${settings.lydia}`);
  if (settings.paypal) links.push(`PayPal : ${settings.paypal}`);
  if (settings.stripe) links.push(`Paiement en ligne : ${settings.stripe}`);
  if (settings.iban) links.push(`Virement IBAN : ${settings.iban}${settings.ibanName ? ` (${settings.ibanName})` : ""}`);
  if (appt.deposit && links.length) {
    lines.push("");
    lines.push("Pour régler l'acompte :");
    links.forEach((l) => lines.push(`• ${l}`));
  }
  if (settings.cgv) {
    lines.push("");
    lines.push(settings.cgv);
  }
  lines.push("");
  lines.push("À très vite ! 🖤");
  return lines.join("\n");
}

const ADMIN_USERNAME = "SloLocks";
const ADMIN_PASSWORD = "Slohairs971";

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("lbs_session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (s) => {
    setSession(s);
    try { localStorage.setItem("lbs_session", JSON.stringify(s)); } catch {}
  };

  const logout = () => {
    setSession(null);
    try { localStorage.removeItem("lbs_session"); } catch {}
  };

  if (!session) return <AuthScreen onLogin={login} />;
  if (session.role === "admin") return <AdminApp onLogout={logout} />;
  return <ClientApp session={session} onLogout={logout} />;
}

function AdminApp({ onLogout }) {
  const { isDesktop } = useResponsive();
  const [appointments, setAppointments] = useState([]);
  const [media, setMedia] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [view, setView] = useState("agenda");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // load
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.list("appt:");
        if (res && res.keys && res.keys.length) {
          const items = [];
          for (const k of res.keys) {
            try {
              const r = await window.storage.get(k);
              if (r) items.push(JSON.parse(r.value));
            } catch (e) {}
          }
          setAppointments(items.sort((a, b) => a.datetime.localeCompare(b.datetime)));
        }
      } catch (e) {
        // no data yet
      }
      try {
        const res2 = await window.storage.list("media:");
        if (res2 && res2.keys && res2.keys.length) {
          const items = [];
          for (const k of res2.keys) {
            try {
              const r = await window.storage.get(k);
              if (r) items.push(JSON.parse(r.value));
            } catch (e) {}
          }
          setMedia(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        }
      } catch (e) {
        // no data yet
      }
      try {
        const res3 = await window.storage.get("settings:payment");
        if (res3) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(res3.value) });
      } catch (e) {
        // no settings yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (appt) => {
    try {
      setSaving(true);
      const r = await window.storage.set(`appt:${appt.id}`, JSON.stringify(appt));
      if (!r) setError("Échec de l'enregistrement.");
    } catch (e) {
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, []);

  const removeAppt = useCallback(async (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    try {
      await window.storage.delete(`appt:${id}`);
    } catch (e) {}
  }, []);

  const addAppt = (appt) => {
    setAppointments((prev) => [...prev, appt].sort((a, b) => a.datetime.localeCompare(b.datetime)));
    persist(appt);
  };

  const persistMedia = useCallback(async (item) => {
    try {
      setSaving(true);
      const r = await window.storage.set(`media:${item.id}`, JSON.stringify(item));
      if (!r) setError("Échec de l'enregistrement.");
    } catch (e) {
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, []);

  const addMedia = (item) => {
    setMedia((prev) => [item, ...prev]);
    persistMedia(item);
  };

  const removeMedia = useCallback(async (id) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    try {
      await window.storage.delete(`media:${id}`);
    } catch (e) {}
  }, []);

  const saveSettings = useCallback(async (next) => {
    setSettings(next);
    try {
      setSaving(true);
      const r = await window.storage.set("settings:payment", JSON.stringify(next));
      if (!r) setError("Échec de l'enregistrement.");
    } catch (e) {
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, []);

  const updateApptDeposit = useCallback(async (id, patch) => {
    setAppointments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      const updated = next.find((a) => a.id === id);
      if (updated) {
        window.storage.set(`appt:${id}`, JSON.stringify(updated)).catch(() => {});
      }
      return next;
    });
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const apptsByDay = (d) => {
    const key = dateKey(d);
    return appointments
      .filter((a) => a.datetime.startsWith(key))
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
  };

  const TABS = [
    { k: "agenda",   label: "Rendez-vous", icon: Calendar },
    { k: "tarifs",   label: "Tarifs",      icon: Euro },
    { k: "galerie",  label: "Galerie",     icon: ImageIcon },
    { k: "paiement", label: "Paiement",    icon: CreditCard },
    { k: "rapports", label: "Rapports",    icon: BarChart2 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Outfit', 'Segoe UI', sans-serif", display: isDesktop ? "flex" : "block" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .btn { transition: all .15s ease; cursor: pointer; }
        .btn:active { transform: scale(0.97); }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3a3226; border-radius: 4px; }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      {isDesktop && (
        <aside style={{
          width: 220, flexShrink: 0, background: "#0f0c07",
          borderRight: `1px solid ${BORDER}`, minHeight: "100vh",
          position: "sticky", top: 0, display: "flex", flexDirection: "column",
          padding: "28px 0 24px",
        }}>
          <div style={{ padding: "0 20px 28px" }}>
            <Crown size={22} color={GOLD} strokeWidth={1.8} style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, letterSpacing: 1, color: GOLD_LIGHT, lineHeight: 1.1 }}>
              LOCKS <span style={{ fontFamily: "cursive", fontWeight: 400, fontSize: 15, color: TEXT }}>by slo</span>
            </div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3, letterSpacing: 0.5 }}>Espace administrateur</div>
          </div>

          <nav style={{ flex: 1 }}>
            {TABS.map((t) => (
              <button key={t.k} className="btn" onClick={() => setView(t.k)} style={{
                width: "100%", padding: "13px 20px", display: "flex", alignItems: "center", gap: 12,
                background: view === t.k ? "rgba(201,162,89,0.12)" : "none",
                border: "none", borderLeft: `3px solid ${view === t.k ? GOLD : "transparent"}`,
                color: view === t.k ? GOLD_LIGHT : TEXT_MUTED, fontSize: 14, fontWeight: 600, textAlign: "left",
              }}>
                <t.icon size={17} /> {t.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: "0 16px" }}>
            <button className="btn" onClick={onLogout} style={{
              width: "100%", padding: "10px 14px", borderRadius: 9,
              background: "none", border: `1px solid ${BORDER}`, color: TEXT_MUTED,
              fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}>
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </aside>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Mobile header */}
        {!isDesktop && (
          <header style={{
            padding: "20px 20px 0", borderBottom: `1px solid ${BORDER}`,
            background: "linear-gradient(180deg, #161108 0%, #0c0a08 100%)",
            position: "sticky", top: 0, zIndex: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Crown size={26} color={GOLD} strokeWidth={1.8} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, letterSpacing: 1, color: GOLD_LIGHT, lineHeight: 1.1 }}>
                  LOCKS <span style={{ fontFamily: "cursive", fontWeight: 400, fontSize: 18, color: TEXT }}>by slo</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5 }}>Espace administrateur</div>
              </div>
              <button className="btn" onClick={onLogout} style={{
                background: "none", border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: 9,
                padding: "7px 11px", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
              }}>
                <LogOut size={14} />
              </button>
            </div>
            <div style={{ margin: "14px 0 0", display: "flex", gap: 6, overflowX: "auto" }}>
              {TABS.map((t) => (
                <button key={t.k} className="btn" onClick={() => setView(t.k)} style={{
                  flex: "0 0 auto", minWidth: 80, padding: "9px 12px", borderRadius: 10,
                  border: `1px solid ${view === t.k ? GOLD : BORDER}`,
                  background: view === t.k ? "rgba(201,162,89,0.12)" : "transparent",
                  color: view === t.k ? GOLD_LIGHT : TEXT_MUTED, fontSize: 12.5, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap",
                }}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </header>
        )}

        {/* Desktop page title */}
        {isDesktop && (
          <div style={{ padding: "28px 32px 0", borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "'Playfair Display', serif" }}>
              {TABS.find(t => t.k === view)?.label}
            </div>
          </div>
        )}

        <main style={{ padding: isDesktop ? "28px 32px 60px" : "20px 16px 100px", maxWidth: isDesktop ? 1100 : 920, margin: "0 auto" }}>
          {error && (
            <div style={{ background: "#3a1414", border: "1px solid #6b2424", color: "#f3b8b8", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          {view === "agenda" && (
            <AgendaView
              weekStart={weekStart} setWeekStart={setWeekStart}
              days={days} apptsByDay={apptsByDay}
              onAdd={(d) => { setFormDate(d); setShowForm(true); }}
              onRemove={removeAppt} onUpdateDeposit={updateApptDeposit}
              settings={settings} loaded={loaded} isDesktop={isDesktop}
            />
          )}
          {view === "tarifs"   && <TarifsView isAdmin={true} />}
          {view === "galerie"  && <GalerieView media={media} onAdd={addMedia} onRemove={removeMedia} loaded={loaded} isDesktop={isDesktop} />}
          {view === "paiement" && <PaiementView settings={settings} onSave={saveSettings} loaded={loaded} />}
          {view === "rapports" && <RapportsView appointments={appointments} loaded={loaded} />}
        </main>
      </div>

      <button className="btn" onClick={() => { setFormDate(new Date()); setShowForm(true); }} style={{
        position: "fixed", bottom: 28, right: 28,
        width: isDesktop ? 52 : 56, height: isDesktop ? 52 : 56, borderRadius: "50%",
        background: GOLD, color: "#1a1409", border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(201,162,89,0.35)", zIndex: 30,
      }} aria-label="Nouveau rendez-vous">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showForm && (
        <ApptForm defaultDate={formDate} settings={settings}
          onClose={() => setShowForm(false)}
          onSave={(appt) => { addAppt(appt); setShowForm(false); }}
          isDesktop={isDesktop}
        />
      )}

      {saving && (
        <div style={{ position: "fixed", top: 10, right: 10, fontSize: 11, color: TEXT_MUTED, zIndex: 40 }}>
          Enregistrement…
        </div>
      )}
    </div>
  );
}

function AgendaView({ weekStart, setWeekStart, days, apptsByDay, onAdd, onRemove, onUpdateDeposit, settings, loaded, isDesktop }) {
  const today = dateKey(new Date());

  const shiftWeek = (n) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + n * 7);
    setWeekStart(d);
  };

  const weekLabel = `${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()].slice(0,3)} ${days[6].getFullYear()}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <button className="btn" onClick={() => shiftWeek(-1)} style={navBtnStyle}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: GOLD_LIGHT, fontWeight: 600 }}>{weekLabel}</div>
          <button className="btn" onClick={() => setWeekStart(startOfWeek(new Date()))} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 11, textDecoration: "underline", padding: 2 }}>
            Aujourd'hui
          </button>
        </div>
        <button className="btn" onClick={() => shiftWeek(1)} style={navBtnStyle}><ChevronRight size={18} /></button>
      </div>

      {!loaded && <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 40, fontSize: 13 }}>Chargement…</div>}

      {loaded && (
        <div style={{ display: isDesktop ? "grid" : "flex", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, flexDirection: isDesktop ? undefined : "column", gap: 10 }}>
          {days.map((d) => {
            const list = apptsByDay(d);
            const isToday = dateKey(d) === today;
            return (
              <div key={dateKey(d)} style={{
                background: isToday ? "rgba(201,162,89,0.06)" : "#141009",
                border: `1px solid ${isToday ? "#5a4a28" : "#231d12"}`,
                borderRadius: 12, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: list.length ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? GOLD_LIGHT : "#cfc2a4" }}>{WEEKDAYS[(d.getDay()+6)%7]}</span>
                    <span style={{ fontSize: 13, color: TEXT_MUTED }}>{d.getDate()} {MONTHS[d.getMonth()].slice(0,3)}</span>
                  </div>
                  <button className="btn" onClick={() => onAdd(d)} style={{
                    background: "none", border: `1px solid #3a3226`, color: GOLD, borderRadius: 8,
                    width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Plus size={14} />
                  </button>
                </div>
                {list.length === 0 ? null : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {list.map((a) => (
                      <ApptCard key={a.id} appt={a} settings={settings} onRemove={() => onRemove(a.id)} onUpdateDeposit={onUpdateDeposit} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildPaymentMessage(appt, settings) {
  const lines = [];
  lines.push(`✨ ${settings.salonName || "Locks by Slo"} ✨`);
  lines.push(`Bonjour ${appt.clientName} 🌺`);
  lines.push(`Votre rendez-vous du ${formatDateFr(appt.datetime)} est confirmé !`);
  lines.push(`💇 ${appt.service}${appt.price ? ` — ${appt.price} €` : ""}`);
  lines.push(``);
  if (appt.deposit) {
    lines.push(`💳 Acompte à régler : *${appt.deposit} €*`);
    lines.push(`Choisissez votre mode de paiement :`);
    lines.push(``);
    if (settings.paypal)  lines.push(`• PayPal → ${settings.paypal}`);
    if (settings.stripe)  lines.push(`• SumUp/Stripe → ${settings.stripe}`);
    if (settings.lydia)   lines.push(`• Lydia → ${settings.lydia}`);
    if (settings.iban)    lines.push(`• Virement IBAN : ${settings.iban}${settings.ibanName ? ` (${settings.ibanName})` : ""}`);
    lines.push(``);
  }
  if (settings.cgv) lines.push(settings.cgv);
  lines.push(`À très vite ! 🖤🥥`);
  return lines.join("\n");
}

function ApptCard({ appt: a, settings, onRemove, onUpdateDeposit }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const phone = (a.phone || "").replace(/[^0-9+]/g, "");
  const waPhone = phone.startsWith("0") ? "33" + phone.slice(1) : phone;

  const sendWhatsApp = () => {
    const text = buildPaymentMessage(a, settings);
    const encoded = encodeURIComponent(text);
    if (phone) {
      window.open(`https://wa.me/${waPhone}?text=${encoded}`, "_blank");
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const sendSMS = () => {
    const text = buildPaymentMessage(a, settings);
    const encoded = encodeURIComponent(text);
    if (phone) {
      window.open(`sms:${phone}?body=${encoded}`, "_blank");
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const copyMsg = async () => {
    const text = buildPaymentMessage(a, settings);
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: "#180e06", borderRadius: 9, padding: "9px 11px",
      borderLeft: `3px solid ${a.status === "pending" ? "#c98a3a" : GOLD}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Clock size={12} color={GOLD} /> {a.datetime.slice(11,16)} · {a.clientName}
            {a.status === "pending" && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, color: "#f0c080", background: "rgba(201,138,58,0.18)",
                border: "1px solid #6b4a1e", borderRadius: 6, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 3,
              }}><Hourglass size={9} /> DEMANDE</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{a.service}{a.price ? ` · ${a.price} €` : ""}</div>
          {a.phone && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={10} /> {a.phone}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <button className="btn" onClick={() => setExpanded((e) => !e)} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 4 }}>
            <ChevronDown size={15} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          <button className="btn" onClick={onRemove} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #2a2418" }}>

          {/* Confirm button */}
          {a.status === "pending" && (
            <button className="btn" onClick={() => onUpdateDeposit(a.id, { status: "confirmed" })} style={{
              width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #3a7a4a",
              background: "rgba(63,155,90,0.12)", color: "#9fe0ad", fontSize: 12.5, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10,
            }}>
              <Check size={14} /> Confirmer ce rendez-vous
            </button>
          )}

          {/* Deposit row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 0 }}>Acompte (€)</label>
            <input
              type="number" min="0" value={a.deposit || ""}
              onChange={(e) => onUpdateDeposit(a.id, { deposit: e.target.value ? Number(e.target.value) : 0 })}
              placeholder="0"
              style={{ ...inputStyle, padding: "6px 9px", fontSize: 12.5, width: 90 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: a.depositPaid ? "#7fbf8f" : "#9c8c6e", marginLeft: "auto", cursor: "pointer" }}>
              <input type="checkbox" checked={!!a.depositPaid}
                onChange={(e) => onUpdateDeposit(a.id, { depositPaid: e.target.checked })}
                style={{ accentColor: GOLD }}
              />
              {a.depositPaid ? "Acompte reçu ✅" : "En attente"}
            </label>
          </div>

          {/* Send payment link section */}
          <div style={{ marginBottom: 4, fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Envoyer le lien de paiement
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* WhatsApp */}
            <button className="btn" onClick={sendWhatsApp} style={{
              flex: 1, padding: "9px 6px", borderRadius: 9,
              background: "#25d366", color: "white", border: "none",
              fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <span style={{ fontSize: 15 }}>💬</span> WhatsApp
            </button>

            {/* SMS */}
            <button className="btn" onClick={sendSMS} style={{
              flex: 1, padding: "9px 6px", borderRadius: 9,
              background: "#2c7be5", color: "white", border: "none",
              fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              <span style={{ fontSize: 15 }}>📱</span> SMS
            </button>

            {/* Copy */}
            <button className="btn" onClick={copyMsg} style={{
              flex: 1, padding: "9px 6px", borderRadius: 9,
              background: copied ? "#3f9b5a" : "#2a2418", color: copied ? "white" : GOLD_LIGHT,
              border: `1px solid ${copied ? "#3f9b5a" : "#3a3226"}`,
              fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              {copied ? <><Check size={13} /> Copié !</> : <><Copy size={13} /> Copier</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: BG2, border: `1px solid ${BORDER}`, color: GOLD_LIGHT,
  width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
};

function ApptForm({ defaultDate, settings, onClose, onSave, isDesktop }) {
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [date, setDate] = useState(dateKey(defaultDate || new Date()));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState("");

  const service = SERVICES.find((s) => s.id === serviceId);
  const suggestedDeposit = service.price ? Math.round((service.price * (settings.depositPercent || 30)) / 100) : 0;

  const submit = () => {
    if (!clientName.trim()) return;
    onSave({
      id: uid(),
      clientName: clientName.trim(),
      phone: phone.trim(),
      service: service.name,
      price: service.price,
      datetime: `${date}T${time}`,
      notes: notes.trim(),
      deposit: deposit ? Number(deposit) : 0,
      depositPaid: false,
      status: "confirmed",
      clientId: null,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50,
      display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161108", width: "100%", maxWidth: isDesktop ? 540 : 480,
          borderRadius: isDesktop ? 16 : "18px 18px 0 0",
          padding: isDesktop ? 28 : "20px 20px calc(20px + env(safe-area-inset-bottom))",
          border: `1px solid ${BORDER}`, borderBottom: isDesktop ? `1px solid ${BORDER}` : "none",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "'Playfair Display', serif" }}>Nouveau rendez-vous</div>
          <button onClick={onClose} className="btn" style={{ background: "none", border: "none", color: TEXT_MUTED }}>
            <X size={20} />
          </button>
        </div>

        <Field label="Cliente">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom de la cliente" style={inputStyle} />
        </Field>

        <Field label="Téléphone (optionnel)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" style={inputStyle} />
        </Field>

        <Field label="Prestation">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={inputStyle}>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.price ? ` — ${s.from ? "à partir de " : ""}${s.price}€` : " — sur devis"}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Date" style={{ flex: 1 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Heure" style={{ flex: 1 }}>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Notes (optionnel)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Détails, longueur de cheveux, préférences…" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <Field label={`Acompte demandé (€)${suggestedDeposit ? ` — suggéré ${suggestedDeposit} €` : ""}`}>
          <input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder={suggestedDeposit ? String(suggestedDeposit) : "0"} style={inputStyle} />
        </Field>

        <button onClick={submit} className="btn" style={{
          width: "100%", marginTop: 8, padding: "13px", borderRadius: 10,
          background: GOLD, color: "#1a1409", border: "none", fontWeight: 700, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Check size={17} /> Enregistrer le rendez-vous
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: "block", fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 12px", borderRadius: 9,
  background: BG, border: `1px solid ${BORDER}`, color: TEXT,
  fontSize: 14, fontFamily: "inherit", outline: "none",
};

function GalerieView({ media, onAdd, onRemove, loaded, isDesktop }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ImageIcon size={16} color={GOLD} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: GOLD_LIGHT, margin: 0 }}>Galerie</h2>
        </div>
        <button className="btn" onClick={() => setShowAdd(true)} style={{
          background: "none", border: `1px solid ${GOLD}`, color: GOLD_LIGHT, borderRadius: 8,
          padding: "7px 12px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          <Plus size={14} /> Ajouter
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 18px" }}>
        Photos et vidéos issues du profil (colle un lien d'image ou un lien de Reel/vidéo Instagram).
      </p>

      {!loaded && <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 40, fontSize: 13 }}>Chargement…</div>}

      {loaded && media.length === 0 && (
        <div style={{
          textAlign: "center", padding: "50px 20px", border: "1px dashed #2a2418", borderRadius: 14, color: TEXT_MUTED,
        }}>
          <Sparkles size={22} color={GOLD} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13.5 }}>Aucune photo ou vidéo pour le moment.</div>
          <button className="btn" onClick={() => setShowAdd(true)} style={{
            marginTop: 14, background: GOLD, color: "#1a1409", border: "none", borderRadius: 9,
            padding: "9px 16px", fontSize: 13, fontWeight: 700,
          }}>
            Ajouter la première
          </button>
        </div>
      )}

      {loaded && media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
          {media.map((m) => (
            <MediaCard key={m.id} item={m} onRemove={() => onRemove(m.id)} />
          ))}
        </div>
      )}

      {showAdd && <MediaForm onClose={() => setShowAdd(false)} onSave={(item) => { onAdd(item); setShowAdd(false); }} />}
    </div>
  );
}

function MediaCard({ item, onRemove, hideRemove }) {
  return (
    <div style={{
      background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", position: "relative",
    }}>
      {item.type === "image" ? (
        <img src={item.url} alt={item.caption || "photo"} style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
          height: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #1c1610, #0c0a08)", textDecoration: "none",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
          }}>
            <Play size={18} color="#1a1409" fill="#1a1409" />
          </div>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Voir la vidéo</span>
        </a>
      )}
      {!hideRemove && (
        <button className="btn" onClick={onRemove} style={{
          position: "absolute", top: 6, right: 6, background: "rgba(12,10,8,0.75)", border: "none",
          borderRadius: 7, padding: 5, color: TEXT,
        }}>
          <Trash2 size={13} />
        </button>
      )}
      {item.caption && (
        <div style={{ padding: "8px 10px", fontSize: 11.5, color: "#cfc2a4" }}>{item.caption}</div>
      )}
    </div>
  );
}

function MediaForm({ onClose, onSave }) {
  const [type, setType] = useState("image");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const submit = () => {
    if (!url.trim()) return;
    onSave({ id: uid(), type, url: url.trim(), caption: caption.trim(), createdAt: new Date().toISOString() });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a0c04", width: "100%", maxWidth: 480,
          borderRadius: "18px 18px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          border: `1px solid ${BORDER}`, borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "'Playfair Display', serif" }}>Ajouter à la galerie</div>
          <button onClick={onClose} className="btn" style={{ background: "none", border: "none", color: TEXT_MUTED }}>
            <X size={20} />
          </button>
        </div>

        <Field label="Type">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setType("image")} className="btn" style={{
              flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${type === "image" ? GOLD : "#2a2418"}`,
              background: type === "image" ? "rgba(201,162,89,0.12)" : "transparent",
              color: type === "image" ? GOLD_LIGHT : "#9c8c6e", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13,
            }}><ImageIcon size={14} /> Photo</button>
            <button onClick={() => setType("video")} className="btn" style={{
              flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${type === "video" ? GOLD : "#2a2418"}`,
              background: type === "video" ? "rgba(201,162,89,0.12)" : "transparent",
              color: type === "video" ? GOLD_LIGHT : "#9c8c6e", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13,
            }}><Video size={14} /> Vidéo</button>
          </div>
        </Field>

        <Field label={type === "image" ? "Lien de l'image" : "Lien de la vidéo / Reel"}>
          <div style={{ position: "relative" }}>
            <LinkIcon size={14} color="#6b5d44" style={{ position: "absolute", left: 11, top: 13 }} />
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder={type === "image" ? "https://…jpg" : "https://www.instagram.com/reel/…"}
              style={{ ...inputStyle, paddingLeft: 32 }} />
          </div>
        </Field>

        <Field label="Légende (optionnel)">
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex : départ locks vanille" style={inputStyle} />
        </Field>

        <button onClick={submit} className="btn" style={{
          width: "100%", marginTop: 8, padding: "13px", borderRadius: 10,
          background: GOLD, color: "#1a1409", border: "none", fontWeight: 700, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Check size={17} /> Ajouter à la galerie
        </button>
      </div>
    </div>
  );
}
function TarifsView({ isAdmin = false }) {
  const [serviceImages, setServiceImages] = useState({}); // { [serviceId]: [{url, caption}] }
  const [selected, setSelected] = useState(null); // service object
  const [addingFor, setAddingFor] = useState(null); // serviceId
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.list("svc-img:");
        if (res && res.keys && res.keys.length) {
          const map = {};
          for (const k of res.keys) {
            try {
              const r = await window.storage.get(k);
              if (r) {
                const sid = k.replace("svc-img:", "");
                map[sid] = JSON.parse(r.value);
              }
            } catch (e) {}
          }
          setServiceImages(map);
        }
      } catch (e) {}
    })();
  }, []);

  const saveImages = async (sid, imgs) => {
    setServiceImages((prev) => ({ ...prev, [sid]: imgs }));
    try { await window.storage.set(`svc-img:${sid}`, JSON.stringify(imgs)); } catch (e) {}
  };

  const addImage = (sid) => {
    if (!newUrl.trim()) return;
    const imgs = [...(serviceImages[sid] || []), { url: newUrl.trim(), caption: newCaption.trim() }];
    saveImages(sid, imgs);
    setNewUrl(""); setNewCaption(""); setAddingFor(null);
  };

  const removeImage = (sid, idx) => {
    const imgs = (serviceImages[sid] || []).filter((_, i) => i !== idx);
    saveImages(sid, imgs);
  };

  const openService = (s) => { setSelected(s); setImgIdx(0); };

  const main = SERVICES.filter((s) => !s.extra);
  const extra = SERVICES.filter((s) => s.extra);
  const imgs = selected ? (serviceImages[selected.id] || []) : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Sparkles size={16} color={GOLD} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: GOLD_LIGHT, margin: 0 }}>Tarifs Locks by Slo</h2>
      </div>
      <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 18px" }}>
        Appuyez sur une coiffure pour voir les réalisations 📸
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {main.map((s) => {
          const count = (serviceImages[s.id] || []).length;
          return (
            <button key={s.id} className="btn" onClick={() => openService(s)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: BG2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "13px 15px",
              textAlign: "left", cursor: "pointer", width: "100%",
              transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#231d12"}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 7 }}>
                  {s.name}
                  {count > 0 && (
                    <span style={{ fontSize: 10, background: "rgba(201,162,89,0.18)", color: GOLD, border: `1px solid #3a3226`, borderRadius: 6, padding: "1px 7px" }}>
                      {count} photo{count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {s.from && <div style={{ fontSize: 11, color: TEXT_MUTED }}>à partir de</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: GOLD_LIGHT, whiteSpace: "nowrap" }}>
                  {s.devis ? "Sur devis" : `${s.price} €`}
                </div>
                <ImageIcon size={14} color="#6b5d44" />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
        Prestations complémentaires
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {extra.map((s) => (
          <div key={s.id} style={{
            background: BG2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "12px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 11.5, color: "#cfc2a4", marginBottom: 6, lineHeight: 1.3 }}>{s.name}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: GOLD_LIGHT }}>{s.price} €</div>
          </div>
        ))}
      </div>

      {/* Service image modal */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 60,
          display: "flex", flexDirection: "column",
        }} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            flex: 1, display: "flex", flexDirection: "column", maxWidth: 520, width: "100%",
            margin: "0 auto", padding: "0 0 env(safe-area-inset-bottom)",
          }}>
            {/* Header */}
            <div style={{ padding: "18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: GOLD_LIGHT }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                  {selected.devis ? "Sur devis" : `${selected.from ? "À partir de " : ""}${selected.price} €`}
                </div>
              </div>
              <button className="btn" onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: TEXT_MUTED }}>
                <X size={22} />
              </button>
            </div>

            {/* Images */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
              {imgs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px", color: TEXT_MUTED }}>
                  <ImageIcon size={28} color={GOLD} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13.5 }}>Aucune photo pour cette coiffure.</div>
                  {isAdmin && <div style={{ fontSize: 12, color: "#4a3c28", marginTop: 6 }}>Ajoutez-en depuis le bouton ci-dessous.</div>}
                </div>
              ) : (
                <div>
                  {/* Main big image */}
                  <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
                    <img src={imgs[imgIdx].url} alt={imgs[imgIdx].caption || selected.name}
                      style={{ width: "100%", maxHeight: 340, objectFit: "cover", display: "block" }} />
                    {imgs[imgIdx].caption && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", color: "white", fontSize: 12 }}>
                        {imgs[imgIdx].caption}
                      </div>
                    )}
                    {isAdmin && (
                      <button className="btn" onClick={() => removeImage(selected.id, imgIdx)} style={{
                        position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none",
                        borderRadius: 8, padding: 7, color: "#f3b8b8",
                      }}><Trash2 size={14} /></button>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {imgs.length > 1 && (
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                      {imgs.map((img, i) => (
                        <button key={i} className="btn" onClick={() => setImgIdx(i)} style={{
                          width: 64, height: 64, borderRadius: 9, overflow: "hidden", flexShrink: 0, padding: 0,
                          border: `2px solid ${i === imgIdx ? GOLD : "transparent"}`,
                        }}>
                          <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin: add image / add form */}
            {isAdmin && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2418" }}>
                {addingFor !== selected.id ? (
                  <button className="btn" onClick={() => setAddingFor(selected.id)} style={{
                    width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${GOLD}`,
                    background: "rgba(201,162,89,0.1)", color: GOLD_LIGHT, fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}>
                    <Plus size={15} /> Ajouter une photo
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="Lien de l'image (https://…)" style={{ ...inputStyle, fontSize: 13 }} />
                    <input value={newCaption} onChange={(e) => setNewCaption(e.target.value)}
                      placeholder="Légende (optionnel)" style={{ ...inputStyle, fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => addImage(selected.id)} style={{
                        flex: 1, padding: "10px", borderRadius: 9, background: GOLD, color: "#1a1409",
                        border: "none", fontWeight: 700, fontSize: 13,
                      }}><Check size={14} style={{ display: "inline", marginRight: 5 }} />Ajouter</button>
                      <button className="btn" onClick={() => { setAddingFor(null); setNewUrl(""); setNewCaption(""); }} style={{
                        padding: "10px 14px", borderRadius: 9, background: "#180e06",
                        border: `1px solid ${BORDER}`, color: TEXT_MUTED, fontSize: 13,
                      }}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaiementView({ settings, onSave, loaded }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  // Admin password change
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdOk, setPwdOk] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const changeAdminPassword = async () => {
    setPwdMsg(""); setPwdOk(false);
    if (!oldPwd || !newPwd || !newPwd2) { setPwdMsg("Remplis tous les champs."); return; }
    // Verify old password
    const isDefaultPwd = (oldPwd === ADMIN_PASSWORD);
    let customMatch = false;
    try {
      const r = await window.storage.get("auth:admin:custom");
      if (r) {
        const acc = JSON.parse(r.value);
        const h = await hashPassword(oldPwd);
        if (acc.passHash === h) customMatch = true;
      }
    } catch (e) {}
    if (!isDefaultPwd && !customMatch) { setPwdMsg("Ancien mot de passe incorrect."); return; }
    const pwdErr = validatePassword(newPwd);
    if (pwdErr) { setPwdMsg(pwdErr); return; }
    if (newPwd !== newPwd2) { setPwdMsg("Les nouveaux mots de passe ne correspondent pas."); return; }
    const passHash = await hashPassword(newPwd);
    await window.storage.set("auth:admin:custom", JSON.stringify({ username: ADMIN_USERNAME, passHash }));
    setPwdOk(true);
    setPwdMsg("Mot de passe changé avec succès !");
    setOldPwd(""); setNewPwd(""); setNewPwd2("");
  };

  const copyLink = async (val) => {
    try { await navigator.clipboard.writeText(val); } catch (e) {}
  };

  const configuredLinks = [
    { label: "Lydia", value: settings.lydia, icon: CreditCard },
    { label: "PayPal", value: settings.paypal, icon: CreditCard },
    { label: "Paiement en ligne", value: settings.stripe, icon: CreditCard },
    { label: "IBAN", value: settings.iban ? `${settings.iban}${settings.ibanName ? ` (${settings.ibanName})` : ""}` : "", icon: CreditCard },
  ].filter((l) => l.value);

  if (!loaded) return <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 40, fontSize: 13 }}>Chargement…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <CreditCard size={16} color={GOLD} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: GOLD_LIGHT, margin: 0 }}>Paiement</h2>
      </div>
      <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 18px" }}>
        Configure tes liens de paiement et tes conditions. Ils s'ajoutent automatiquement aux messages de confirmation envoyés aux clientes.
      </p>

      {configuredLinks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {configuredLinks.map((l) => (
            <div key={l.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: BG2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "11px 13px",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>{l.label}</div>
                <div style={{ fontSize: 13, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.value}</div>
              </div>
              <button type="button" className="btn" onClick={() => copyLink(l.value)} style={{
                background: "none", border: `1px solid #3a3226`, color: GOLD, borderRadius: 8,
                padding: "7px 10px", display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, flexShrink: 0, marginLeft: 10,
              }}>
                <Copy size={13} /> Copier
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: BG2, border: `1px solid ${BORDER}`, borderRadius: 13, padding: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          <ShieldCheck size={15} color={GOLD} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#cfc2a4" }}>Tes informations professionnelles</span>
        </div>

        <Field label="Nom du salon">
          <input value={form.salonName} onChange={(e) => set("salonName", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Lien Lydia">
          <input value={form.lydia} onChange={(e) => set("lydia", e.target.value)} placeholder="https://request.lydia-app.com/…" style={inputStyle} />
        </Field>

        <Field label="Lien PayPal.me">
          <input value={form.paypal} onChange={(e) => set("paypal", e.target.value)} placeholder="https://paypal.me/locksbyslo" style={inputStyle} />
        </Field>

        <Field label="Lien de paiement en ligne (Stripe, SumUp…)">
          <input value={form.stripe} onChange={(e) => set("stripe", e.target.value)} placeholder="https://…" style={inputStyle} />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="IBAN" style={{ flex: 1.4 }}>
            <input value={form.iban} onChange={(e) => set("iban", e.target.value)} placeholder="FR76 XXXX…" style={inputStyle} />
          </Field>
          <Field label="Titulaire" style={{ flex: 1 }}>
            <input value={form.ibanName} onChange={(e) => set("ibanName", e.target.value)} placeholder="Nom" style={inputStyle} />
          </Field>
        </div>

        <Field label="Acompte par défaut (%)">
          <input type="number" min="0" max="100" value={form.depositPercent} onChange={(e) => set("depositPercent", Number(e.target.value))} style={inputStyle} />
        </Field>

        <Field label="Conditions générales (envoyées avec chaque confirmation)">
          <textarea value={form.cgv} onChange={(e) => set("cgv", e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <button onClick={submit} className="btn" style={{
          width: "100%", marginTop: 4, padding: "13px", borderRadius: 10,
          background: GOLD, color: "#1a1409", border: "none", fontWeight: 700, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {saved ? <Check size={17} /> : <Send size={17} />}
          {saved ? "Enregistré !" : "Enregistrer"}
        </button>
      </div>

      <div style={{ marginTop: 16, padding: "12px 14px", border: "1px dashed #2a2418", borderRadius: 11, fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.5 }}>
        Astuce : ouvre un rendez-vous dans l'onglet Rendez-vous et appuie sur la flèche pour renseigner l'acompte et envoyer la confirmation de paiement à la cliente.
      </div>

      {/* Admin password change */}
      <div style={{ marginTop: 20, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 13, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          <KeyRound size={15} color={GOLD} />
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Changer mon mot de passe admin</span>
        </div>
        <Field label="Ancien mot de passe">
          <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="••••••••" style={inputStyle} />
        </Field>
        <Field label="Nouveau mot de passe">
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="8 car. min, 1 lettre, 1 chiffre" style={inputStyle} />
          {newPwd && (() => { const e = validatePassword(newPwd); return <div style={{ fontSize: 11, marginTop: 3, color: e ? "#f0a030" : "#9fe0ad" }}>{e || "Mot de passe fort ✓"}</div>; })()}
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} placeholder="••••••••" style={inputStyle} />
        </Field>
        {pwdMsg && (
          <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, marginBottom: 10,
            color: pwdOk ? "#9fe0ad" : "#f3b8b8",
            background: pwdOk ? "rgba(63,155,90,0.15)" : "#2a1414",
            border: `1px solid ${pwdOk ? "#2d6a3f" : "#4a2020"}`,
          }}>
            {pwdOk ? "✅" : "⚠️"} {pwdMsg}
          </div>
        )}
        <button className="btn" onClick={changeAdminPassword} style={{
          width: "100%", padding: "11px", borderRadius: 10,
          background: "rgba(201,162,89,0.15)", color: GOLD_LIGHT,
          border: `1px solid ${GOLD}`, fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <KeyRound size={15} /> Changer le mot de passe
        </button>
      </div>
    </div>
  );
}

function normalizePhone(p) {
  return (p || "").replace(/[^0-9+]/g, "");
}

async function findAdminAccount() {
  try {
    const r = await window.storage.get("auth:admin");
    return r ? JSON.parse(r.value) : null;
  } catch (e) {
    return null;
  }
}

async function saveAdminAccount(account) {
  try { await window.storage.set("auth:admin", JSON.stringify(account)); return true; } catch { return false; }
}

async function findClientByIdentifier(identifier) {
  const norm = normalizePhone(identifier);
  const normEmail = identifier.trim().toLowerCase();
  try {
    const res = await window.storage.list("auth:client:");
    if (!res || !res.keys) return null;
    for (const k of res.keys) {
      try {
        const r = await window.storage.get(k);
        if (r) {
          const rec = JSON.parse(r.value);
          if (normalizePhone(rec.phone) === norm) return rec;
          if (rec.email && rec.email.toLowerCase() === normEmail) return rec;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

// Keep old name for compatibility
const findClientByPhone = findClientByIdentifier;

function AuthScreen({ onLogin }) {
  const { isDesktop } = useResponsive();
  const [role, setRole] = useState("client");
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // phone or email for client
  const [username, setUsername] = useState(""); // admin
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const switchRole = (r) => { setRole(r); setError(""); setSuccess(""); setMode("login"); };

  // Password strength indicator
  const pwdStrength = () => {
    if (!password) return null;
    const errs = [];
    if (password.length < 8) errs.push("8 caractères min");
    if (!/[a-zA-Z]/.test(password)) errs.push("1 lettre");
    if (!/[0-9]/.test(password)) errs.push("1 chiffre");
    if (errs.length === 0) return { ok: true, msg: "Mot de passe fort ✓" };
    return { ok: false, msg: `Manque : ${errs.join(", ")}` };
  };

  const submitAdmin = async () => {
    setError(""); setSuccess("");
    if (!username.trim() || !password) { setError("Remplis tous les champs."); return; }
    // Check hardcoded first
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLogin({ role: "admin", id: "admin", name: ADMIN_USERNAME }); return;
    }
    // Check stored custom password
    try {
      const r = await window.storage.get("auth:admin:custom");
      if (r) {
        const acc = JSON.parse(r.value);
        const h = await hashPassword(password);
        if (acc.username === username.trim() && acc.passHash === h) {
          onLogin({ role: "admin", id: "admin", name: acc.username }); return;
        }
      }
    } catch (e) {}
    setError("Identifiant ou mot de passe incorrect.");
  };

  const submitClient = async () => {
    setError(""); setSuccess("");
    if (!identifier.trim() || !password) { setError("Remplis tous les champs."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Indique ton nom."); return; }
        const pwdErr = validatePassword(password);
        if (pwdErr) { setError(pwdErr); return; }
        if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
        const existing = await findClientByIdentifier(identifier);
        if (existing) { setError("Un compte existe déjà. Connecte-toi."); return; }
        const passHash = await hashPassword(password);
        const id = uid();
        const isMailId = isEmail(identifier);
        const account = {
          id, name: name.trim(),
          phone: isMailId ? "" : identifier.trim(),
          email: isMailId ? identifier.trim() : "",
          identifier: identifier.trim(),
          passHash, createdAt: new Date().toISOString()
        };
        await window.storage.set(`auth:client:${id}`, JSON.stringify(account));
        onLogin({ role: "client", id, name: account.name, phone: account.phone, email: account.email });
      } else {
        const account = await findClientByIdentifier(identifier);
        if (!account) { setError("Aucun compte trouvé. Vérifie ton identifiant."); return; }
        const passHash = await hashPassword(password);
        if (account.passHash !== passHash) { setError("Mot de passe incorrect."); return; }
        onLogin({ role: "client", id: account.id, name: account.name, phone: account.phone, email: account.email || "" });
      }
    } catch (e) {
      setError("Une erreur est survenue, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async () => {
    setError(""); setSuccess("");
    if (!identifier.trim()) { setError("Indique ton téléphone ou email."); return; }
    setBusy(true);
    try {
      const account = await findClientByIdentifier(identifier);
      if (!account) { setError("Aucun compte trouvé pour cet identifiant."); return; }
      // Store reset request
      const token = uid() + uid();
      await window.storage.set(`reset:${account.id}`, JSON.stringify({ token, createdAt: new Date().toISOString() }));
      setSuccess(`Demande envoyée ! Contacte le salon (Locks by Slo) en indiquant ton nom "${account.name}" pour recevoir ton nouveau mot de passe.`);
    } catch (e) {
      setError("Erreur, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const strength = pwdStrength();

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Outfit', 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: isDesktop ? 40 : 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        .btn { transition: all .15s ease; cursor: pointer; } .btn:active { transform: scale(0.97); }
      `}</style>

      <div style={{ width: "100%", maxWidth: isDesktop ? 460 : 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Crown size={30} color={GOLD} strokeWidth={1.8} style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, letterSpacing: 1, color: GOLD_LIGHT }}>
            LOCKS <span style={{ fontFamily: "cursive", fontWeight: 400, fontSize: 19, color: TEXT }}>by slo</span>
          </div>
          <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 4 }}>Des locks, votre style, votre identité</div>
        </div>

        {/* Role tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button className="btn" onClick={() => switchRole("client")} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${role === "client" ? GOLD : BORDER}`,
            background: role === "client" ? "rgba(201,162,89,0.12)" : "transparent",
            color: role === "client" ? GOLD_LIGHT : TEXT_MUTED, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><User size={14} /> Client(e)</button>
          <button className="btn" onClick={() => switchRole("admin")} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${role === "admin" ? GOLD : BORDER}`,
            background: role === "admin" ? "rgba(201,162,89,0.12)" : "transparent",
            color: role === "admin" ? GOLD_LIGHT : TEXT_MUTED, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><ShieldCheck size={14} /> Administrateur</button>
        </div>

        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
          {role === "admin" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,162,89,0.12)", border: `1px solid #3a3226`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={17} color={GOLD} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GOLD_LIGHT }}>Espace administrateur</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>Réservé à Locks by Slo</div>
                </div>
              </div>
              <div style={{ height: 1, background: BORDER, marginBottom: 14 }} />
              <Field label="Identifiant">
                <input value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submitAdmin()}
                  placeholder="Identifiant" style={inputStyle} />
              </Field>
              <Field label="Mot de passe">
                <div style={{ position: "relative" }}>
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submitAdmin()}
                    placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40 }} />
                  <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 10, top: 11, background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer" }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {error && <div style={errorStyle}><AlertTriangle size={13} /> {error}</div>}
              <button onClick={submitAdmin} disabled={busy} className="btn" style={submitBtnStyle}>
                <Lock size={16} /> Se connecter
              </button>
            </>
          ) : (
            <>
              {/* Client mode tabs */}
              {mode !== "forgot" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }} style={{
                    flex: 1, padding: "7px", border: "none", background: "none",
                    color: mode === "login" ? GOLD_LIGHT : TEXT_MUTED, fontSize: 12.5, fontWeight: 600,
                    borderBottom: `2px solid ${mode === "login" ? GOLD : "transparent"}`, cursor: "pointer",
                  }}>Connexion</button>
                  <button onClick={() => { setMode("signup"); setError(""); setSuccess(""); }} style={{
                    flex: 1, padding: "7px", border: "none", background: "none",
                    color: mode === "signup" ? GOLD_LIGHT : TEXT_MUTED, fontSize: 12.5, fontWeight: 600,
                    borderBottom: `2px solid ${mode === "signup" ? GOLD : "transparent"}`, cursor: "pointer",
                  }}>Créer un compte</button>
                </div>
              )}

              {mode === "forgot" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer" }}>←</button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: GOLD_LIGHT }}>Mot de passe oublié</div>
                  </div>
                  <Field label="Téléphone ou adresse email">
                    <div style={{ position: "relative" }}>
                      {isEmail(identifier) ? <Mail size={14} color={TEXT_MUTED} style={{ position: "absolute", left: 11, top: 13 }} /> : <Phone size={14} color={TEXT_MUTED} style={{ position: "absolute", left: 11, top: 13 }} />}
                      <input value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(""); setSuccess(""); }}
                        placeholder="06 12 34 56 78 ou email@..." style={{ ...inputStyle, paddingLeft: 32 }} />
                    </div>
                  </Field>
                  {error && <div style={errorStyle}><AlertTriangle size={13} /> {error}</div>}
                  {success && <div style={{ ...errorStyle, color: "#9fe0ad", background: "rgba(63,155,90,0.15)", border: "1px solid #2d6a3f" }}><Check size={13} /> {success}</div>}
                  <button onClick={submitForgot} disabled={busy} className="btn" style={submitBtnStyle}>
                    <RefreshCw size={16} /> {busy ? "Envoi…" : "Envoyer la demande"}
                  </button>
                </>
              ) : (
                <div>
                  {mode === "signup" && (
                    <Field label="Nom complet">
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" style={inputStyle} />
                    </Field>
                  )}
                  <Field label="Téléphone ou adresse email">
                    <div style={{ position: "relative" }}>
                      {isEmail(identifier) ? <Mail size={14} color={TEXT_MUTED} style={{ position: "absolute", left: 11, top: 13 }} /> : <Phone size={14} color={TEXT_MUTED} style={{ position: "absolute", left: 11, top: 13 }} />}
                      <input value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                        placeholder="06 12 34 56 78 ou email@..." style={{ ...inputStyle, paddingLeft: 32 }} />
                    </div>
                  </Field>
                  <Field label="Mot de passe">
                    <div style={{ position: "relative" }}>
                      <input type={showPwd ? "text" : "password"} value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && submitClient()}
                        placeholder={mode === "signup" ? "8 caractères min, 1 lettre, 1 chiffre" : "••••••••"}
                        style={{ ...inputStyle, paddingRight: 40 }} />
                      <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 10, top: 11, background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer" }}>
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {mode === "signup" && strength && (
                      <div style={{ fontSize: 11, marginTop: 4, color: strength.ok ? "#9fe0ad" : "#f0a030" }}>{strength.msg}</div>
                    )}
                  </Field>
                  {mode === "signup" && (
                    <Field label="Confirmer le mot de passe">
                      <div style={{ position: "relative" }}>
                        <input type={showConfirm ? "text" : "password"} value={confirm}
                          onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                          style={{ ...inputStyle, paddingRight: 40 }} />
                        <button onClick={() => setShowConfirm(p => !p)} style={{ position: "absolute", right: 10, top: 11, background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer" }}>
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                  )}
                  {error && <div style={errorStyle}><AlertTriangle size={13} /> {error}</div>}
                  <button onClick={submitClient} disabled={busy} className="btn" style={submitBtnStyle}>
                    {mode === "signup" ? <><UserPlus size={16} /> Créer mon compte</> : <><Lock size={16} /> {busy ? "Connexion…" : "Se connecter"}</>}
                  </button>
                  {mode === "login" && (
                    <button onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }} style={{
                      width: "100%", marginTop: 10, background: "none", border: "none",
                      color: TEXT_MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline",
                    }}>Mot de passe oublié ?</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const errorStyle = {
  display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#f3b8b8",
  background: "#2a1414", border: "1px solid #4a2020", borderRadius: 8, padding: "8px 10px", marginBottom: 12,
};

const submitBtnStyle = {
  width: "100%", marginTop: 4, padding: "12px", borderRadius: 10,
  background: GOLD, color: "#1a1409", border: "none", fontWeight: 700, fontSize: 14,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

function ClientApp({ session, onLogout }) {
  const { isDesktop } = useResponsive();
  const [appointments, setAppointments] = useState([]);
  const [media, setMedia] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("rdv");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.list("appt:");
        if (res && res.keys && res.keys.length) {
          const items = [];
          for (const k of res.keys) {
            try {
              const r = await window.storage.get(k);
              if (r) items.push(JSON.parse(r.value));
            } catch (e) {}
          }
          setAppointments(items);
        }
      } catch (e) {}
      try {
        const res2 = await window.storage.list("media:");
        if (res2 && res2.keys && res2.keys.length) {
          const items = [];
          for (const k of res2.keys) {
            try {
              const r = await window.storage.get(k);
              if (r) items.push(JSON.parse(r.value));
            } catch (e) {}
          }
          setMedia(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        }
      } catch (e) {}
      try {
        const r3 = await window.storage.get("settings:payment");
        if (r3) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(r3.value) });
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const myAppts = appointments
    .filter((a) => a.clientId === session.id || normalizePhone(a.phone) === normalizePhone(session.phone))
    .sort((a, b) => a.datetime.localeCompare(b.datetime));

  const upcoming = myAppts.filter((a) => a.datetime >= dateKey(new Date()));
  const past = myAppts.filter((a) => a.datetime < dateKey(new Date()));

  const requestAppt = async (appt) => {
    setAppointments((prev) => [...prev, appt]);
    try {
      setSaving(true);
      await window.storage.set(`appt:${appt.id}`, JSON.stringify(appt));
    } catch (e) {} finally {
      setSaving(false);
    }
    setShowForm(false);
  };

  const CLIENT_TABS = [
    { k: "rdv",     label: "Mes rendez-vous", icon: Calendar },
    { k: "tarifs",  label: "Tarifs",          icon: Euro },
    { k: "galerie", label: "Galerie",          icon: ImageIcon },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Outfit', 'Segoe UI', sans-serif", display: isDesktop ? "flex" : "block" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .btn { transition: all .15s ease; cursor: pointer; }
        .btn:active { transform: scale(0.97); }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3a3226; border-radius: 4px; }
      `}</style>

      {/* Desktop sidebar */}
      {isDesktop && (
        <aside style={{
          width: 220, flexShrink: 0, background: "#0f0c07",
          borderRight: `1px solid ${BORDER}`, minHeight: "100vh",
          position: "sticky", top: 0, display: "flex", flexDirection: "column", padding: "28px 0 24px",
        }}>
          <div style={{ padding: "0 20px 20px" }}>
            <Crown size={22} color={GOLD} strokeWidth={1.8} style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, letterSpacing: 1, color: GOLD_LIGHT, lineHeight: 1.1 }}>
              LOCKS <span style={{ fontFamily: "cursive", fontWeight: 400, fontSize: 15, color: TEXT }}>by slo</span>
            </div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3 }}>Bonjour {session.name.split(" ")[0]} 👋</div>
          </div>
          <nav style={{ flex: 1 }}>
            {CLIENT_TABS.map((t) => (
              <button key={t.k} className="btn" onClick={() => setView(t.k)} style={{
                width: "100%", padding: "13px 20px", display: "flex", alignItems: "center", gap: 12,
                background: view === t.k ? "rgba(201,162,89,0.12)" : "none",
                border: "none", borderLeft: `3px solid ${view === t.k ? GOLD : "transparent"}`,
                color: view === t.k ? GOLD_LIGHT : TEXT_MUTED, fontSize: 14, fontWeight: 600, textAlign: "left",
              }}>
                <t.icon size={17} /> {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "0 16px" }}>
            <button className="btn" onClick={onLogout} style={{
              width: "100%", padding: "10px 14px", borderRadius: 9,
              background: "none", border: `1px solid ${BORDER}`, color: TEXT_MUTED,
              fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}>
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Mobile header */}
        {!isDesktop && (
          <header style={{
            padding: "20px 20px 0", borderBottom: `1px solid ${BORDER}`,
            background: "linear-gradient(180deg, #161108 0%, #0c0a08 100%)", position: "sticky", top: 0, zIndex: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Crown size={26} color={GOLD} strokeWidth={1.8} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, letterSpacing: 1, color: GOLD_LIGHT, lineHeight: 1.1 }}>
                  LOCKS <span style={{ fontFamily: "cursive", fontWeight: 400, fontSize: 18, color: TEXT }}>by slo</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5 }}>Bonjour {session.name.split(" ")[0]}</div>
              </div>
              <button className="btn" onClick={onLogout} style={{
                background: "none", border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: 9,
                padding: "7px 11px", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
              }}>
                <LogOut size={14} />
              </button>
            </div>
            <div style={{ margin: "14px 0 0", display: "flex", gap: 6, overflowX: "auto" }}>
              {CLIENT_TABS.map((t) => (
                <button key={t.k} className="btn" onClick={() => setView(t.k)} style={{
                  flex: "0 0 auto", minWidth: 80, padding: "9px 12px", borderRadius: 10,
                  border: `1px solid ${view === t.k ? GOLD : BORDER}`,
                  background: view === t.k ? "rgba(201,162,89,0.12)" : "transparent",
                  color: view === t.k ? GOLD_LIGHT : TEXT_MUTED, fontSize: 12.5, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap",
                }}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </header>
        )}

        {isDesktop && (
          <div style={{ padding: "28px 32px 0", borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "'Playfair Display', serif" }}>
              {CLIENT_TABS.find(t => t.k === view)?.label}
            </div>
          </div>
        )}

        <main style={{ padding: isDesktop ? "28px 32px 60px" : "20px 16px 100px", maxWidth: isDesktop ? 900 : 920, margin: "0 auto" }}>
          {view === "rdv" && (
            <div>
              {!loaded && <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 40, fontSize: 13 }}>Chargement…</div>}
              {loaded && myAppts.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", border: "1px dashed #2a2418", borderRadius: 14, color: TEXT_MUTED }}>
                  <Sparkles size={22} color={GOLD} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13.5 }}>Aucun rendez-vous pour le moment.</div>
                  <button className="btn" onClick={() => setShowForm(true)} style={{
                    marginTop: 14, background: GOLD, color: "#1a1409", border: "none", borderRadius: 9,
                    padding: "9px 16px", fontSize: 13, fontWeight: 700,
                  }}>Demander un rendez-vous</button>
                </div>
              )}
              {loaded && upcoming.length > 0 && (
                <>
                  <div style={sectionLabelStyle}>À venir</div>
                  <div style={{ display: isDesktop ? "grid" : "flex", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, flexDirection: isDesktop ? undefined : "column", gap: 8, marginBottom: 22 }}>
                    {upcoming.map((a) => <ClientApptCard key={a.id} appt={a} settings={settings} />)}
                  </div>
                </>
              )}
              {loaded && past.length > 0 && (
                <>
                  <div style={sectionLabelStyle}>Passés</div>
                  <div style={{ display: isDesktop ? "grid" : "flex", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, flexDirection: isDesktop ? undefined : "column", gap: 8, opacity: 0.6 }}>
                    {past.map((a) => <ClientApptCard key={a.id} appt={a} settings={settings} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {view === "tarifs" && <TarifsView isAdmin={false} />}

          {view === "galerie" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ImageIcon size={16} color={GOLD} />
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: GOLD_LIGHT, margin: 0 }}>Galerie</h2>
              </div>
              <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 18px" }}>Quelques réalisations du salon.</p>
              {!loaded && <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 40, fontSize: 13 }}>Chargement…</div>}
              {loaded && media.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", border: "1px dashed #2a2418", borderRadius: 14, color: TEXT_MUTED, fontSize: 13.5 }}>
                  Aucune photo pour le moment.
                </div>
              )}
              {loaded && media.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
                  {media.map((m) => <MediaCard key={m.id} item={m} onRemove={() => {}} hideRemove />)}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <button className="btn" onClick={() => setShowForm(true)} style={{
        position: "fixed", bottom: 28, right: 28, width: 52, height: 52, borderRadius: "50%",
        background: GOLD, color: "#1a1409", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(201,162,89,0.35)", zIndex: 30,
      }} aria-label="Demander un rendez-vous">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showForm && (
        <ClientApptRequestForm session={session} onClose={() => setShowForm(false)} onSave={requestAppt} />
      )}

      {saving && (
        <div style={{ position: "fixed", top: 10, right: 10, fontSize: 11, color: TEXT_MUTED, zIndex: 40 }}>Envoi…</div>
      )}
    </div>
  );
}

const sectionLabelStyle = {
  fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
};

function ClientApptCard({ appt: a, settings }) {
  const [showPay, setShowPay] = useState(false);

  const payLinks = [
    settings.paypal  && { label: "PayPal",   icon: "💳", url: settings.paypal,  color: "#0070ba" },
    settings.stripe  && { label: "SumUp / Stripe", icon: "💰", url: settings.stripe, color: "#635bff" },
    settings.lydia   && { label: "Lydia",    icon: "🟣", url: settings.lydia,   color: "#8b5cf6" },
  ].filter(Boolean);

  const ibanInfo = settings.iban ? { iban: settings.iban, name: settings.ibanName } : null;
  const hasPayment = payLinks.length > 0 || ibanInfo;
  const needsPay = a.deposit && !a.depositPaid && a.status === "confirmed";

  return (
    <div style={{
      background: "#180e06", borderRadius: 12, overflow: "hidden",
      border: `1px solid ${needsPay ? "#6b4a1e" : "#2a2418"}`,
      borderLeft: `3px solid ${a.status === "pending" ? "#c98a3a" : needsPay ? "#f0a030" : "#3f9b5a"}`,
    }}>
      <div style={{ padding: "11px 13px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Clock size={12} color={GOLD} /> {formatDateFr(a.datetime)}
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            color: a.status === "pending" ? "#f0c080" : "#9fe0ad",
            background: a.status === "pending" ? "rgba(201,138,58,0.18)" : "rgba(63,155,90,0.18)",
            border: `1px solid ${a.status === "pending" ? "#6b4a1e" : "#2f5a3a"}`,
            borderRadius: 6, padding: "1px 6px",
          }}>{a.status === "pending" ? "En attente de confirmation" : "Confirmé ✓"}</span>
        </div>

        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
          {a.service}{a.price ? ` · ${a.price} €` : ""}
        </div>

        {a.deposit ? (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <div style={{ fontSize: 12, color: a.depositPaid ? "#7fbf8f" : "#f0a030", display: "flex", alignItems: "center", gap: 5 }}>
              {a.depositPaid ? "✅" : "⏳"} Acompte {a.deposit} € — {a.depositPaid ? "réglé" : "à régler"}
            </div>
            {needsPay && hasPayment && (
              <button className="btn" onClick={() => setShowPay(p => !p)} style={{
                background: GOLD, color: "#1a1409", border: "none", borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <CreditCard size={13} /> Payer maintenant
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Payment panel */}
      {showPay && needsPay && (
        <div style={{ borderTop: "1px solid #2a2418", padding: "12px 13px", background: "#120e08" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD_LIGHT, marginBottom: 10 }}>
            💳 Régler l'acompte de {a.deposit} €
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payLinks.map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderRadius: 10, background: l.color, color: "white",
                textDecoration: "none", fontWeight: 700, fontSize: 13,
                boxShadow: `0 3px 12px ${l.color}44`,
              }}>
                <span style={{ fontSize: 18 }}>{l.icon}</span>
                Payer via {l.label}
                <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>→</span>
              </a>
            ))}

            {ibanInfo && (
              <div style={{ background: "#180e06", border: "1px solid #3a3226", borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 11.5, color: GOLD_LIGHT, fontWeight: 700, marginBottom: 4 }}>🏦 Virement bancaire</div>
                <div style={{ fontSize: 12, color: TEXT, fontFamily: "monospace", marginBottom: 2 }}>{ibanInfo.iban}</div>
                {ibanInfo.name && <div style={{ fontSize: 11, color: TEXT_MUTED }}>Bénéficiaire : {ibanInfo.name}</div>}
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Référence : {a.clientName} – {a.service}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 10, lineHeight: 1.4 }}>
            Une fois le paiement effectué, le salon mettra à jour le statut de ton acompte.
          </div>
        </div>
      )}
    </div>
  );
}

function ClientApptRequestForm({ session, onClose, onSave }) {
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [date, setDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const service = SERVICES.find((s) => s.id === serviceId);

  const submit = () => {
    onSave({
      id: uid(),
      clientId: session.id,
      clientName: session.name,
      phone: session.phone,
      service: service.name,
      price: service.price,
      datetime: `${date}T${time}`,
      notes: notes.trim(),
      deposit: 0,
      depositPaid: false,
      status: "pending",
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1a0c04", width: "100%", maxWidth: 480, borderRadius: "18px 18px 0 0",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", border: `1px solid ${BORDER}`, borderBottom: "none",
        maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: GOLD_LIGHT, fontFamily: "'Playfair Display', serif" }}>Demander un rendez-vous</div>
          <button onClick={onClose} className="btn" style={{ background: "none", border: "none", color: TEXT_MUTED }}><X size={20} /></button>
        </div>

        <Field label="Prestation">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={inputStyle}>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.price ? ` — ${s.from ? "à partir de " : ""}${s.price}€` : " — sur devis"}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Date" style={{ flex: 1 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Heure souhaitée" style={{ flex: 1 }}>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Notes (optionnel)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Longueur de cheveux, préférences…" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginBottom: 14, lineHeight: 1.5 }}>
          Ta demande sera confirmée par le salon. Tu recevras les informations de paiement une fois confirmée.
        </div>

        <button onClick={submit} className="btn" style={submitBtnStyle}>
          <Check size={17} /> Envoyer la demande
        </button>
      </div>
    </div>
  );
}

function RapportsView({ appointments, loaded }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = appointments.filter((a) => {
    const d = new Date(a.datetime);
    return d.getMonth() === month && d.getFullYear() === year;
  }).sort((a, b) => a.datetime.localeCompare(b.datetime));

  const totalCA = filtered.reduce((s, a) => s + (a.price || 0), 0);
  const totalAcomptes = filtered.reduce((s, a) => s + (a.depositPaid ? (a.deposit || 0) : 0), 0);
  const nbConfirmed = filtered.filter(a => a.status === "confirmed").length;

  const exportExcel = () => {
    setExporting(true);
    try {
      const rows = filtered.map((a) => ({
        "Date": a.datetime.slice(0, 10),
        "Heure": a.datetime.slice(11, 16),
        "Cliente": a.clientName || "",
        "Téléphone": a.phone || "",
        "Prestation": a.service || "",
        "Prix (€)": a.price || "",
        "Acompte demandé (€)": a.deposit || 0,
        "Acompte reçu": a.depositPaid ? "✓ Oui" : "Non",
        "Statut": a.status === "confirmed" ? "Confirmé" : "En attente",
        "Notes": a.notes || "",
      }));

      // Summary row
      rows.push({});
      rows.push({
        "Date": "TOTAL",
        "Cliente": `${filtered.length} rendez-vous`,
        "Prestation": `${nbConfirmed} confirmés`,
        "Prix (€)": totalCA,
        "Acompte demandé (€)": "",
        "Acompte reçu": `${totalAcomptes} € perçus`,
        "Statut": "",
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      ws["!cols"] = [
        { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 16 },
        { wch: 30 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
        { wch: 14 }, { wch: 28 },
      ];

      const wb = XLSX.utils.book_new();
      const monthLabel = `${MONTHS[month]} ${year}`;
      XLSX.utils.book_append_sheet(wb, ws, monthLabel);

      // Header styling via cell refs
      const headerRow = ["A1","B1","C1","D1","E1","F1","G1","H1","I1","J1"];
      headerRow.forEach(ref => {
        if (ws[ref]) {
          ws[ref].s = {
            font: { bold: true, color: { rgb: "C9A259" } },
            fill: { fgColor: { rgb: "1A1008" } },
          };
        }
      });

      XLSX.writeFile(wb, `Locks_by_Slo_${monthLabel.replace(/ /g,"_")}.xlsx`);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <FileSpreadsheet size={18} color={GOLD} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: GOLD_LIGHT, margin: 0 }}>Rapports mensuels</h2>
      </div>
      <p style={{ fontSize: 12.5, color: TEXT_MUTED, margin: "4px 0 20px" }}>
        Consultez et exportez les chiffres du mois en fichier Excel.
      </p>

      {/* Month picker */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
        <button className="btn" onClick={prevMonth} style={{ background: "none", border: `1px solid ${BORDER}`, color: GOLD_LIGHT, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: GOLD_LIGHT }}>{MONTHS[month]}</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>{year}</div>
        </div>
        <button className="btn" onClick={nextMonth} style={{ background: "none", border: `1px solid ${BORDER}`, color: GOLD_LIGHT, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        {[
          { label: "Rendez-vous", value: filtered.length, sub: `${nbConfirmed} confirmés`, color: GOLD },
          { label: "Chiffre d'affaires", value: `${totalCA} €`, sub: "total prestations", color: "#4caf7d" },
          { label: "Acomptes reçus", value: `${totalAcomptes} €`, sub: "encaissés", color: "#5b9bd5" },
        ].map((k) => (
          <div key={k.label} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Export button */}
      <button className="btn" onClick={exportExcel} disabled={exporting || filtered.length === 0} style={{
        width: "100%", padding: "13px", borderRadius: 11, marginBottom: 20,
        background: filtered.length === 0 ? "#1a1008" : done ? "#2d6a3f" : GOLD,
        color: filtered.length === 0 ? TEXT_MUTED : "#0d0805",
        border: `1px solid ${filtered.length === 0 ? BORDER : done ? "#3a8a52" : "#a07a10"}`,
        fontWeight: 700, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: filtered.length === 0 ? 0.5 : 1,
      }}>
        {done ? <Check size={17} /> : <Download size={17} />}
        {done ? "Fichier téléchargé !" : exporting ? "Export en cours…" : `Exporter Excel — ${MONTHS[month]} ${year}`}
      </button>

      {/* Table */}
      {!loaded && <div style={{ textAlign: "center", color: TEXT_MUTED, padding: 30, fontSize: 13 }}>Chargement…</div>}

      {loaded && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", border: `1px dashed ${BORDER}`, borderRadius: 12, color: TEXT_MUTED, fontSize: 13 }}>
          Aucun rendez-vous pour {MONTHS[month]} {year}.
        </div>
      )}

      {loaded && filtered.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#0f0c07" }}>
                {["Date", "Cliente", "Téléphone", "Prestation", "Prix", "Acompte", "Statut"].map(h => (
                  <th key={h} style={{ padding: "11px 12px", textAlign: "left", color: GOLD_LIGHT, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? BG2 : "transparent", borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "10px 12px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                    {a.datetime.slice(8,10)}/{a.datetime.slice(5,7)} {a.datetime.slice(11,16)}
                  </td>
                  <td style={{ padding: "10px 12px", color: TEXT, fontWeight: 600 }}>{a.clientName}</td>
                  <td style={{ padding: "10px 12px", color: TEXT_MUTED }}>{a.phone || "—"}</td>
                  <td style={{ padding: "10px 12px", color: TEXT }}>{a.service}</td>
                  <td style={{ padding: "10px 12px", color: GOLD_LIGHT, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {a.price ? `${a.price} €` : "Devis"}
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    {a.deposit ? (
                      <span style={{ color: a.depositPaid ? "#4caf7d" : "#e0a030", fontWeight: 600 }}>
                        {a.deposit} € {a.depositPaid ? "✓" : "⏳"}
                      </span>
                    ) : <span style={{ color: TEXT_MUTED }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: a.status === "confirmed" ? "rgba(76,175,125,0.15)" : "rgba(201,138,58,0.15)",
                      color: a.status === "confirmed" ? "#4caf7d" : "#e0a030",
                      border: `1px solid ${a.status === "confirmed" ? "#2d6a3f" : "#6b4a1e"}`,
                    }}>
                      {a.status === "confirmed" ? "Confirmé" : "En attente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0f0c07", borderTop: `2px solid ${BORDER}` }}>
                <td colSpan={4} style={{ padding: "11px 12px", color: GOLD_LIGHT, fontWeight: 700 }}>TOTAL — {filtered.length} rendez-vous</td>
                <td style={{ padding: "11px 12px", color: GOLD_LIGHT, fontWeight: 800 }}>{totalCA} €</td>
                <td style={{ padding: "11px 12px", color: "#4caf7d", fontWeight: 700 }}>{totalAcomptes} € reçus</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
