// SVG wireframe generator, including the navigation-map wireframe.
// Run from the consumer project root; output goes to
// <cwd>/docs/public/images/wireframes.
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "docs", "public", "images", "wireframes");
fs.mkdirSync(OUT, { recursive: true });

// ── Design tokens ──────────────────────────────────────────
const C = {
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
  primaryDark: "#1D4ED8",
  bg: "#F1F5F9",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderDark: "#CBD5E1",
  text: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  purple: "#8B5CF6",
  purpleLight: "#EDE9FE",
  white: "#FFFFFF",
  sidebar: "#1E293B",
  sidebarHover: "#334155",
  sidebarText: "#CBD5E1",
  sidebarActive: "#2563EB",
  inputBg: "#F8FAFC",
  inputBorder: "#CBD5E1",
  headerBg: "#FFFFFF",
};

const FONT = `font-family="Inter, system-ui, -apple-system, sans-serif"`;
const DESKTOP_W = 900;
const MOBILE_W = 375;

// ── SVG Helpers ────────────────────────────────────────────
function svgOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${FONT}>
  <defs>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="108%">
      <feDropShadow dx="0" dy="1" stdDeviation="3" flood-opacity="0.08"/>
    </filter>
    <filter id="shadowLg" x="-2%" y="-2%" width="104%" height="112%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
    </filter>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.white}"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.primary}"/>
      <stop offset="100%" stop-color="${C.primaryDark}"/>
    </linearGradient>
    <linearGradient id="sidebarGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}" rx="8"/>`;
}

function svgClose() {
  return "</svg>";
}

function rect(x, y, w, h, fill, rx = 8, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" ${extra}/>`;
}

function cardRect(x, y, w, h, rx = 8) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.card}" rx="${rx}" filter="url(#shadow)" stroke="${C.border}" stroke-width="1"/>`;
}

function text(
  x,
  y,
  content,
  size = 13,
  fill = C.text,
  anchor = "start",
  weight = "normal",
) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}" ${FONT}>${esc(content)}</text>`;
}

function boldText(x, y, content, size = 13, fill = C.text, anchor = "start") {
  return text(x, y, content, size, fill, anchor, "600");
}

function btn(x, y, w, h, label, type = "primary") {
  const fills = {
    primary: "url(#primaryGrad)",
    secondary: C.card,
    danger: C.danger,
    success: C.success,
    ghost: "transparent",
  };
  const textColor = type === "secondary" || type === "ghost" ? C.text : C.white;
  const stroke =
    type === "secondary"
      ? `stroke="${C.border}" stroke-width="1"`
      : type === "ghost"
        ? ""
        : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fills[type]}" rx="6" ${stroke} style="cursor:pointer"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 4.5}" font-size="13" fill="${textColor}" text-anchor="middle" font-weight="500" ${FONT}>${esc(label)}</text>`;
}

function input(x, y, w, h = 36, placeholder = "", value = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>
  <text x="${x + 12}" y="${y + h / 2 + 4}" font-size="13" fill="${value ? C.text : C.textMuted}" ${FONT}>${esc(value || placeholder)}</text>`;
}

function select(x, y, w, h = 36, value = "Vyberte...") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>
  <text x="${x + 12}" y="${y + h / 2 + 4}" font-size="13" fill="${C.textSecondary}" ${FONT}>${esc(value)}</text>
  <path d="M${x + w - 24},${y + h / 2 - 2} l5,5 5,-5" stroke="${C.textSecondary}" fill="none" stroke-width="1.5"/>`;
}

function badge(x, y, label, color) {
  const w = label.length * 7.5 + 16;
  const lightColors = {
    [C.success]: C.successLight,
    [C.warning]: C.warningLight,
    [C.danger]: C.dangerLight,
    [C.primary]: C.primaryLight,
    [C.purple]: C.purpleLight,
  };
  return `<rect x="${x}" y="${y}" width="${w}" height="22" fill="${lightColors[color] || "#F1F5F9"}" rx="11"/>
  <text x="${x + w / 2}" y="${y + 15}" font-size="11" fill="${color}" text-anchor="middle" font-weight="600" ${FONT}>${esc(label)}</text>`;
}

function slaIndicator(x, y, color) {
  return `<circle cx="${x}" cy="${y}" r="5" fill="${color}"/>`;
}

function divider(x, y, w) {
  return `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${C.border}" stroke-width="1"/>`;
}

function icon(x, y, type, size = 16, color = C.textSecondary) {
  const s = size;
  const icons = {
    search: `<circle cx="${x + s * 0.4}" cy="${y + s * 0.4}" r="${s * 0.3}" stroke="${color}" fill="none" stroke-width="1.5"/><line x1="${x + s * 0.6}" y1="${y + s * 0.6}" x2="${x + s * 0.85}" y2="${y + s * 0.85}" stroke="${color}" stroke-width="1.5"/>`,
    back: `<path d="M${x + s * 0.6},${y + s * 0.2} L${x + s * 0.25},${y + s * 0.5} L${x + s * 0.6},${y + s * 0.8}" stroke="${color}" fill="none" stroke-width="2"/>`,
    plus: `<line x1="${x + s * 0.2}" y1="${y + s * 0.5}" x2="${x + s * 0.8}" y2="${y + s * 0.5}" stroke="${color}" stroke-width="2"/><line x1="${x + s * 0.5}" y1="${y + s * 0.2}" x2="${x + s * 0.5}" y2="${y + s * 0.8}" stroke="${color}" stroke-width="2"/>`,
    camera: `<rect x="${x + 2}" y="${y + 4}" width="${s - 4}" height="${s - 7}" rx="2" stroke="${color}" fill="none" stroke-width="1.5"/><circle cx="${x + s / 2}" cy="${y + s / 2 + 1}" r="${s * 0.2}" stroke="${color}" fill="none" stroke-width="1.5"/>`,
    file: `<path d="M${x + 3},${y + 1} h${s * 0.45} l${s * 0.25},${s * 0.25} v${s * 0.65} a1,1,0,0,1,-1,1 h-${s * 0.6} a1,1,0,0,1,-1,-1 v-${s * 0.8} a1,1,0,0,1,1,-1z" stroke="${color}" fill="none" stroke-width="1.3"/>`,
    check: `<path d="M${x + s * 0.2},${y + s * 0.5} L${x + s * 0.4},${y + s * 0.7} L${x + s * 0.8},${y + s * 0.3}" stroke="${color}" fill="none" stroke-width="2"/>`,
    user: `<circle cx="${x + s / 2}" cy="${y + s * 0.35}" r="${s * 0.2}" stroke="${color}" fill="none" stroke-width="1.5"/><path d="M${x + s * 0.2},${y + s * 0.9} a${s * 0.3},${s * 0.3},0,0,1,${s * 0.6},0" stroke="${color}" fill="none" stroke-width="1.5"/>`,
    clock: `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.38}" stroke="${color}" fill="none" stroke-width="1.5"/><line x1="${x + s / 2}" y1="${y + s * 0.3}" x2="${x + s / 2}" y2="${y + s / 2}" stroke="${color}" stroke-width="1.5"/><line x1="${x + s / 2}" y1="${y + s / 2}" x2="${x + s * 0.65}" y2="${y + s * 0.55}" stroke="${color}" stroke-width="1.5"/>`,
    mail: `<rect x="${x + 1}" y="${y + 3}" width="${s - 2}" height="${s - 6}" rx="2" stroke="${color}" fill="none" stroke-width="1.3"/><path d="M${x + 1},${y + 3} l${(s - 2) / 2},${(s - 6) * 0.4} l${(s - 2) / 2},-${(s - 6) * 0.4}" stroke="${color}" fill="none" stroke-width="1.3"/>`,
    nav: `<line x1="${x + 2}" y1="${y + 4}" x2="${x + s - 2}" y2="${y + 4}" stroke="${color}" stroke-width="2"/><line x1="${x + 2}" y1="${y + s / 2}" x2="${x + s - 2}" y2="${y + s / 2}" stroke="${color}" stroke-width="2"/><line x1="${x + 2}" y1="${y + s - 4}" x2="${x + s - 2}" y2="${y + s - 4}" stroke="${color}" stroke-width="2"/>`,
    folder: `<path d="M${x + 2},${y + 5} v${s - 8} a2,2,0,0,0,2,2 h${s - 6} a2,2,0,0,0,2,-2 v-${s - 12} h-${s / 2 - 1} l-2,-3 h-${s / 2 - 3} a2,2,0,0,0,-2,2z" stroke="${color}" fill="none" stroke-width="1.3"/>`,
    download: `<path d="M${x + s / 2},${y + 2} v${s * 0.5}" stroke="${color}" stroke-width="1.5"/><path d="M${x + s * 0.3},${y + s * 0.45} l${s * 0.2},${s * 0.2} l${s * 0.2},-${s * 0.2}" stroke="${color}" fill="none" stroke-width="1.5"/><line x1="${x + 3}" y1="${y + s - 3}" x2="${x + s - 3}" y2="${y + s - 3}" stroke="${color}" stroke-width="1.5"/>`,
  };
  return icons[type] || "";
}

function navAnnotation(x, y, targetScreen, direction = "right") {
  const tw = targetScreen.length * 6.5 + 20;
  const arrowX = direction === "right" ? x : x - tw - 20;
  return `<g opacity="0.85">
    <rect x="${arrowX}" y="${y - 10}" width="${tw}" height="20" fill="#FEF3C7" rx="4" stroke="#F59E0B" stroke-width="1"/>
    <text x="${arrowX + tw / 2}" y="${y + 4}" font-size="10" fill="#92400E" text-anchor="middle" font-weight="500" ${FONT}>→ ${esc(targetScreen)}</text>
  </g>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Header component (top navigation bar) ──────────────────
function header(w, activeItem = "Pripady", userName = "J. Novak") {
  const items = [
    "Dashboard",
    "Pripady",
    "SLA",
    "Reporty",
    "Fakturace",
    "Admin",
  ];
  let s = `<rect x="0" y="0" width="${w}" height="56" fill="url(#headerGrad)" rx="8"/>
  <rect x="0" y="48" width="${w}" height="8" fill="url(#headerGrad)"/>
  <line x1="0" y1="56" x2="${w}" y2="56" stroke="${C.border}" stroke-width="1"/>
  <text x="20" y="35" font-size="16" fill="${C.primary}" font-weight="700" ${FONT}>LAPA SERVICE</text>
  <text x="145" y="35" font-size="11" fill="${C.textMuted}" font-weight="400" ${FONT}>IS</text>`;

  let ix = 175;
  for (const item of items) {
    const isActive = item === activeItem;
    s += `<text x="${ix}" y="35" font-size="13" fill="${isActive ? C.primary : C.textSecondary}" font-weight="${isActive ? "600" : "400"}" ${FONT}>${item}</text>`;
    if (isActive) {
      const tw = item.length * 7.5;
      s += `<rect x="${ix - 2}" y="52" width="${tw + 4}" height="3" fill="${C.primary}" rx="1.5"/>`;
    }
    ix += item.length * 8 + 24;
  }

  // User menu
  s += `<circle cx="${w - 50}" cy="28" r="16" fill="${C.primaryLight}"/>
  <text x="${w - 50}" y="33" font-size="12" fill="${C.primary}" text-anchor="middle" font-weight="600" ${FONT}>${userName.charAt(0)}</text>
  <text x="${w - 28}" y="33" font-size="12" fill="${C.textSecondary}" ${FONT}>▾</text>`;

  return s;
}

// ── Section title with breadcrumb ──────────────────────────
function sectionTitle(x, y, title, subtitle = "") {
  let s = boldText(x, y, title, 20, C.text);
  if (subtitle) s += text(x, y + 22, subtitle, 13, C.textSecondary);
  return s;
}

// ── Stat card ──────────────────────────────────────────────
function statCard(x, y, w, h, value, label, color = C.primary) {
  return `${cardRect(x, y, w, h)}
  <rect x="${x}" y="${y}" width="4" height="${h}" fill="${color}" rx="2"/>
  <text x="${x + 20}" y="${y + h / 2 - 4}" font-size="24" fill="${color}" font-weight="700" ${FONT}>${esc(value)}</text>
  <text x="${x + 20}" y="${y + h / 2 + 16}" font-size="11" fill="${C.textSecondary}" ${FONT}>${esc(label)}</text>`;
}

// ── Table header + rows ────────────────────────────────────
function tableHeader(x, y, w, cols) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="36" fill="#F8FAFC" rx="0"/>
  <line x1="${x}" y1="${y + 36}" x2="${x + w}" y2="${y + 36}" stroke="${C.border}" stroke-width="1"/>`;
  let cx = x;
  for (const col of cols) {
    s += `<text x="${cx + 12}" y="${y + 22}" font-size="11" fill="${C.textSecondary}" font-weight="600" text-transform="uppercase" ${FONT}>${esc(col.label)}</text>`;
    cx += col.width;
  }
  return s;
}

function tableRow(x, y, w, cells, cols, highlight = false) {
  let s = "";
  if (highlight)
    s += `<rect x="${x}" y="${y}" width="${w}" height="40" fill="#FFFBEB" rx="0"/>`;
  s += `<line x1="${x}" y1="${y + 40}" x2="${x + w}" y2="${y + 40}" stroke="${C.border}" stroke-width="0.5"/>`;
  let cx = x;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.type === "sla") {
      s += slaIndicator(cx + 20, y + 20, cell.color);
    } else if (cell.type === "badge") {
      s += badge(cx + 8, y + 9, cell.text, cell.color);
    } else {
      s += `<text x="${cx + 12}" y="${y + 24}" font-size="12" fill="${cell.bold ? C.text : C.textSecondary}" font-weight="${cell.bold ? "500" : "400"}" ${FONT}>${esc(cell.text || "")}</text>`;
    }
    cx += cols[i].width;
  }
  return s;
}

// ── Tab bar ────────────────────────────────────────────────
function tabBar(x, y, w, tabs, activeIdx = 0) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="40" fill="${C.card}" rx="0"/>
  <line x1="${x}" y1="${y + 40}" x2="${x + w}" y2="${y + 40}" stroke="${C.border}" stroke-width="1"/>`;
  let tx = x + 16;
  for (let i = 0; i < tabs.length; i++) {
    const isActive = i === activeIdx;
    const tw = tabs[i].length * 7.2 + 16;
    s += `<text x="${tx + tw / 2}" y="${y + 25}" font-size="13" fill="${isActive ? C.primary : C.textSecondary}" text-anchor="middle" font-weight="${isActive ? "600" : "400"}" ${FONT}>${esc(tabs[i])}</text>`;
    if (isActive)
      s += `<rect x="${tx}" y="${y + 37}" width="${tw}" height="3" fill="${C.primary}" rx="1.5"/>`;
    tx += tw + 8;
  }
  return s;
}

// ── Checklist item ─────────────────────────────────────────
function checkItem(x, y, label, status = "done") {
  const colors = { done: C.success, missing: C.danger, pending: C.textMuted };
  const icons = { done: "✓", missing: "✕", pending: "○" };
  return `<circle cx="${x + 8}" cy="${y}" r="8" fill="${status === "done" ? C.successLight : status === "missing" ? C.dangerLight : "#F1F5F9"}" stroke="${colors[status]}" stroke-width="1.5"/>
  <text x="${x + 8}" y="${y + 4}" font-size="10" fill="${colors[status]}" text-anchor="middle" font-weight="700" ${FONT}>${icons[status]}</text>
  <text x="${x + 24}" y="${y + 4}" font-size="12" fill="${status === "done" ? C.textSecondary : C.text}" ${FONT}>${esc(label)}</text>`;
}

// ── Activity log item ──────────────────────────────────────
function activityItem(x, y, time, actor, action) {
  return `<text x="${x}" y="${y}" font-size="11" fill="${C.textMuted}" ${FONT}>${esc(time)}</text>
  <text x="${x + 50}" y="${y}" font-size="11" fill="${C.text}" font-weight="500" ${FONT}>${esc(actor)}</text>
  <text x="${x + 50 + actor.length * 6.5}" y="${y}" font-size="11" fill="${C.textSecondary}" ${FONT}> — ${esc(action)}</text>`;
}

// ── Form label ─────────────────────────────────────────────
function formField(
  x,
  y,
  label,
  w,
  required = false,
  value = "",
  placeholder = "",
) {
  let s = `<text x="${x}" y="${y}" font-size="12" fill="${C.textSecondary}" font-weight="500" ${FONT}>${esc(label)}${required ? " *" : ""}</text>`;
  s += input(x, y + 6, w, 36, placeholder, value);
  return s;
}

function formSelect(x, y, label, w, required = false, value = "Vyberte...") {
  let s = `<text x="${x}" y="${y}" font-size="12" fill="${C.textSecondary}" font-weight="500" ${FONT}>${esc(label)}${required ? " *" : ""}</text>`;
  s += select(x, y + 6, w, 36, value);
  return s;
}

// ════════════════════════════════════════════════════════════
// WIREFRAME GENERATORS
// ════════════════════════════════════════════════════════════

// 1. LOGIN
function genLogin() {
  const w = 900,
    h = 560;
  let s = svgOpen(w, h);
  // Centered login card
  const cw = 380,
    ch = 420,
    cx = (w - cw) / 2,
    cy = (h - ch) / 2;
  s += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${C.card}" rx="16" filter="url(#shadowLg)"/>`;
  // Logo area
  s += `<rect x="${cx + 60}" y="${cy + 30}" width="${cw - 120}" height="64" fill="${C.primaryLight}" rx="12"/>`;
  s += boldText(cx + cw / 2, cy + 55, "LAPA SERVICE", 22, C.primary, "middle");
  s += text(
    cx + cw / 2,
    cy + 75,
    "Informacni system",
    13,
    C.textSecondary,
    "middle",
  );
  // Form
  s += formField(cx + 40, cy + 130, "Email", cw - 80, true, "", "vas@email.cz");
  s += formField(cx + 40, cy + 206, "Heslo", cw - 80, true, "", "••••••••");
  // Remember me
  s += `<rect x="${cx + 40}" y="${cy + 286}" width="16" height="16" fill="${C.inputBg}" rx="3" stroke="${C.inputBorder}" stroke-width="1"/>`;
  s += text(cx + 62, cy + 298, "Zapamatovat si me", 12, C.textSecondary);
  // Button
  s += btn(cx + 40, cy + 320, cw - 80, 44, "Prihlasit se", "primary");
  // Forgot password
  s += `<text x="${cx + cw / 2}" y="${cy + 395}" font-size="12" fill="${C.primary}" text-anchor="middle" ${FONT}>Zapomenute heslo?</text>`;
  // Nav annotation
  s += navAnnotation(cx + cw + 20, cy + 342, "Dashboard");
  s += svgClose();
  return s;
}

// 2. DASHBOARD – Team Leader
function genDashboardTL() {
  const w = DESKTOP_W,
    h = 720;
  let s = svgOpen(w, h);
  s += header(w, "Dashboard");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Dashboard", "Dobry den, Jano. — 07.04.2026");

  // Stat cards row
  const cw = 155,
    gap = 14;
  const stats = [
    { v: "52", l: "Aktivnich pripadu", c: C.primary },
    { v: "4", l: "Neprirazeno", c: C.warning },
    { v: "3", l: "SLA kriticke", c: C.danger },
    { v: "7", l: "SLA varovani", c: C.warning },
    { v: "128", l: "Uzavreno (mesic)", c: C.success },
  ];
  for (let i = 0; i < stats.length; i++) {
    s += statCard(
      mx + i * (cw + gap),
      my + 38,
      cw,
      72,
      stats[i].v,
      stats[i].l,
      stats[i].c,
    );
  }

  // Unassigned cases table
  const ty = my + 130;
  s += cardRect(mx, ty, w - 48, 200);
  s += boldText(mx + 16, ty + 24, "Neprirazene pripady", 14, C.text);
  s += text(mx + 190, ty + 24, "(vyzaduje akci)", 12, C.warning);
  const cols = [
    { label: "#", width: 100 },
    { label: "Pojistovna", width: 140 },
    { label: "Typ", width: 120 },
    { label: "Prijato", width: 100 },
    { label: "Akce", width: 80 },
  ];
  s += tableHeader(mx + 1, ty + 36, w - 50, cols);
  const rows = [
    [
      { text: "#2026-0355", bold: true },
      { text: "Allianz" },
      { text: "Majetek" },
      { text: "dnes" },
      { text: "Priradit →", bold: true },
    ],
    [
      { text: "#2026-0354", bold: true },
      { text: "Kooperativa" },
      { text: "Automobily" },
      { text: "dnes" },
      { text: "Priradit →", bold: true },
    ],
    [
      { text: "#2026-0353", bold: true },
      { text: "Ceska poj." },
      { text: "Majetek" },
      { text: "vcera" },
      { text: "Priradit →", bold: true },
    ],
  ];
  for (let i = 0; i < rows.length; i++) {
    s += tableRow(mx + 1, ty + 72 + i * 40, w - 50, rows[i], cols);
  }
  // Nav annotation on assign button
  s += navAnnotation(w - 50, ty + 92, "Prirazeni resitele");

  // Team utilization
  const uy = ty + 218;
  s += cardRect(mx, uy, w - 48, 210);
  s += boldText(mx + 16, uy + 24, "Vytizenost tymu", 14);
  const ucols = [
    { label: "Resitel", width: 160 },
    { label: "Aktivni", width: 70 },
    { label: "Kapacita", width: 70 },
    { label: "Vyuziti", width: 200 },
    { label: "Prumer SLA", width: 100 },
  ];
  s += tableHeader(mx + 1, uy + 36, w - 50, ucols);
  const team = [
    ["Jan Novak", "8", "15", 53, "4.2 dnu"],
    ["Petr Svoboda", "12", "15", 80, "5.1 dnu"],
    ["Marie Kralova", "5", "15", 33, "3.8 dnu"],
    ["Tomas Havel", "14", "15", 93, "6.5 dnu"],
  ];
  for (let i = 0; i < team.length; i++) {
    const ry = uy + 72 + i * 34;
    s += `<line x1="${mx + 1}" y1="${ry + 34}" x2="${w - 49}" y2="${ry + 34}" stroke="${C.border}" stroke-width="0.5"/>`;
    s += text(mx + 13, ry + 21, team[i][0], 12, C.text, "start", "500");
    s += text(mx + 173, ry + 21, team[i][1], 12, C.textSecondary);
    s += text(mx + 243, ry + 21, team[i][2], 12, C.textSecondary);
    // Progress bar
    const bx = mx + 313,
      bw = 130,
      pct = team[i][3];
    const pctColor = pct > 85 ? C.danger : pct > 65 ? C.warning : C.success;
    s += `<rect x="${bx}" y="${ry + 12}" width="${bw}" height="10" fill="#F1F5F9" rx="5"/>`;
    s += `<rect x="${bx}" y="${ry + 12}" width="${(bw * pct) / 100}" height="10" fill="${pctColor}" rx="5"/>`;
    s += text(bx + bw + 8, ry + 21, pct + "%", 11, pctColor, "start", "600");
    s += text(mx + 513, ry + 21, team[i][4], 12, C.textSecondary);
  }

  // Activity feed
  const ay = uy + 228;
  s += cardRect(mx, ay, w - 48, 140);
  s += boldText(mx + 16, ay + 24, "Posledni aktivita", 14);
  const acts = [
    ["14:32", "J. Novak", "dokoncil setreni #2026-0342"],
    ["14:15", "M. Kralova", "schvalila zpravu #2026-0338"],
    ["13:50", "E. Prochazk.", "odeslala PDF #2026-0335"],
    ["13:22", "P. Svoboda", "pridal fotky k #2026-0340"],
  ];
  for (let i = 0; i < acts.length; i++) {
    s += activityItem(
      mx + 16,
      ay + 50 + i * 22,
      acts[i][0],
      acts[i][1],
      acts[i][2],
    );
  }

  s += svgClose();
  return s;
}

// 3. DASHBOARD – Management
function genDashboardMgmt() {
  const w = DESKTOP_W,
    h = 580;
  let s = svgOpen(w, h);
  s += header(w, "Dashboard");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Management Dashboard", "Obdobi: duben 2026");

  // KPI cards (2x2 grid)
  const kw = (w - 48 - 16) / 2;
  s += cardRect(mx, my + 40, kw, 100);
  s += boldText(mx + 20, my + 64, "Pripady tento mesic", 12, C.textSecondary);
  s += boldText(mx + 20, my + 94, "Prijato: 45", 14, C.text);
  s += text(
    mx + 20,
    my + 114,
    "Uzavreno: 38  |  Rozpracovano: 52",
    12,
    C.textSecondary,
  );

  s += cardRect(mx + kw + 16, my + 40, kw, 100);
  s += boldText(mx + kw + 36, my + 64, "SLA plneni", 12, C.textSecondary);
  // Progress bar
  s += `<rect x="${mx + kw + 36}" y="${my + 78}" width="${kw - 72}" height="14" fill="#F1F5F9" rx="7"/>`;
  s += `<rect x="${mx + kw + 36}" y="${my + 78}" width="${(kw - 72) * 0.91}" height="14" fill="${C.success}" rx="7"/>`;
  s += boldText(mx + kw + 36, my + 114, "91%", 16, C.success);
  s += text(mx + kw + 80, my + 114, "(cil: 95%)", 12, C.textSecondary);

  s += cardRect(mx, my + 156, kw, 100);
  s += boldText(
    mx + 20,
    my + 180,
    "Prumerna doba zpracovani",
    12,
    C.textSecondary,
  );
  s += boldText(mx + 20, my + 216, "8.3 dnu", 22, C.primary);
  s += text(mx + 100, my + 216, "(cil: 10 dnu) ✓", 12, C.success);

  s += cardRect(mx + kw + 16, my + 156, kw, 100);
  s += boldText(
    mx + kw + 36,
    my + 180,
    "Obrat (fakturace)",
    12,
    C.textSecondary,
  );
  s += boldText(mx + kw + 36, my + 216, "485 000 Kc", 22, C.success);
  s += text(
    mx + kw + 170,
    my + 216,
    "(min. mesic: 462 000 Kc)",
    11,
    C.textSecondary,
  );

  // Profitability table
  const ty = my + 278;
  s += cardRect(mx, ty, w - 48, 220);
  s += boldText(mx + 16, ty + 24, "Ziskovost dle pojistoven", 14);
  const pcols = [
    { label: "Pojistovna", width: 200 },
    { label: "Pripady", width: 100 },
    { label: "Hodiny", width: 100 },
    { label: "Obrat", width: 140 },
    { label: "Marze", width: 100 },
  ];
  s += tableHeader(mx + 1, ty + 36, w - 50, pcols);
  const pdata = [
    ["Kooperativa", "18", "112.5", "185 000 Kc", "32%"],
    ["Ceska pojistovna", "12", "78.0", "128 000 Kc", "28%"],
    ["Allianz", "8", "55.5", "92 000 Kc", "35%"],
    ["Generali", "7", "42.0", "80 000 Kc", "38%"],
  ];
  for (let i = 0; i < pdata.length; i++) {
    const ry = ty + 72 + i * 40;
    s += `<line x1="${mx + 1}" y1="${ry + 40}" x2="${w - 49}" y2="${ry + 40}" stroke="${C.border}" stroke-width="0.5"/>`;
    let pcx = mx + 1;
    for (let j = 0; j < pdata[i].length; j++) {
      s += text(
        pcx + 12,
        ry + 24,
        pdata[i][j],
        12,
        j === 0 ? C.text : C.textSecondary,
        "start",
        j === 0 ? "500" : "400",
      );
      pcx += pcols[j].width;
    }
  }

  s += svgClose();
  return s;
}

// 4. CASES LIST
function genCasesList() {
  const w = DESKTOP_W,
    h = 620;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Pripady");
  s += btn(w - 180, my + 4, 156, 36, "+ Novy pripad", "primary");
  s += navAnnotation(w - 10, my + 14, "Novy pripad");

  // Filters
  const fy = my + 42;
  s += select(mx, fy, 160, 34, "Vsechny stavy");
  s += select(mx + 170, fy, 160, 34, "Vsechny pojistovny");
  s += select(mx + 340, fy, 160, 34, "Vsichni resitele");
  s += input(mx + 510, fy, 200, 34, "Hledat...", "");
  s += `<g transform="translate(${mx + 720}, ${fy})">${icon(0, 8, "search", 18, C.textSecondary)}</g>`;

  // Table
  const ty = fy + 48;
  s += cardRect(mx, ty, w - 48, 410);
  const tcols = [
    { label: "SLA", width: 40 },
    { label: "# Pripad", width: 110 },
    { label: "Pojistovna", width: 130 },
    { label: "Typ", width: 100 },
    { label: "Stav", width: 140 },
    { label: "Resitel", width: 110 },
    { label: "Datum", width: 80 },
  ];
  s += tableHeader(mx + 1, ty + 1, w - 50, tcols);
  const cdata = [
    [
      { type: "sla", color: C.danger },
      { text: "#2026-0298", bold: true },
      { text: "Kooperativa" },
      { text: "Majetek" },
      { type: "badge", text: "Zprac. zpravy", color: C.purple },
      { text: "Novak" },
      { text: "03/15" },
    ],
    [
      { type: "sla", color: C.danger },
      { text: "#2026-0301", bold: true },
      { text: "Ceska poj." },
      { text: "Auto" },
      { type: "badge", text: "Prirazeno", color: C.primary },
      { text: "Havel" },
      { text: "03/18" },
    ],
    [
      { type: "sla", color: C.warning },
      { text: "#2026-0330", bold: true },
      { text: "Generali" },
      { text: "Majetek" },
      { type: "badge", text: "V setreni", color: C.warning },
      { text: "Novak" },
      { text: "04/01" },
    ],
    [
      { type: "sla", color: C.warning },
      { text: "#2026-0331", bold: true },
      { text: "Kooperativa" },
      { text: "Odp." },
      { type: "badge", text: "Prirazeno", color: C.primary },
      { text: "Kralova" },
      { text: "04/02" },
    ],
    [
      { type: "sla", color: C.success },
      { text: "#2026-0342", bold: true },
      { text: "Kooperativa" },
      { text: "Majetek" },
      { type: "badge", text: "V setreni", color: C.warning },
      { text: "Novak" },
      { text: "04/05" },
    ],
    [
      { type: "sla", color: C.success },
      { text: "#2026-0343", bold: true },
      { text: "Allianz" },
      { text: "Majetek" },
      { type: "badge", text: "Prijato", color: C.textSecondary },
      { text: "—" },
      { text: "04/06" },
    ],
    [
      { type: "sla", color: C.success },
      { text: "#2026-0344", bold: true },
      { text: "Ceska poj." },
      { text: "Auto" },
      { type: "badge", text: "Prijato", color: C.textSecondary },
      { text: "—" },
      { text: "04/07" },
    ],
    [
      { type: "sla", color: C.success },
      { text: "#2026-0345", bold: true },
      { text: "Generali" },
      { text: "Odp." },
      { type: "badge", text: "Schvaleno", color: C.success },
      { text: "Kralova" },
      { text: "04/07" },
    ],
  ];
  for (let i = 0; i < cdata.length; i++) {
    s += tableRow(mx + 1, ty + 37 + i * 40, w - 50, cdata[i], tcols);
  }
  // Nav annotation on row click
  s += navAnnotation(w - 44, ty + 57, "Detail pripadu");

  // Pagination
  const py = ty + 360;
  s += text(mx + 16, py + 16, "Zobrazeno 1 – 20 z 52", 12, C.textSecondary);
  s += btn(w - 200, py, 32, 30, "<", "secondary");
  s += btn(w - 162, py, 32, 30, "1", "primary");
  s += btn(w - 124, py, 32, 30, "2", "secondary");
  s += btn(w - 86, py, 32, 30, "3", "secondary");
  s += btn(w - 48 - 16, py, 32, 30, ">", "secondary");

  // SLA summary
  const sy = ty + 396;
  s += slaIndicator(mx + 16, sy, C.danger);
  s += text(mx + 28, sy + 4, "Prekroceno (3)", 11, C.textSecondary);
  s += slaIndicator(mx + 140, sy, C.warning);
  s += text(mx + 152, sy + 4, "Varovani (7)", 11, C.textSecondary);
  s += slaIndicator(mx + 260, sy, C.success);
  s += text(mx + 272, sy + 4, "V poradku (42)", 11, C.textSecondary);

  s += svgClose();
  return s;
}

// 5. CASE NEW (form)
function genCaseNew() {
  const w = DESKTOP_W,
    h = 700;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  // Breadcrumb
  s += `<g>${icon(mx, my + 8, "back", 20, C.primary)}</g>`;
  s += `<text x="${mx + 26}" y="${my + 22}" font-size="13" fill="${C.primary}" ${FONT}>Zpet na seznam</text>`;
  s += navAnnotation(mx + 140, my + 12, "Seznam pripadu");
  s += sectionTitle(mx, my + 50, "Novy pripad");

  // Form card
  const fy = my + 70;
  s += cardRect(mx, fy, w - 48, 530);

  // Section: Zakladni udaje
  s += boldText(mx + 20, fy + 28, "Zakladni udaje", 14, C.text);
  s += divider(mx + 20, fy + 36, w - 88);
  const fw = (w - 108) / 2;
  s += formSelect(
    mx + 20,
    fy + 54,
    "Pojistovna",
    fw,
    true,
    "Vyberte pojistovnu",
  );
  s += formField(
    mx + 40 + fw,
    fy + 54,
    "Cislo skody",
    fw,
    true,
    "",
    "4200012345",
  );
  s += formSelect(mx + 20, fy + 116, "Typ skody", fw, true, "Vyberte typ");
  s += formField(
    mx + 40 + fw,
    fy + 116,
    "Datum vzniku skody",
    fw / 2 - 5,
    true,
    "",
    "DD.MM.RRRR",
  );
  s += formField(
    mx + 50 + fw + fw / 2,
    fy + 116,
    "Datum prijmu",
    fw / 2 - 5,
    true,
    "",
    "DD.MM.RRRR",
  );

  // Section: Pojisteny
  s += boldText(mx + 20, fy + 196, "Pojisteny", 14, C.text);
  s += divider(mx + 20, fy + 204, w - 88);
  s += formField(mx + 20, fy + 218, "Jmeno", fw, true);
  s += formField(mx + 40 + fw, fy + 218, "Telefon", fw);
  s += formField(mx + 20, fy + 280, "Email", fw);
  s += formField(mx + 40 + fw, fy + 280, "Adresa setreni", fw, true);

  // Section: Popis a prilohy
  s += boldText(mx + 20, fy + 360, "Popis a prilohy", 14, C.text);
  s += divider(mx + 20, fy + 368, w - 88);
  s += `<text x="${mx + 20}" y="${fy + 386}" font-size="12" fill="${C.textSecondary}" font-weight="500" ${FONT}>Popis skody</text>`;
  s += `<rect x="${mx + 20}" y="${fy + 392}" width="${w - 88}" height="64" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>`;

  s += btn(mx + 20, fy + 472, 160, 34, "+ Nahrat soubory", "secondary");
  // Uploaded file
  s += `<rect x="${mx + 190}" y="${fy + 472}" width="240" height="34" fill="#F8FAFC" rx="6" stroke="${C.border}" stroke-width="1"/>`;
  s += `<g>${icon(mx + 198, fy + 480, "file", 16, C.textSecondary)}</g>`;
  s += text(
    mx + 220,
    fy + 494,
    "objednavka_email.eml (120 KB)",
    11,
    C.textSecondary,
  );

  // Action buttons
  s += btn(w - 310, fy + 530 - 16, 120, 40, "Zrusit", "secondary");
  s += btn(w - 180, fy + 530 - 16, 140, 40, "✓ Zalozit pripad", "primary");
  s += navAnnotation(w - 28, fy + 524, "Detail pripadu");

  s += svgClose();
  return s;
}

// 6. CASE DETAIL
function genCaseDetail() {
  const w = DESKTOP_W,
    h = 760;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  // Top bar
  s += `<g>${icon(mx, my + 8, "back", 20, C.primary)}</g>`;
  s += `<text x="${mx + 26}" y="${my + 22}" font-size="13" fill="${C.primary}" ${FONT}>Zpet</text>`;
  s += navAnnotation(mx + 65, my + 12, "Seznam pripadu");
  s += boldText(mx + 100, my + 22, "Pripad #2026-0342", 16, C.text);
  s += badge(mx + 280, my + 6, "V SETRENI", C.warning);
  s += text(w - 160, my + 22, "SLA: 6 dnu", 13, C.success, "start", "600");
  s += slaIndicator(w - 175, my + 18, C.success);

  // Tabs
  const tabs = [
    "Zakladni udaje",
    "Dokumenty",
    "Zprava",
    "Vykony",
    "Komunikace",
    "Historie",
  ];
  s += tabBar(mx, my + 34, w - 48, tabs, 0);
  // Tab nav annotations
  s += navAnnotation(mx + 205, my + 34, "Dokumenty");
  s += navAnnotation(mx + 320, my + 34, "Expert. zprava");

  const cy = my + 90;
  // Cards grid - top row
  const cw2 = (w - 64) / 2;

  // Case info card
  s += cardRect(mx, cy, cw2, 130);
  s += boldText(mx + 16, cy + 24, "Pripad", 13, C.primary);
  s += divider(mx + 16, cy + 32, cw2 - 32);
  s += text(mx + 16, cy + 52, "Pojistovna:", 12, C.textSecondary);
  s += text(mx + 110, cy + 52, "Kooperativa", 12, C.text, "start", "500");
  s += text(mx + 16, cy + 72, "Cislo skody:", 12, C.textSecondary);
  s += text(mx + 110, cy + 72, "4200012345", 12, C.text, "start", "500");
  s += text(mx + 16, cy + 92, "Typ:", 12, C.textSecondary);
  s += text(mx + 110, cy + 92, "Majetek", 12, C.text, "start", "500");
  s += text(mx + 16, cy + 112, "Datum udalosti:", 12, C.textSecondary);
  s += text(mx + 110, cy + 112, "15.03.2026", 12, C.text, "start", "500");

  // SLA card
  s += cardRect(mx + cw2 + 16, cy, cw2, 130);
  s += boldText(mx + cw2 + 32, cy + 24, "SLA a terminy", 13, C.primary);
  s += divider(mx + cw2 + 32, cy + 32, cw2 - 32);
  s += text(mx + cw2 + 32, cy + 52, "Prijato:", 12, C.textSecondary);
  s += text(mx + cw2 + 140, cy + 52, "05.04.2026", 12, C.text, "start", "500");
  s += text(mx + cw2 + 32, cy + 72, "SLA termin:", 12, C.textSecondary);
  s += text(mx + cw2 + 140, cy + 72, "11.04.2026", 12, C.text, "start", "500");
  s += text(mx + cw2 + 32, cy + 92, "Zbyva:", 12, C.textSecondary);
  s += boldText(mx + cw2 + 140, cy + 92, "4 dny", 14, C.success);
  s += slaIndicator(mx + cw2 + 190, cy + 88, C.success);

  // Insured card
  const cy2 = cy + 146;
  s += cardRect(mx, cy2, cw2, 130);
  s += boldText(mx + 16, cy2 + 24, "Pojisteny", 13, C.primary);
  s += divider(mx + 16, cy2 + 32, cw2 - 32);
  s += text(mx + 16, cy2 + 52, "Jmeno:", 12, C.textSecondary);
  s += text(mx + 110, cy2 + 52, "Jan Dvorak", 12, C.text, "start", "500");
  s += text(mx + 16, cy2 + 72, "Telefon:", 12, C.textSecondary);
  s += text(mx + 110, cy2 + 72, "+420 777 888 999", 12, C.text, "start", "500");
  s += text(mx + 16, cy2 + 92, "Email:", 12, C.textSecondary);
  s += text(mx + 110, cy2 + 92, "dvorak@email.cz", 12, C.text, "start", "500");
  s += text(mx + 16, cy2 + 112, "Adresa:", 12, C.textSecondary);
  s += text(
    mx + 110,
    cy2 + 112,
    "Vodickova 12, Praha 1",
    12,
    C.text,
    "start",
    "500",
  );

  // Solver card
  s += cardRect(mx + cw2 + 16, cy2, cw2, 130);
  s += boldText(mx + cw2 + 32, cy2 + 24, "Resitel", 13, C.primary);
  s += divider(mx + cw2 + 32, cy2 + 32, cw2 - 32);
  s += `<circle cx="${mx + cw2 + 52}" cy="${cy2 + 62}" r="18" fill="${C.primaryLight}"/>`;
  s += boldText(mx + cw2 + 52, cy2 + 66, "JN", 12, C.primary, "middle");
  s += boldText(mx + cw2 + 80, cy2 + 60, "Jan Novak", 14, C.text);
  s += text(
    mx + cw2 + 80,
    cy2 + 78,
    "Aktivni pripady: 8/15",
    12,
    C.textSecondary,
  );
  s += btn(mx + cw2 + 32, cy2 + 94, 160, 28, "Predat jinemu >>", "secondary");
  s += navAnnotation(mx + cw2 + 200, cy2 + 100, "Prirazeni resitele");

  // Checklist card
  const cy3 = cy2 + 146;
  s += cardRect(mx, cy3, cw2, 210);
  s += boldText(mx + 16, cy3 + 24, "Co chybi (checklist)", 13, C.primary);
  s += divider(mx + 16, cy3 + 32, cw2 - 32);
  const checks = [
    ["Objednavka nahrana", "done"],
    ["Resitel prirazen", "done"],
    ["Fotodokumentace (4 fotky)", "done"],
    ["Pojistna smlouva", "missing"],
    ["Expertni zprava", "pending"],
    ["Revize", "pending"],
    ["PDF odeslano", "pending"],
    ["Fakturacni podklady", "pending"],
  ];
  for (let i = 0; i < checks.length; i++) {
    s += checkItem(mx + 20, cy3 + 56 + i * 22, checks[i][0], checks[i][1]);
  }

  // Activity card
  s += cardRect(mx + cw2 + 16, cy3, cw2, 210);
  s += boldText(mx + cw2 + 32, cy3 + 24, "Posledni aktivita", 13, C.primary);
  s += divider(mx + cw2 + 32, cy3 + 32, cw2 - 32);
  const detActs = [
    ["07.04. 14:32", "J. Novak", "dokoncil terenni setreni"],
    ["07.04. 14:30", "J. Novak", "pridal 4 fotografie"],
    ["05.04. 09:15", "System", "pripad prirazen J. Novakovi"],
    ["05.04. 09:00", "A. Horakova", "zalozila pripad"],
  ];
  for (let i = 0; i < detActs.length; i++) {
    s += activityItem(
      mx + cw2 + 32,
      cy3 + 56 + i * 28,
      detActs[i][0],
      detActs[i][1],
      detActs[i][2],
    );
  }

  s += svgClose();
  return s;
}

// 7. ASSIGN SOLVER
function genAssignSolver() {
  const w = DESKTOP_W,
    h = 440;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += boldText(mx, my + 20, "Pripad #2026-0342", 14, C.textSecondary);
  s += badge(mx + 160, my + 6, "PRIJATO", C.primary);
  s += text(mx + 280, my + 20, "Pojistovna: Kooperativa", 13, C.textSecondary);

  s += sectionTitle(mx, my + 50, "Prirazeni resitele");

  // Solver table card
  const ty = my + 68;
  s += cardRect(mx, ty, w - 48, 240);
  s += boldText(mx + 16, ty + 24, "Dostupni resitele", 13, C.textSecondary);
  const scols = [
    { label: "", width: 40 },
    { label: "Jmeno", width: 180 },
    { label: "Aktivni", width: 80 },
    { label: "Lokalita", width: 120 },
    { label: "Specializace", width: 160 },
    { label: "Kapacita", width: 160 },
  ];
  s += tableHeader(mx + 1, ty + 36, w - 50, scols);
  const solvers = [
    [false, "Jan Novak", "8/15", "Praha", "Majetek", 53],
    [false, "Petr Svoboda", "12/15", "Brno", "Automobily", 80],
    [true, "Marie Kralova", "5/15", "Praha", "Majetek, Odp.", 33],
    [false, "Tomas Havel", "15/15", "Ostrava", "Majetek", 100],
  ];
  for (let i = 0; i < solvers.length; i++) {
    const ry = ty + 72 + i * 40;
    const isWarning = solvers[i][5] >= 100;
    const isSelected = solvers[i][0];
    if (isSelected)
      s += `<rect x="${mx + 1}" y="${ry}" width="${w - 50}" height="40" fill="${C.primaryLight}" rx="0"/>`;
    if (isWarning)
      s += `<rect x="${mx + 1}" y="${ry}" width="${w - 50}" height="40" fill="${C.dangerLight}" rx="0"/>`;
    s += `<line x1="${mx + 1}" y1="${ry + 40}" x2="${w - 49}" y2="${ry + 40}" stroke="${C.border}" stroke-width="0.5"/>`;
    // Radio
    s += `<circle cx="${mx + 21}" cy="${ry + 20}" r="8" fill="${C.white}" stroke="${isSelected ? C.primary : C.border}" stroke-width="2"/>`;
    if (isSelected)
      s += `<circle cx="${mx + 21}" cy="${ry + 20}" r="4" fill="${C.primary}"/>`;
    s += text(mx + 53, ry + 24, solvers[i][1], 12, C.text, "start", "500");
    s += text(
      mx + 233,
      ry + 24,
      solvers[i][2],
      12,
      isWarning ? C.danger : C.textSecondary,
    );
    s += text(mx + 313, ry + 24, solvers[i][3], 12, C.textSecondary);
    s += text(mx + 433, ry + 24, solvers[i][4], 12, C.textSecondary);
    // Mini progress
    const bx = mx + 593,
      bw = 80,
      pct = solvers[i][5];
    s += `<rect x="${bx}" y="${ry + 15}" width="${bw}" height="8" fill="#F1F5F9" rx="4"/>`;
    s += `<rect x="${bx}" y="${ry + 15}" width="${(bw * Math.min(pct, 100)) / 100}" height="8" fill="${pct >= 100 ? C.danger : pct > 65 ? C.warning : C.success}" rx="4"/>`;
    s += text(
      bx + bw + 8,
      ry + 24,
      pct + "%",
      10,
      pct >= 100 ? C.danger : C.textSecondary,
      "start",
      "600",
    );

    if (isWarning) {
      s += text(mx + 53, ry + 38, "⚠ Plna kapacita", 10, C.danger);
    }
  }

  // Note + buttons
  const by = ty + 250;
  s += formField(mx, by + 4, "Poznamka k prirazeni", w - 48 - 260);
  s += btn(w - 296, by + 10, 120, 36, "Zrusit", "secondary");
  s += btn(w - 166, by + 10, 140, 36, "✓ Priradit", "primary");

  s += svgClose();
  return s;
}

// 8. MOBILE FIELD WORK
function genFieldWork() {
  const w = MOBILE_W,
    h = 680;
  let s = svgOpen(w, h);
  // Mobile header
  s += `<rect x="0" y="0" width="${w}" height="56" fill="${C.primary}" rx="8"/>`;
  s += `<rect x="0" y="48" width="${w}" height="8" fill="${C.primary}"/>`;
  s += `<g>${icon(12, 18, "back", 20, C.white)}</g>`;
  s += navAnnotation(40, 28, "Seznam pripadu");
  s += boldText(40, 35, "Pripad #2026-0342", 15, C.white);

  // Case info card
  const my = 68;
  s += cardRect(12, my, w - 24, 100);
  s += boldText(24, my + 22, "Kooperativa", 14, C.text);
  s += text(24, my + 40, "Majetek — Jan Dvorak", 12, C.textSecondary);
  s += text(24, my + 58, "Vodickova 12, Praha 1", 12, C.textSecondary);
  s += badge(24, my + 68, "V SETRENI", C.warning);
  s += slaIndicator(w - 40, my + 22, C.warning);
  s += text(w - 60, my + 40, "SLA: 4 dny", 11, C.warning, "end", "600");

  // Quick stats grid
  const gy = my + 112;
  const gw = (w - 36) / 2;
  const statsGrid = [
    { icon: "camera", label: "Foto", value: "12", color: C.primary },
    { icon: "file", label: "Poznamky", value: "3", color: C.purple },
    { icon: "folder", label: "Dokumenty", value: "5", color: C.success },
    { icon: "clock", label: "Cas", value: "2:30h", color: C.warning },
  ];
  for (let i = 0; i < 4; i++) {
    const gx = 12 + (i % 2) * (gw + 12);
    const gy2 = gy + Math.floor(i / 2) * (58 + 8);
    s += cardRect(gx, gy2, gw, 58);
    s += `<g>${icon(gx + 12, gy2 + 14, statsGrid[i].icon, 20, statsGrid[i].color)}</g>`;
    s += boldText(
      gx + 40,
      gy2 + 24,
      statsGrid[i].value,
      16,
      statsGrid[i].color,
    );
    s += text(gx + 40, gy2 + 44, statsGrid[i].label, 11, C.textSecondary);
  }

  // Action buttons
  const ay = gy + 140;
  s += `<rect x="12" y="${ay}" width="${w - 24}" height="48" fill="${C.primaryLight}" rx="10" stroke="${C.primary}" stroke-width="1"/>`;
  s += `<g>${icon(24, ay + 14, "camera", 20, C.primary)}</g>`;
  s += boldText(52, ay + 30, "Pridat fotografii", 14, C.primary);
  s += navAnnotation(w - 10, ay + 24, "Fotodokumentace");

  s += `<rect x="12" y="${ay + 58}" width="${w - 24}" height="48" fill="${C.purpleLight}" rx="10" stroke="${C.purple}" stroke-width="1"/>`;
  s += `<g>${icon(24, ay + 72, "file", 20, C.purple)}</g>`;
  s += boldText(52, ay + 88, "Pridat poznamku", 14, C.purple);

  s += `<rect x="12" y="${ay + 116}" width="${w - 24}" height="48" fill="${C.warningLight}" rx="10" stroke="${C.warning}" stroke-width="1"/>`;
  s += `<g>${icon(24, ay + 130, "clock", 20, "#92400E")}</g>`;
  s += boldText(52, ay + 146, "Zaznamenat cas", 14, "#92400E");

  // Complete button
  s += btn(12, ay + 184, w - 24, 48, "✓ Dokoncit setreni", "success");

  // Bottom nav
  const bny = h - 60;
  s += `<rect x="0" y="${bny}" width="${w}" height="60" fill="${C.card}" rx="0"/>`;
  s += `<line x1="0" y1="${bny}" x2="${w}" y2="${bny}" stroke="${C.border}" stroke-width="1"/>`;
  const bnItems = [
    { icon: "nav", label: "Menu" },
    { icon: "folder", label: "Pripady" },
    { icon: "clock", label: "SLA" },
    { icon: "user", label: "Profil" },
  ];
  const bnw = w / bnItems.length;
  for (let i = 0; i < bnItems.length; i++) {
    const bx = i * bnw + bnw / 2;
    s += `<g>${icon(bx - 8, bny + 10, bnItems[i].icon, 16, i === 1 ? C.primary : C.textMuted)}</g>`;
    s += text(
      bx,
      bny + 42,
      bnItems[i].label,
      10,
      i === 1 ? C.primary : C.textMuted,
      "middle",
      i === 1 ? "600" : "400",
    );
  }

  s += svgClose();
  return s;
}

// 9. PHOTO DOCUMENTATION (mobile)
function genPhotoDoc() {
  const w = MOBILE_W,
    h = 620;
  let s = svgOpen(w, h);
  s += `<rect x="0" y="0" width="${w}" height="56" fill="${C.primary}" rx="8"/>`;
  s += `<rect x="0" y="48" width="${w}" height="8" fill="${C.primary}"/>`;
  s += `<g>${icon(12, 18, "back", 20, C.white)}</g>`;
  s += navAnnotation(40, 28, "Terenni prace");
  s += boldText(40, 35, "Fotodokumentace", 15, C.white);

  const my = 68;
  // Photo preview area
  s += `<rect x="12" y="${my}" width="${w - 24}" height="200" fill="#1E293B" rx="12"/>`;
  s += `<rect x="${w / 2 - 30}" y="${my + 75}" width="60" height="60" fill="none" stroke="${C.white}" stroke-width="2" rx="30" opacity="0.5"/>`;
  s += `<g>${icon(w / 2 - 12, my + 94, "camera", 24, C.white)}</g>`;
  s += text(w / 2, my + 170, "Klepnete pro zachyceni", 12, "#94A3B8", "middle");

  // Category select
  const cy = my + 216;
  s += cardRect(12, cy, w - 24, 180);
  s += formSelect(24, cy + 16, "Kategorie", w - 48, false, "Celkovy pohled");
  const cats = [
    "Celkovy pohled",
    "Detail skody",
    "Stitek cislo domu",
    "Dokumenty na miste",
    "Jine",
  ];
  for (let i = 0; i < cats.length; i++) {
    const iy = cy + 70 + i * 22;
    s += `<circle cx="34" cy="${iy}" r="6" fill="${C.white}" stroke="${i === 0 ? C.primary : C.border}" stroke-width="2"/>`;
    if (i === 0) s += `<circle cx="34" cy="${iy}" r="3" fill="${C.primary}"/>`;
    s += text(48, iy + 4, cats[i], 12, i === 0 ? C.text : C.textSecondary);
  }

  // Description
  const dy = cy + 192;
  s += cardRect(12, dy, w - 24, 100);
  s += `<text x="24" y="${dy + 20}" font-size="12" fill="${C.textSecondary}" font-weight="500" ${FONT}>Popisek</text>`;
  s += `<rect x="24" y="${dy + 28}" width="${w - 48}" height="48" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>`;
  s += text(
    36,
    dy + 50,
    "Pohled na strop, viditelne zatekani...",
    12,
    C.textMuted,
  );

  // GPS + Time
  const gy = dy + 108;
  s += text(24, gy + 14, "📍 GPS: 50.0755, 14.4378", 11, C.textSecondary);
  s += text(24, gy + 32, "🕐 Cas: 07.04.2026 14:32", 11, C.textSecondary);

  // Save button
  s += btn(12, gy + 48, w - 24, 44, "✓ Ulozit fotografii", "primary");

  s += svgClose();
  return s;
}

// 10. DOCUMENTS
function genDocuments() {
  const w = DESKTOP_W,
    h = 540;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += boldText(mx, my + 18, "Pripad #2026-0342", 14, C.textSecondary);
  const tabs = [
    "Zakladni udaje",
    "Dokumenty",
    "Zprava",
    "Vykony",
    "Komunikace",
    "Historie",
  ];
  s += tabBar(mx, my + 28, w - 48, tabs, 1);
  s += navAnnotation(mx + 12, my + 28, "Zakladni udaje");
  s += navAnnotation(mx + 270, my + 28, "Expert. zprava");

  const ty = my + 82;
  s += btn(mx, ty, 170, 34, "+ Nahrat dokument", "primary");
  s += btn(mx + 180, ty, 160, 34, "+ Vytvorit slozku", "secondary");

  // Folder tree
  const fy = ty + 48;
  s += cardRect(mx, fy, w - 48, 340);

  const folders = [
    {
      name: "Objednavka",
      files: [
        "objednavka_pojistovny.pdf  120 KB",
        "priloha_objednavky.pdf  85 KB",
      ],
      count: 2,
      open: true,
    },
    {
      name: "Fotodokumentace",
      files: [
        "celkovy_pohled_01.jpg  2.1 MB",
        "detail_skody_01.jpg  1.8 MB",
        "detail_skody_02.jpg  2.3 MB",
        "stitek_domu.jpg  0.5 MB",
      ],
      count: 4,
      open: true,
    },
    {
      name: "Podklady od pojisteneho",
      files: [
        "pojistna_smlouva.pdf  340 KB",
        "doklad_o_vlastnictvi.pdf  210 KB",
      ],
      count: 2,
      open: false,
    },
    {
      name: "Expertni zprava",
      files: ["expertni_zprava_v2.docx  450 KB"],
      count: 2,
      open: false,
    },
  ];

  let oy = fy + 16;
  for (const folder of folders) {
    s += `<g>${icon(mx + 16, oy + 2, "folder", 18, C.primary)}</g>`;
    s += boldText(mx + 42, oy + 14, folder.name, 13, C.text);
    s += text(
      mx + 42 + folder.name.length * 7.5 + 8,
      oy + 14,
      `(${folder.count} soubory)`,
      11,
      C.textSecondary,
    );
    s += text(w - 80, oy + 14, folder.open ? "▼" : "▶", 12, C.textSecondary);
    oy += 28;

    if (folder.open) {
      for (const file of folder.files) {
        s += `<g>${icon(mx + 40, oy + 2, "file", 14, C.textMuted)}</g>`;
        s += text(mx + 60, oy + 14, file, 12, C.textSecondary);
        s += `<g>${icon(w - 80, oy + 2, "download", 14, C.primary)}</g>`;
        oy += 24;
      }
    }
    oy += 6;
  }

  s += svgClose();
  return s;
}

// 11. EXPERT REPORT
function genExpertReport() {
  const w = DESKTOP_W,
    h = 780;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += boldText(mx, my + 18, "Pripad #2026-0342", 14, C.textSecondary);
  const tabs = [
    "Zakladni udaje",
    "Dokumenty",
    "Zprava",
    "Vykony",
    "Komunikace",
    "Historie",
  ];
  s += tabBar(mx, my + 28, w - 48, tabs, 2);

  const ty = my + 80;
  s += text(mx, ty + 16, "Sablona:", 12, C.textSecondary);
  s += boldText(mx + 60, ty + 16, "Kooperativa — Majetek  v2", 13, C.text);
  s += badge(mx + 280, ty + 2, "ROZPRACOVANA", C.warning);
  s += btn(w - 120, ty, 96, 32, "Ulozit", "secondary");

  // Sections
  const sections = [
    {
      title: "1. Zakladni udaje (predvyplneno)",
      lines: [
        "Cislo skody: 4200012345",
        "Pojistovna: Kooperativa pojistovna, a.s.",
        "Datum udalosti: 15.03.2026",
        "Pojisteny: Jan Dvorak",
      ],
      filled: true,
    },
    {
      title: "2. Popis udalosti",
      textarea: true,
      content:
        "Dne 15.03.2026 doslo k zatopeni bytu v 3. NP bytoveho domu. Pricinou bylo praskle potrubi v koupelne...",
    },
    {
      title: "3. Rozsah skody",
      textarea: true,
      content:
        "Poskozeni podlahove krytiny v obyvacim pokoji (12 m2), poskozeni sadrokartonoveho stropu...",
    },
  ];

  let sy = ty + 40;
  for (const sec of sections) {
    s += cardRect(mx, sy, w - 48, sec.filled ? 110 : 90);
    s += boldText(mx + 16, sy + 24, sec.title, 13, C.text);
    if (sec.filled) {
      for (let i = 0; i < sec.lines.length; i++) {
        s += text(mx + 16, sy + 46 + i * 18, sec.lines[i], 12, C.textSecondary);
      }
    } else {
      s += `<rect x="${mx + 16}" y="${sy + 34}" width="${w - 80}" height="44" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>`;
      s += text(mx + 28, sy + 60, sec.content, 11, C.textSecondary);
    }
    sy += sec.filled ? 118 : 98;
  }

  // Photo section
  s += cardRect(mx, sy, w - 48, 100);
  s += boldText(mx + 16, sy + 24, "4. Fotodokumentace", 13, C.text);
  s += btn(mx + 16, sy + 36, 180, 28, "+ Pridat fotky ze spisu", "secondary");
  // Photo thumbnails
  for (let i = 0; i < 4; i++) {
    s += `<rect x="${mx + 16 + i * 78}" y="${sy + 70}" width="68" height="22" fill="#E2E8F0" rx="4"/>`;
    s += text(
      mx + 50 + i * 78,
      sy + 84,
      `foto ${i + 1}`,
      10,
      C.textSecondary,
      "middle",
    );
  }
  sy += 108;

  // Cost table
  s += cardRect(mx, sy, w - 48, 150);
  s += boldText(mx + 16, sy + 24, "5. Stanoveni skody", 13, C.text);
  const ccols = [
    { label: "Polozka", width: 400 },
    { label: "Castka (Kc)", width: 120 },
  ];
  s += tableHeader(mx + 16, sy + 34, w - 80, ccols);
  const costs = [
    ["Oprava podlahy (12 m2 × 850 Kc)", "10 200"],
    ["Oprava stropu (8 m2 × 620 Kc)", "4 960"],
    ["Malovani (20 m2 × 180 Kc)", "3 600"],
  ];
  for (let i = 0; i < costs.length; i++) {
    const ry = sy + 70 + i * 24;
    s += text(mx + 28, ry + 14, costs[i][0], 12, C.textSecondary);
    s += boldText(mx + 428, ry + 14, costs[i][1], 12, C.text);
  }
  s += divider(mx + 16, sy + 70 + costs.length * 24, w - 80);
  s += boldText(
    mx + 28,
    sy + 80 + costs.length * 24 + 14,
    "CELKEM",
    12,
    C.text,
  );
  s += boldText(
    mx + 428,
    sy + 80 + costs.length * 24 + 14,
    "21 260 Kc",
    14,
    C.primary,
  );
  sy += 158;

  // Action buttons
  s += btn(w - 400, sy, 160, 40, "Ulozit koncept", "secondary");
  s += btn(w - 230, sy, 200, 40, "▶ Odeslat k revizi", "primary");
  s += navAnnotation(w - 18, sy + 12, "Revize zpravy");

  s += svgClose();
  return s;
}

// 12. REVIEW
function genReview() {
  const w = DESKTOP_W,
    h = 580;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Revize zpravy");
  s += text(
    mx,
    my + 46,
    "Pripad #2026-0342   |   Resitel: Jan Novak",
    13,
    C.textSecondary,
  );

  const ry = my + 62;
  s += cardRect(mx, ry, w - 48, 360);
  s += boldText(
    mx + 16,
    ry + 24,
    "Obsah zpravy (pouze pro cteni)",
    13,
    C.textSecondary,
  );

  const secs = [
    { title: "1. Zakladni udaje", status: "ok" },
    {
      title: "2. Popis udalosti",
      status: "comment",
      comment: "Doplnit presny cas zjisteni skody.",
    },
    { title: "3. Rozsah skody", status: "ok" },
    { title: "4. Fotodokumentace", status: "ok" },
    {
      title: "5. Stanoveni skody",
      status: "comment",
      comment: "Overit cenu za m2 u podlahove krytiny.",
    },
    { title: "6. Zaver", status: "ok" },
  ];

  let sy = ry + 42;
  for (const sec of secs) {
    const sh = sec.status === "comment" ? 60 : 24;
    s += text(mx + 16, sy + 16, sec.title, 13, C.text, "start", "500");
    if (sec.status === "ok") {
      s += badge(mx + 200, sy + 2, "✓ OK", C.success);
    } else {
      s += badge(mx + 200, sy + 2, "💬 1", C.warning);
      s += `<rect x="${mx + 280}" y="${sy}" width="${w - 340}" height="50" fill="${C.warningLight}" rx="6" stroke="${C.warning}" stroke-width="1"/>`;
      s += text(mx + 292, sy + 16, `"${sec.comment}"`, 11, "#92400E");
      s += text(mx + 292, sy + 36, "— M. Kralova", 10, C.textMuted);
      s += `<text x="${mx + 292}" y="${sy + 48}" font-size="10" fill="${C.primary}" ${FONT}>+ Pridat komentar</text>`;
    }
    sy += sh + 10;
  }

  // Overall assessment
  sy += 10;
  s += `<text x="${mx + 16}" y="${sy}" font-size="12" fill="${C.textSecondary}" font-weight="500" ${FONT}>Celkove hodnoceni:</text>`;
  s += `<rect x="${mx + 16}" y="${sy + 6}" width="${w - 80}" height="40" fill="${C.inputBg}" rx="6" stroke="${C.inputBorder}" stroke-width="1"/>`;
  s += text(
    mx + 28,
    sy + 30,
    "Zprava je kvalitni, drobne pripominky viz komentare.",
    12,
    C.textSecondary,
  );

  // Buttons
  const by = ry + 370;
  s += btn(w - 400, by, 180, 40, "✕ Vratit k prepracovani", "danger");
  s += navAnnotation(w - 410, by + 12, "Expert. zprava");
  s += btn(w - 210, by, 180, 40, "✓ Schvalit zpravu", "success");
  s += navAnnotation(w - 18, by + 12, "Generovani PDF");

  s += svgClose();
  return s;
}

// 13. SLA OVERVIEW
function genSlaOverview() {
  const w = DESKTOP_W,
    h = 560;
  let s = svgOpen(w, h);
  s += header(w, "SLA");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "SLA prehled");
  s += select(w - 200, my + 4, 176, 34, "Vsechny pojistovny");

  // Stat cards
  const cw = (w - 48 - 32) / 3;
  s += statCard(mx, my + 46, cw, 80, "3", "Kriticke (prekroceno)", C.danger);
  s += statCard(mx + cw + 16, my + 46, cw, 80, "7", "Varovani", C.warning);
  s += statCard(
    mx + (cw + 16) * 2,
    my + 46,
    cw,
    80,
    "42",
    "V poradku",
    C.success,
  );

  // Critical table
  const ty = my + 144;
  s += cardRect(mx, ty, w - 48, 160);
  s += boldText(
    mx + 16,
    ty + 24,
    "Kriticke pripady (SLA prekroceno)",
    14,
    C.danger,
  );
  const scols = [
    { label: "# Pripad", width: 120 },
    { label: "Pojistovna", width: 150 },
    { label: "SLA metrika", width: 160 },
    { label: "Prekroceni", width: 120 },
    { label: "Resitel", width: 120 },
  ];
  s += tableHeader(mx + 1, ty + 36, w - 50, scols);
  const critical = [
    ["#2026-0298", "Kooperativa", "Exp. zprava", "+5 dnu", "Novak"],
    ["#2026-0301", "Ceska poj.", "Zahaj. setreni", "+3 dny", "Havel"],
    ["#2026-0315", "Allianz", "Prub. zprava", "+1 den", "Dvorak"],
  ];
  for (let i = 0; i < critical.length; i++) {
    const ry = ty + 72 + i * 28;
    s += `<line x1="${mx + 1}" y1="${ry + 28}" x2="${w - 49}" y2="${ry + 28}" stroke="${C.border}" stroke-width="0.5"/>`;
    s += slaIndicator(mx + 16, ry + 14, C.danger);
    let cx2 = mx + 1;
    for (let j = 0; j < critical[i].length; j++) {
      s += text(
        cx2 + (j === 0 ? 30 : 12),
        ry + 18,
        critical[i][j],
        12,
        j === 3 ? C.danger : C.textSecondary,
        "start",
        j === 0 ? "500" : "400",
      );
      cx2 += scols[j].width;
    }
  }

  // Warning table
  const wy = ty + 176;
  s += cardRect(mx, wy, w - 48, 130);
  s += boldText(
    mx + 16,
    wy + 24,
    "Varovani (SLA blizi se terminu)",
    14,
    C.warning,
  );
  s += tableHeader(mx + 1, wy + 36, w - 50, scols);
  const warnings = [
    ["#2026-0330", "Generali", "Exp. zprava", "2 dny", "Novak"],
    ["#2026-0331", "Kooperativa", "Zahaj. setreni", "1 den", "Kralova"],
  ];
  for (let i = 0; i < warnings.length; i++) {
    const ry = wy + 72 + i * 28;
    s += `<line x1="${mx + 1}" y1="${ry + 28}" x2="${w - 49}" y2="${ry + 28}" stroke="${C.border}" stroke-width="0.5"/>`;
    s += slaIndicator(mx + 16, ry + 14, C.warning);
    let cx2 = mx + 1;
    for (let j = 0; j < warnings[i].length; j++) {
      s += text(
        cx2 + (j === 0 ? 30 : 12),
        ry + 18,
        warnings[i][j],
        12,
        j === 3 ? C.warning : C.textSecondary,
        "start",
        j === 0 ? "500" : "400",
      );
      cx2 += scols[j].width;
    }
  }

  s += svgClose();
  return s;
}

// 14. ESCALATION
function genEscalation() {
  const w = DESKTOP_W,
    h = 340;
  let s = svgOpen(w, h);
  s += header(w, "SLA");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Eskalacni matice");

  const ey = my + 46;
  s += cardRect(mx, ey, w - 48, 210);

  const ecols = [
    { label: "Cas do SLA", width: 180 },
    { label: "Akce", width: 280 },
    { label: "Prijemce", width: 260 },
  ];
  s += tableHeader(mx + 1, ey + 6, w - 50, ecols);
  const escalations = [
    ["3 dny pred", "Email upozorneni", "Resitel", C.success],
    ["1 den pred", "Email + notifikace", "Resitel + Team Leader", C.warning],
    ["SLA termin", "Zvyrazneni na dashboard", "Vsichni", C.warning],
    ["1 den po", "Email eskalace", "Team Leader + Management", C.danger],
    ["3 dny po", "Urgentni eskalace", "Management", C.danger],
  ];
  for (let i = 0; i < escalations.length; i++) {
    const ry = ey + 42 + i * 34;
    s += `<line x1="${mx + 1}" y1="${ry + 34}" x2="${w - 49}" y2="${ry + 34}" stroke="${C.border}" stroke-width="0.5"/>`;
    s += slaIndicator(mx + 16, ry + 17, escalations[i][3]);
    s += text(mx + 30, ry + 21, escalations[i][0], 12, C.text, "start", "500");
    s += text(mx + 193, ry + 21, escalations[i][1], 12, C.textSecondary);
    s += text(mx + 473, ry + 21, escalations[i][2], 12, C.textSecondary);
  }

  s += svgClose();
  return s;
}

// 15. TIME TRACKING
function genTimeTracking() {
  const w = DESKTOP_W,
    h = 520;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += boldText(mx, my + 18, "Pripad #2026-0342", 14, C.textSecondary);
  const tabs = [
    "Zakladni udaje",
    "Dokumenty",
    "Zprava",
    "Vykony",
    "Komunikace",
    "Historie",
  ];
  s += tabBar(mx, my + 28, w - 48, tabs, 3);

  const ty = my + 82;
  // Existing records
  s += cardRect(mx, ty, w - 48, 210);
  s += boldText(mx + 16, ty + 24, "Evidence vykonu", 14, C.text);
  s += btn(w - 170, ty + 6, 140, 30, "+ Pridat vykon", "primary");

  const tcols = [
    { label: "Datum", width: 110 },
    { label: "Cinnost", width: 200 },
    { label: "Cas (h)", width: 80 },
    { label: "Kdo", width: 120 },
    { label: "Pozn.", width: 100 },
  ];
  s += tableHeader(mx + 1, ty + 42, w - 50, tcols);
  const tdata = [
    ["07.04.2026", "Terenni setreni", "2.50", "J. Novak", "..."],
    ["07.04.2026", "Cestovni cas", "1.25", "J. Novak", "..."],
    ["06.04.2026", "Zpracovani zpravy", "3.00", "J. Novak", "..."],
    ["05.04.2026", "Komunikace s poj.", "0.50", "J. Novak", "..."],
  ];
  for (let i = 0; i < tdata.length; i++) {
    const ry = ty + 78 + i * 28;
    s += `<line x1="${mx + 1}" y1="${ry + 28}" x2="${w - 49}" y2="${ry + 28}" stroke="${C.border}" stroke-width="0.5"/>`;
    let cx = mx + 1;
    for (let j = 0; j < tdata[i].length; j++) {
      s += text(
        cx + 12,
        ry + 18,
        tdata[i][j],
        12,
        j === 2 ? C.primary : C.textSecondary,
        "start",
        j === 2 ? "600" : "400",
      );
      cx += tcols[j].width;
    }
  }
  // Total row
  const try2 = ty + 78 + tdata.length * 28;
  s += `<rect x="${mx + 1}" y="${try2}" width="${w - 50}" height="28" fill="#F8FAFC" rx="0"/>`;
  s += boldText(mx + 13, try2 + 18, "CELKEM", 12, C.text);
  s += boldText(mx + 323, try2 + 18, "7.25", 13, C.primary);

  // Add form
  const fy = ty + 222;
  s += cardRect(mx, fy, w - 48, 170);
  s += boldText(mx + 16, fy + 24, "Pridat vykon", 14, C.text);
  const ffw = (w - 108) / 3;
  s += formField(mx + 16, fy + 50, "Datum", ffw, true, "07.04.2026");
  s += formSelect(
    mx + 36 + ffw,
    fy + 50,
    "Typ cinnosti",
    ffw,
    true,
    "Terenni setreni",
  );
  s += formField(mx + 56 + ffw * 2, fy + 50, "Cas (hodiny)", ffw, true, "2.50");
  s += text(
    mx + 56 + ffw * 2,
    fy + 108,
    "Krok: 0.05 h (= 3 min)",
    10,
    C.textMuted,
  );
  s += formField(mx + 16, fy + 112, "Poznamka", ffw * 2 + 20);
  s += btn(w - 166, fy + 130, 60, 32, "Zrusit", "secondary");
  s += btn(w - 96, fy + 130, 70, 32, "✓ Ulozit", "primary");

  s += svgClose();
  return s;
}

// 16. TRAVEL
function genTravel() {
  const w = DESKTOP_W,
    h = 320;
  let s = svgOpen(w, h);

  const mx = 24,
    my = 12;
  s += cardRect(mx, my, w - 48, 280);
  s += boldText(mx + 16, my + 24, "Evidence cest", 14, C.text);
  s += btn(w - 170, my + 6, 140, 30, "+ Pridat cestu", "primary");

  const tcols = [
    { label: "Datum", width: 110 },
    { label: "Odkud", width: 160 },
    { label: "Kam", width: 160 },
    { label: "km", width: 80 },
    { label: "Nahrada", width: 120 },
  ];
  s += tableHeader(mx + 1, my + 42, w - 50, tcols);
  const tdata = [
    ["07.04.2026", "Kancelar", "Vodickova 12, Praha", "35", "185 Kc"],
    ["07.04.2026", "Vodickova 12, Praha", "Kancelar", "35", "185 Kc"],
  ];
  for (let i = 0; i < tdata.length; i++) {
    const ry = my + 78 + i * 34;
    s += `<line x1="${mx + 1}" y1="${ry + 34}" x2="${w - 49}" y2="${ry + 34}" stroke="${C.border}" stroke-width="0.5"/>`;
    let cx = mx + 1;
    for (let j = 0; j < tdata[i].length; j++) {
      s += text(cx + 12, ry + 21, tdata[i][j], 12, C.textSecondary);
      cx += tcols[j].width;
    }
  }
  const totY = my + 78 + tdata.length * 34;
  s += `<rect x="${mx + 1}" y="${totY}" width="${w - 50}" height="30" fill="#F8FAFC" rx="0"/>`;
  s += boldText(mx + 13, totY + 20, "CELKEM", 12, C.text);
  s += boldText(mx + 443, totY + 20, "70", 12, C.primary);
  s += boldText(mx + 523, totY + 20, "370 Kc", 12, C.primary);

  s += text(
    mx + 16,
    totY + 54,
    "Sazba 2026: 5.30 Kc/km (dle vyhlasky)",
    11,
    C.textMuted,
  );

  s += svgClose();
  return s;
}

// 17. BILLING
function genBilling() {
  const w = DESKTOP_W,
    h = 480;
  let s = svgOpen(w, h);
  s += header(w, "Fakturace");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Fakturacni podklady");

  // Filters
  const fy = my + 44;
  s += formSelect(mx, fy, "Pojistovna", 200, false, "Kooperativa");
  s += formField(mx + 220, fy, "Obdobi", 140, false, "04/2026");
  s += btn(mx + 380, fy + 12, 100, 32, "Zobrazit", "primary");

  // Table
  const ty = fy + 60;
  s += cardRect(mx, ty, w - 48, 230);
  const bcols = [
    { label: "# Pripad", width: 110 },
    { label: "Cislo skody", width: 130 },
    { label: "Hodiny", width: 80 },
    { label: "km", width: 70 },
    { label: "Ext. naklady", width: 110 },
    { label: "Celkem", width: 120 },
  ];
  s += tableHeader(mx + 1, ty + 6, w - 50, bcols);
  const bdata = [
    ["#2026-0342", "4200012345", "7.25", "70", "0", "8 995 Kc"],
    ["#2026-0338", "4200012301", "4.50", "45", "1 200", "7 188 Kc"],
    ["#2026-0335", "4200012289", "12.00", "120", "0", "15 636 Kc"],
  ];
  for (let i = 0; i < bdata.length; i++) {
    const ry = ty + 42 + i * 40;
    s += `<line x1="${mx + 1}" y1="${ry + 40}" x2="${w - 49}" y2="${ry + 40}" stroke="${C.border}" stroke-width="0.5"/>`;
    let cx = mx + 1;
    for (let j = 0; j < bdata[i].length; j++) {
      s += text(
        cx + 12,
        ry + 24,
        bdata[i][j],
        12,
        j === 5 ? C.text : C.textSecondary,
        "start",
        j === 0 || j === 5 ? "500" : "400",
      );
      cx += bcols[j].width;
    }
  }
  const totY = ty + 42 + bdata.length * 40;
  s += `<rect x="${mx + 1}" y="${totY}" width="${w - 50}" height="36" fill="#F8FAFC" rx="0"/>`;
  s += boldText(mx + 13, totY + 22, "CELKEM", 13, C.text);
  s += boldText(mx + 333, totY + 22, "23.75", 12, C.primary);
  s += boldText(mx + 413, totY + 22, "235", 12, C.primary);
  s += boldText(mx + 483, totY + 22, "1 200", 12, C.primary);
  s += boldText(mx + 593, totY + 22, "31 819 Kc", 14, C.primary);

  // Action buttons
  const by = totY + 56;
  s += btn(w - 370, by, 170, 40, "Export do Excelu", "secondary");
  s += btn(w - 190, by, 170, 40, "Generovat fakturu", "primary");

  s += svgClose();
  return s;
}

// 18. COMMUNICATION
function genCommunication() {
  const w = DESKTOP_W,
    h = 480;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += boldText(mx, my + 18, "Pripad #2026-0342", 14, C.textSecondary);
  const tabs = [
    "Zakladni udaje",
    "Dokumenty",
    "Zprava",
    "Vykony",
    "Komunikace",
    "Historie",
  ];
  s += tabBar(mx, my + 28, w - 48, tabs, 4);

  const ty = my + 82;
  s += btn(mx, ty, 140, 34, "+ Novy zaznam", "secondary");
  s += btn(mx + 150, ty, 200, 34, "✉ Odeslat email ze sablony", "primary");
  s += navAnnotation(w - 48 - 200, ty + 8, "Sablona emailu");

  // Messages
  const msgs = [
    {
      date: "07.04.2026 14:30",
      dir: "ODCHOZI",
      to: "pojistovna@kooperativa.cz",
      subject: "Pripad 4200012345 — zadost o podklady",
      body: "Zaslana zadost o dodani pojistne smlouvy...",
      color: C.primary,
    },
    {
      date: "05.04.2026 09:15",
      dir: "PRICHOZI",
      to: "objednavky@kooperativa.cz",
      subject: "Objednavka setreni — 4200012345",
      body: "Nova objednavka setreni, viz priloha...",
      attachment: "objednavka.pdf (120 KB)",
      color: C.success,
    },
  ];

  let my2 = ty + 48;
  for (const msg of msgs) {
    s += cardRect(mx, my2, w - 48, 110);
    s += `<rect x="${mx}" y="${my2}" width="4" height="110" fill="${msg.color}" rx="2"/>`;
    s += `<g>${icon(mx + 16, my2 + 12, "mail", 18, msg.color)}</g>`;
    s += boldText(mx + 42, my2 + 24, msg.date, 11, C.textSecondary);
    s += badge(mx + 160, my2 + 10, msg.dir, msg.color);
    s += text(
      mx + 16,
      my2 + 48,
      msg.dir === "ODCHOZI" ? "Komu:" : "Od:",
      11,
      C.textSecondary,
    );
    s += text(mx + 50, my2 + 48, msg.to, 11, C.text);
    s += text(mx + 16, my2 + 66, "Predmet:", 11, C.textSecondary);
    s += boldText(mx + 70, my2 + 66, msg.subject, 12, C.text);
    s += text(mx + 16, my2 + 86, msg.body, 12, C.textSecondary);
    if (msg.attachment) {
      s += `<g>${icon(mx + 16, my2 + 92, "file", 14, C.primary)}</g>`;
      s += text(mx + 36, my2 + 104, msg.attachment, 11, C.primary);
    }
    my2 += 120;
  }

  s += svgClose();
  return s;
}

// 19. EMAIL TEMPLATE
function genEmailTemplate() {
  const w = DESKTOP_W,
    h = 560;
  let s = svgOpen(w, h);
  s += header(w, "Pripady");

  const mx = 24,
    my = 72;
  s += sectionTitle(mx, my + 20, "Odeslat email ze sablony");
  s += text(mx, my + 46, "Pripad: #2026-0342", 13, C.textSecondary);

  const ty = my + 60;
  // Template selection
  s += cardRect(mx, ty, 300, 200);
  s += boldText(mx + 16, ty + 24, "Vyberte sablonu", 13, C.textSecondary);
  const templates = [
    "Potvrzeni prijmu objednavky",
    "Zadost o doplneni podkladu",
    "3mesicni dopis (prubezna info)",
    "Odeslani expertni zpravy",
    "Informace o uzavreni pripadu",
  ];
  for (let i = 0; i < templates.length; i++) {
    const iy = ty + 46 + i * 30;
    const sel = i === 2;
    s += `<circle cx="${mx + 26}" cy="${iy + 4}" r="8" fill="${C.white}" stroke="${sel ? C.primary : C.border}" stroke-width="2"/>`;
    if (sel)
      s += `<circle cx="${mx + 26}" cy="${iy + 4}" r="4" fill="${C.primary}"/>`;
    s += text(
      mx + 42,
      iy + 8,
      templates[i],
      12,
      sel ? C.text : C.textSecondary,
      "start",
      sel ? "500" : "400",
    );
  }

  // Preview
  s += cardRect(mx + 316, ty, w - 48 - 316, 380);
  s += boldText(mx + 332, ty + 24, "Nahled", 13, C.textSecondary);
  s += divider(mx + 332, ty + 32, w - 48 - 332 - 16);
  s += text(mx + 332, ty + 52, "Komu:", 11, C.textSecondary);
  s += text(mx + 380, ty + 52, "pojistovna@kooperativa.cz", 11, C.text);
  s += text(mx + 332, ty + 72, "Predmet:", 11, C.textSecondary);
  s += boldText(
    mx + 380,
    ty + 72,
    "Prubezna informace — pripad c. 4200012345",
    11,
    C.text,
  );
  s += divider(mx + 332, ty + 82, w - 48 - 332 - 16);

  const previewLines = [
    "Vazeni,",
    "",
    "dovolujeme si Vam zaslat prubeznou informaci",
    "o stavu setreni pojistne udalosti c. 4200012345.",
    "",
    "Stav: V setreni",
    "Duvod: Cekame na dodani pojistne smlouvy",
    "od pojisteneho.",
    "",
    "S pozdravem,",
    "LAPA SERVICE s.r.o.",
  ];
  for (let i = 0; i < previewLines.length; i++) {
    if (previewLines[i]) {
      s += text(
        mx + 332,
        ty + 104 + i * 18,
        previewLines[i],
        12,
        C.textSecondary,
      );
    }
  }

  // Buttons
  const by = ty + 390;
  s += btn(mx, by, 200, 40, "Upravit pred odeslanim", "secondary");
  s += btn(w - 170, by, 150, 40, "✉ Odeslat", "primary");

  s += svgClose();
  return s;
}

// 20. NAVIGATION MAP
function genNavigation() {
  const w = DESKTOP_W,
    h = 600;
  let s = svgOpen(w, h);

  s += boldText(
    w / 2,
    30,
    "LAPA SERVICE IS — Mapa navigace",
    18,
    C.text,
    "middle",
  );
  s += text(
    w / 2,
    50,
    "Prehled obrazovek a navigacnich cest mezi nimi",
    12,
    C.textSecondary,
    "middle",
  );

  // Nodes
  const nodes = [
    { id: "login", x: 400, y: 80, label: "Prihlaseni", color: C.textSecondary },
    { id: "dash", x: 400, y: 150, label: "Dashboard", color: C.primary },
    { id: "cases", x: 120, y: 250, label: "Seznam pripadu", color: C.primary },
    { id: "sla", x: 320, y: 250, label: "SLA prehled", color: C.danger },
    { id: "reports", x: 500, y: 250, label: "Reporty", color: C.success },
    { id: "billing", x: 680, y: 250, label: "Fakturace", color: C.purple },
    {
      id: "admin",
      x: 820,
      y: 250,
      label: "Administrace",
      color: C.textSecondary,
    },
    { id: "new", x: 40, y: 350, label: "Novy pripad", color: C.primary },
    { id: "detail", x: 200, y: 350, label: "Detail pripadu", color: C.primary },
    { id: "info", x: 40, y: 440, label: "Zakladni udaje", color: "#64748B" },
    { id: "docs", x: 150, y: 440, label: "Dokumenty", color: "#64748B" },
    { id: "report", x: 270, y: 440, label: "Expert. zprava", color: "#64748B" },
    { id: "perf", x: 400, y: 440, label: "Vykony", color: "#64748B" },
    { id: "comm", x: 510, y: 440, label: "Komunikace", color: "#64748B" },
    { id: "hist", x: 630, y: 440, label: "Historie", color: "#64748B" },
    { id: "review", x: 220, y: 530, label: "Revize zpravy", color: C.danger },
    { id: "pdf", x: 360, y: 530, label: "Generovani PDF", color: C.success },
    { id: "email", x: 510, y: 530, label: "Sablona emailu", color: "#1ABC9C" },
  ];

  const edges = [
    ["login", "dash"],
    ["dash", "cases"],
    ["dash", "sla"],
    ["dash", "reports"],
    ["dash", "billing"],
    ["dash", "admin"],
    ["cases", "new"],
    ["cases", "detail"],
    ["detail", "info"],
    ["detail", "docs"],
    ["detail", "report"],
    ["detail", "perf"],
    ["detail", "comm"],
    ["detail", "hist"],
    ["report", "review"],
    ["report", "pdf"],
    ["comm", "email"],
  ];

  // Draw edges first
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  for (const [from, to] of edges) {
    const f = nodeMap[from],
      t = nodeMap[to];
    s += `<line x1="${f.x}" y1="${f.y + 16}" x2="${t.x}" y2="${t.y - 8}" stroke="${C.border}" stroke-width="1.5" marker-end="url(#arrowhead)"/>`;
  }

  // Arrowhead marker
  s += `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    <path d="M0,0 L8,3 L0,6 Z" fill="${C.borderDark}"/>
  </marker></defs>`;

  // Draw nodes
  for (const n of nodes) {
    const nw = n.label.length * 7.5 + 24;
    s += `<rect x="${n.x - nw / 2}" y="${n.y - 14}" width="${nw}" height="28" fill="${C.card}" rx="14" filter="url(#shadow)" stroke="${n.color}" stroke-width="1.5"/>`;
    s += text(n.x, n.y + 4, n.label, 11, n.color, "middle", "500");
  }

  s += svgClose();
  return s;
}

// ════════════════════════════════════════════════════════════
// GENERATE ALL
// ════════════════════════════════════════════════════════════
const wireframes = {
  "wf-login": genLogin,
  "wf-dashboard-tl": genDashboardTL,
  "wf-dashboard-mgmt": genDashboardMgmt,
  "wf-cases-list": genCasesList,
  "wf-case-new": genCaseNew,
  "wf-case-detail": genCaseDetail,
  "wf-assign-solver": genAssignSolver,
  "wf-field-work": genFieldWork,
  "wf-photo-doc": genPhotoDoc,
  "wf-documents": genDocuments,
  "wf-expert-report": genExpertReport,
  "wf-review": genReview,
  "wf-sla-overview": genSlaOverview,
  "wf-escalation": genEscalation,
  "wf-time-tracking": genTimeTracking,
  "wf-travel": genTravel,
  "wf-billing": genBilling,
  "wf-communication": genCommunication,
  "wf-email-template": genEmailTemplate,
  "wf-navigation": genNavigation,
};

let count = 0;
for (const [name, gen] of Object.entries(wireframes)) {
  const svg = gen();
  fs.writeFileSync(path.join(OUT, name + ".svg"), svg, "utf8");
  count++;
  console.log(`✓ ${name}.svg`);
}
console.log(`\nGenerated ${count} wireframes to ${OUT}`);
