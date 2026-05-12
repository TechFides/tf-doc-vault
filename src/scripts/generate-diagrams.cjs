// SVG Diagram Generator for Business & Technical Analysis
// Reuses design tokens from wireframe generator for visual consistency
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "docs", "public", "images", "diagrams");
fs.mkdirSync(OUT, { recursive: true });

// ── Design tokens (matching wireframes) ──────────────────────
const C = {
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
  primaryDark: "#1D4ED8",
  bg: "#F1F5F9",
  card: "#FFFFFF",
  border: "#E2E8F0",
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
  orange: "#F97316",
  orangeLight: "#FFF7ED",
  teal: "#14B8A6",
  tealLight: "#CCFBF1",
};

const FONT = `font-family="Inter, system-ui, -apple-system, sans-serif"`;

function svgOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${FONT}>
  <defs>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="108%">
      <feDropShadow dx="0" dy="1" stdDeviation="3" flood-opacity="0.08"/>
    </filter>
    <filter id="shadowLg" x="-4%" y="-4%" width="108%" height="116%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12"/>
    </filter>
    <linearGradient id="primaryGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.primary}"/>
      <stop offset="100%" stop-color="${C.primaryDark}"/>
    </linearGradient>
    <linearGradient id="successGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.success}"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="dangerGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.danger}"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
    <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${C.primary}"/>
    </marker>
    <marker id="arrowGray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${C.textSecondary}"/>
    </marker>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.bg}" rx="8"/>`;
}
const svgClose = () => "</svg>";
const rect = (x, y, w, h, fill, rx = 8, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" ${extra}/>`;
const card = (x, y, w, h, rx = 12) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.card}" rx="${rx}" filter="url(#shadow)" stroke="${C.border}" stroke-width="1"/>`;
const text = (
  x,
  y,
  content,
  size = 14,
  fill = C.text,
  anchor = "start",
  extra = "",
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${content}</text>`;
const boldText = (x, y, content, size = 14, fill = C.text, anchor = "start") =>
  text(x, y, content, size, fill, anchor, 'font-weight="600"');
const line = (x1, y1, x2, y2, color = C.border, width = 1, dashed = false) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dashed ? 'stroke-dasharray="6,4"' : ""}/>`;
const arrow = (x1, y1, x2, y2, color = C.primary) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#arrow${color === C.primary ? "Blue" : "Gray"})"/>`;

function title(x, y, content, w) {
  return `${rect(x, y, w, 36, "url(#primaryGrad)", 8)}
  ${boldText(x + w / 2, y + 23, content, 15, C.white, "middle")}`;
}

function labeledBox(x, y, w, h, label, bgColor, borderColor, rx = 10) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bgColor}" rx="${rx}" stroke="${borderColor}" stroke-width="1.5"/>
  ${boldText(x + 12, y + 20, label, 12, borderColor)}`;
}

function iconCircle(cx, cy, r, bgColor, icon, iconSize = 14) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgColor}"/>
  ${text(cx, cy + iconSize * 0.35, icon, iconSize, C.white, "middle")}`;
}

// ════════════════════════════════════════════════════════════════
// BUSINESS ANALYSIS DIAGRAMS
// ════════════════════════════════════════════════════════════════

// 1. Current state - manual processes
function genCurrentState() {
  const w = 860,
    h = 440;
  let s = svgOpen(w, h);
  // Title
  s += title(20, 15, "AKTUALNI STAV - Manualni procesy", w - 40);

  // Pojistovna (left)
  s += card(30, 75, 180, 120);
  s += rect(30, 75, 180, 40, C.primaryLight, 12);
  s += boldText(120, 100, "Pojistovna", 14, C.primary, "middle");
  s += text(120, 130, "Objednavka", 13, C.text, "middle");
  s += text(120, 150, "(email)", 12, C.textSecondary, "middle");
  s += text(120, 175, "Zasilaji objednavky", 11, C.textMuted, "middle");

  // LAPA manual (center)
  s += card(260, 65, 340, 200);
  s += rect(260, 65, 340, 40, C.dangerLight, 12);
  s += boldText(430, 90, "LAPA SERVICE (dnes)", 14, C.danger, "middle");

  // Tools icons
  const tools = [
    { icon: "Outlook", x: 290, y: 125 },
    { icon: "Excel", x: 390, y: 125 },
    { icon: "Word", x: 490, y: 125 },
  ];
  tools.forEach((t) => {
    s += rect(t.x, t.y, 80, 35, C.dangerLight, 6);
    s += text(
      t.x + 40,
      t.y + 22,
      t.icon,
      12,
      C.danger,
      "middle",
      'font-weight="500"',
    );
  });
  s += rect(340, 175, 180, 35, C.dangerLight, 6);
  s += text(
    430,
    197,
    "Slozky na disku",
    12,
    C.danger,
    "middle",
    'font-weight="500"',
  );
  s += text(430, 240, "Manualni evidence", 11, C.textMuted, "middle");

  // Pojistovna (right) - receives
  s += card(650, 75, 180, 120);
  s += rect(650, 75, 180, 40, C.primaryLight, 12);
  s += boldText(740, 100, "Pojistovna", 14, C.primary, "middle");
  s += text(740, 130, "Prijima zpravy", 13, C.text, "middle");
  s += text(740, 150, "a PDF", 12, C.textSecondary, "middle");

  // Arrows
  s += arrow(210, 135, 255, 135);
  s += text(220, 125, "email", 10, C.textSecondary, "middle");
  s += arrow(600, 135, 645, 135);
  s += text(618, 125, "email", 10, C.textSecondary, "middle");

  // Problems section
  s += card(30, 290, w - 60, 130);
  s += rect(30, 290, w - 60, 36, C.dangerLight, 12);
  s += boldText(430, 314, "Identifikovane problemy", 13, C.danger, "middle");

  const problems = [
    "Zadne SLA hlidani",
    "Duplicitni prace",
    "Chybi prehled",
    "Roztristena data",
    "Manualni evidence",
    "Slozite reportovani",
  ];
  problems.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = 60 + col * 260;
    const py = 345 + row * 30;
    s += iconCircle(px, py, 8, C.danger, "!", 10);
    s += text(px + 14, py + 5, p, 12, C.text);
  });

  s += svgClose();
  return s;
}

// 2. Key legal deadlines
function genLegalDeadlines() {
  const w = 780,
    h = 360;
  let s = svgOpen(w, h);

  s += title(20, 15, "Klicove lhuty dle legislativy", w - 40);

  // Timeline
  const steps = [
    { label: "Prijem skody", color: C.primary, x: 80 },
    { label: "Zahajeni setreni", color: C.warning, x: 270 },
    { label: "Ukonceni setreni", color: C.success, x: 460 },
    { label: "Vyplaceni plneni", color: C.purple, x: 650 },
  ];

  const timelineY = 110;
  // Connecting line
  s += line(80, timelineY, 700, timelineY, C.border, 3);

  steps.forEach((st) => {
    s += `<circle cx="${st.x}" cy="${timelineY}" r="16" fill="${st.color}"/>`;
    s += `<circle cx="${st.x}" cy="${timelineY}" r="8" fill="${C.white}"/>`;
    s += boldText(st.x, timelineY + 40, st.label, 12, C.text, "middle");
  });

  // Duration labels between steps
  const durations = [
    { from: 80, to: 270, label: "max 15 dnu", y: timelineY - 30 },
    { from: 270, to: 460, label: "max 3 mesice", y: timelineY - 30 },
    { from: 460, to: 650, label: "max 15 dnu", y: timelineY - 30 },
  ];

  durations.forEach((d) => {
    const mid = (d.from + d.to) / 2;
    s += rect(
      mid - 55,
      d.y - 14,
      110,
      24,
      C.warningLight,
      12,
      `stroke="${C.warning}" stroke-width="1"`,
    );
    s += boldText(mid, d.y + 3, d.label, 11, C.warning, "middle");
  });

  // Additional requirements
  s += card(30, 180, w - 60, 160);
  s += rect(30, 180, w - 60, 36, C.primaryLight, 12);
  s += boldText(w / 2, 204, "Doplnujici pozadavky", 13, C.primary, "middle");

  const reqs = [
    {
      icon: "i",
      label:
        "Prodlouzeni setreni nad 3 mesice nutno pisemne zduvodnit pojistovne",
      color: C.warning,
    },
    {
      icon: "!",
      label:
        "Mesicni report otevrenych pripadu - zaslani pojistovne 1x mesicne",
      color: C.primary,
    },
    {
      icon: "§",
      label: "Dle OZ § 2796 - pojistovna musi byt informovana o stavu setreni",
      color: C.purple,
    },
  ];
  reqs.forEach((r, i) => {
    const ry = 235 + i * 32;
    s += iconCircle(60, ry, 10, r.color, r.icon, 10);
    s += text(80, ry + 5, r.label, 12, C.text);
  });

  s += svgClose();
  return s;
}

// 3. Target state - new IS
function genTargetState() {
  const w = 860,
    h = 480;
  let s = svgOpen(w, h);

  s += title(20, 15, "CILOVY STAV - Jednotny informacni system", w - 40);

  // Pojistovna left
  s += card(30, 75, 160, 110);
  s += rect(30, 75, 160, 36, C.primaryLight, 12);
  s += boldText(110, 98, "Pojistovna", 13, C.primary, "middle");
  s += text(110, 128, "Objednavka", 12, C.text, "middle");
  s += text(110, 146, "(email)", 11, C.textSecondary, "middle");

  // Central system
  s += card(230, 65, 400, 280);
  s += rect(230, 65, 400, 44, "url(#successGrad)", 12);
  s += boldText(430, 92, "LAPA SERVICE IS", 16, C.white, "middle");

  // System modules
  const modules = [
    { label: "Dashboard", icon: ">", color: C.primary },
    { label: "Spisy", icon: "S", color: C.success },
    { label: "Dokumenty", icon: "D", color: C.purple },
    { label: "SLA", icon: "!", color: C.danger },
    { label: "Workflow", icon: "W", color: C.warning },
    { label: "Reporty", icon: "R", color: C.teal },
    { label: "Fakturace", icon: "F", color: C.orange },
  ];
  modules.forEach((m, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const mx = 260 + col * 92;
    const my = 125 + row * 70;
    s += rect(
      mx,
      my,
      80,
      55,
      m.color + "15",
      8,
      `stroke="${m.color}" stroke-width="1"`,
    );
    s += iconCircle(mx + 15, my + 20, 10, m.color, m.icon, 9);
    s += text(
      mx + 40,
      my + 42,
      m.label,
      11,
      C.text,
      "middle",
      'font-weight="500"',
    );
  });

  // Database
  s += rect(
    280,
    290,
    150,
    35,
    C.primaryLight,
    6,
    `stroke="${C.primary}" stroke-width="1"`,
  );
  s += text(
    355,
    312,
    "PostgreSQL DB",
    11,
    C.primary,
    "middle",
    'font-weight="500"',
  );
  s += rect(
    450,
    290,
    150,
    35,
    C.successLight,
    6,
    `stroke="${C.success}" stroke-width="1"`,
  );
  s += text(
    525,
    312,
    "GCP Hosting",
    11,
    C.success,
    "middle",
    'font-weight="500"',
  );

  // Pojistovna right
  s += card(670, 75, 160, 110);
  s += rect(670, 75, 160, 36, C.primaryLight, 12);
  s += boldText(750, 98, "Pojistovna", 13, C.primary, "middle");
  s += text(750, 128, "Prijima zpravy", 12, C.text, "middle");
  s += text(750, 146, "a PDF", 11, C.textSecondary, "middle");

  // Mobile
  s += card(30, 220, 160, 110);
  s += rect(30, 220, 160, 36, C.warningLight, 12);
  s += boldText(110, 243, "Terenni expert", 13, C.warning, "middle");
  s += text(110, 274, "Mobil / Tablet", 12, C.text, "middle");
  s += text(110, 292, "Responsivni web", 11, C.textSecondary, "middle");

  // Reports
  s += card(670, 220, 160, 110);
  s += rect(670, 220, 160, 36, C.tealLight, 12);
  s += boldText(750, 243, "Reporty", 13, C.teal, "middle");
  s += text(750, 274, "Mesicni prehled", 12, C.text, "middle");
  s += text(750, 292, "Automaticky", 11, C.textSecondary, "middle");

  // Arrows
  s += arrow(190, 130, 225, 130);
  s += arrow(630, 130, 665, 130);
  s += arrow(190, 275, 225, 200);
  s += arrow(630, 275, 665, 275);

  // Benefits section
  s += card(30, 370, w - 60, 90);
  s += rect(30, 370, w - 60, 32, C.successLight, 12);
  s += boldText(w / 2, 392, "Klicove prinosy", 13, C.success, "middle");

  const benefits = [
    "Automaticke SLA",
    "Centralni data",
    "Mobilni pristup",
    "Sablony zprav",
    "Reporty 1-klik",
  ];
  benefits.forEach((b, i) => {
    const bx = 60 + i * 160;
    s += iconCircle(bx, 425, 8, C.success, "✓", 9);
    s += text(bx + 14, 430, b, 11, C.text, "start", 'font-weight="500"');
  });

  s += svgClose();
  return s;
}

// 4. Manual vs IS comparison
function genComparison() {
  const w = 860,
    h = 520;
  let s = svgOpen(w, h);

  s += title(20, 15, "Srovnani: Manualni pristup vs. Novy IS", w - 40);

  const items = [
    {
      task: "Zalozeni pripadu",
      old: "15-20 min",
      oldSub: "prepis z emailu",
      new_: "2-3 min",
      newSub: "automaticky z emailu",
    },
    {
      task: "Hledani informaci",
      old: "5-15 min",
      oldSub: "prochazeni slozek",
      new_: "okamzite",
      newSub: "vyhledavani v IS",
    },
    {
      task: "Kontrola SLA",
      old: "1x denne",
      oldSub: "manualne, casto se zapomene",
      new_: "24/7",
      newSub: "automaticke upozorneni",
    },
    {
      task: "Expertni zprava",
      old: "60-90 min",
      oldSub: "rucne vyplnovani",
      new_: "30-45 min",
      newSub: "predvyplnena sablona",
    },
    {
      task: "Mesicni report",
      old: "4-8 hodin",
      oldSub: "rucni sbirani dat",
      new_: "5 minut",
      newSub: "automaticky generovany",
    },
    {
      task: "Fakturacni podklady",
      old: "2-4 hodiny",
      oldSub: "rucni kompilace",
      new_: "15 minut",
      newSub: "generovano z evidenci",
    },
  ];

  // Headers
  s += card(20, 65, w - 40, 44);
  s += rect(20, 65, 260, 44, C.textSecondary + "10", 12);
  s += boldText(150, 92, "Cinnost", 13, C.textSecondary, "middle");
  s += rect(280, 65, 270, 44, C.dangerLight, 0);
  s += boldText(415, 92, "DNES (manualne)", 13, C.danger, "middle");
  s += rect(550, 65, 270, 44, C.successLight, 12);
  s += boldText(685, 92, "S NOVYM IS", 13, C.success, "middle");

  items.forEach((item, i) => {
    const ry = 120 + i * 62;
    const bgColor = i % 2 === 0 ? C.white : "#F8FAFC";
    s += rect(20, ry, w - 40, 58, bgColor, i === items.length - 1 ? 8 : 0);

    // Task name
    s += boldText(40, ry + 28, item.task, 13, C.text);

    // Old way
    s += rect(300, ry + 8, 100, 40, C.dangerLight, 6);
    s += boldText(350, ry + 28, item.old, 14, C.danger, "middle");
    s += text(420, ry + 22, item.oldSub, 11, C.textSecondary);

    // New way
    s += rect(570, ry + 8, 100, 40, C.successLight, 6);
    s += boldText(620, ry + 28, item.new_, 14, C.success, "middle");
    s += text(690, ry + 22, item.newSub, 11, C.textSecondary);
  });

  // Financial summary
  s += card(20, 500 - 10, w - 40, 20);

  s += svgClose();
  return s;
}

// 5. Generic ERP vs Custom IS
function genErpVsCustom() {
  const w = 860,
    h = 400;
  let s = svgOpen(w, h);

  s += title(20, 15, "Genericke ERP vs. Vlastni IS na miru", w - 40);

  // LEFT: Generic ERP
  s += card(30, 70, 380, 310);
  s += rect(30, 70, 380, 40, C.dangerLight, 12);
  s += boldText(220, 95, "Genericke ERP", 14, C.danger, "middle");

  const erpModules = ["CRM", "DMS", "HR", "Sklad", "Eshop"];
  erpModules.forEach((m, i) => {
    const mx = 55 + i * 70;
    s += rect(
      mx,
      125,
      60,
      35,
      C.dangerLight,
      6,
      `stroke="${C.danger}" stroke-width="1" stroke-dasharray="4,2"`,
    );
    s += text(mx + 30, 147, m, 11, C.danger, "middle");
  });

  s += text(220, 185, "+ rozsahle customizace", 12, C.textSecondary, "middle");
  s += text(220, 205, "+ dalsi customizace", 12, C.textSecondary, "middle");
  s += text(
    220,
    225,
    "= drahe a krehke reseni",
    12,
    C.danger,
    "middle",
    'font-weight="500"',
  );

  s += line(50, 245, 390, 245, C.border, 1, true);

  // Stats for ERP
  s += rect(60, 260, 140, 50, C.dangerLight, 8);
  s += boldText(130, 280, "Vyuzijete 30%", 12, C.danger, "middle");
  s += text(130, 298, "funkci", 11, C.textSecondary, "middle");
  s += rect(230, 260, 160, 50, C.dangerLight, 8);
  s += boldText(310, 280, "Platite za 100%", 12, C.danger, "middle");
  s += text(310, 298, "licenci", 11, C.textSecondary, "middle");

  s += rect(60, 325, 330, 35, C.danger + "15", 8);
  s += boldText(
    220,
    348,
    "Vyssi TCO (3 roky) kvuli licencim",
    12,
    C.danger,
    "middle",
  );

  // RIGHT: Custom IS
  s += card(450, 70, 380, 310);
  s += rect(450, 70, 380, 40, C.successLight, 12);
  s += boldText(640, 95, "Vlastni IS na miru", 14, C.success, "middle");

  const customModules = [
    { label: "Spis skody", color: C.primary },
    { label: "SLA engine", color: C.danger },
    { label: "Exp. zprava", color: C.purple },
    { label: "Reporting", color: C.teal },
    { label: "Fakturace", color: C.orange },
  ];
  customModules.forEach((m, i) => {
    const mx = 475 + i * 70;
    s += rect(
      mx,
      125,
      60,
      35,
      m.color + "20",
      6,
      `stroke="${m.color}" stroke-width="1.5"`,
    );
    s += text(
      mx + 30,
      147,
      m.label,
      10,
      m.color,
      "middle",
      'font-weight="500"',
    );
  });

  s += text(
    640,
    185,
    "Presny fit pro likvidaci skod",
    12,
    C.success,
    "middle",
    'font-weight="500"',
  );
  s += text(640, 205, "Zadne zbytecne moduly", 12, C.textSecondary, "middle");
  s += text(
    640,
    225,
    "Plna kontrola nad kodem",
    12,
    C.success,
    "middle",
    'font-weight="500"',
  );

  s += line(470, 245, 810, 245, C.border, 1, true);

  // Stats for Custom
  s += rect(480, 260, 140, 50, C.successLight, 8);
  s += boldText(550, 280, "Vyuzijete 100%", 12, C.success, "middle");
  s += text(550, 298, "funkci", 11, C.textSecondary, "middle");
  s += rect(650, 260, 160, 50, C.successLight, 8);
  s += boldText(730, 280, "Platite za 100%", 12, C.success, "middle");
  s += text(730, 298, "pouzitelneho", 11, C.textSecondary, "middle");

  s += rect(480, 325, 330, 35, C.success + "15", 8);
  s += boldText(
    640,
    348,
    "Nizsi TCO - jedna investice + provoz",
    12,
    C.success,
    "middle",
  );

  s += svgClose();
  return s;
}

// 6. Summary - added value
function genValueSummary() {
  const w = 780,
    h = 420;
  let s = svgOpen(w, h);

  s += title(20, 15, "Pridana hodnota noveho IS", w - 40);

  const items = [
    {
      text: "Uspora ~1 170 000 Kc rocne na manualni praci",
      color: C.success,
      icon: "Kc",
    },
    { text: "Eliminace rizik z prekroceni SLA", color: C.danger, icon: "!" },
    {
      text: "Zvyseni kvality expertních zprav (sablony + revize)",
      color: C.purple,
      icon: "Q",
    },
    {
      text: "Plna mobilní podpora pro terénní experty",
      color: C.warning,
      icon: "M",
    },
    { text: "Automaticke reporty pro pojistovny", color: C.teal, icon: "R" },
    {
      text: "Centralni misto pravdy - zadne roztristene informace",
      color: C.primary,
      icon: "C",
    },
    {
      text: "Skalovatelnost pro rust firmy (CZ + SK)",
      color: C.orange,
      icon: "S",
    },
    {
      text: "Plna kontrola nad systemem - zadny vendor lock-in",
      color: C.success,
      icon: "V",
    },
    {
      text: "Soulad s ceskou legislativou (OZ, zakon o pojistovnictvi)",
      color: C.primary,
      icon: "§",
    },
  ];

  items.forEach((item, i) => {
    const ry = 70 + i * 38;
    s += card(30, ry, w - 60, 34);
    s += iconCircle(56, ry + 17, 12, item.color, item.icon, 9);
    s += text(78, ry + 22, item.text, 13, C.text);
    s += iconCircle(w - 56, ry + 17, 10, C.success, "✓", 10);
  });

  s += svgClose();
  return s;
}

// ════════════════════════════════════════════════════════════════
// TECHNICAL ANALYSIS DIAGRAMS
// ════════════════════════════════════════════════════════════════

// 7. Technology stack
function genTechStack() {
  const w = 780,
    h = 520;
  let s = svgOpen(w, h);

  s += title(20, 15, "Technologicky stack", w - 40);

  // Layer 1: Clients
  s += card(40, 65, w - 80, 130);
  s += rect(40, 65, w - 80, 36, C.primaryLight, 12);
  s += boldText(w / 2, 88, "KLIENTI", 13, C.primary, "middle");

  const clients = [
    { icon: "PC", label: "Desktop", sub: "Chrome, Edge, Firefox", x: 100 },
    { icon: "T", label: "Tablet", sub: "iPad, Android", x: 320 },
    { icon: "M", label: "Mobil", sub: "iPhone, Android", x: 540 },
  ];
  clients.forEach((c) => {
    s += iconCircle(c.x, 125, 16, C.primary, c.icon, 11);
    s += boldText(c.x + 25, 122, c.label, 13, C.text);
    s += text(c.x + 25, 140, c.sub, 11, C.textSecondary);
  });

  s += rect(120, 160, w - 240, 24, C.primaryLight, 6);
  s += text(
    w / 2,
    177,
    "Responsivni webova aplikace — TypeScript + React",
    11,
    C.primary,
    "middle",
    'font-weight="500"',
  );

  // Arrow down
  s += arrow(w / 2, 195, w / 2, 215);
  s += text(w / 2 + 10, 210, "HTTPS", 10, C.textSecondary);

  // Layer 2: Backend
  s += card(40, 220, w - 80, 90);
  s += rect(40, 220, w - 80, 36, C.warningLight, 12);
  s += boldText(w / 2, 243, "BACKEND", 13, C.warning, "middle");
  const backendItems = [
    "Node.js + TypeScript",
    "REST API",
    "Autentizace (JWT)",
  ];
  backendItems.forEach((b, i) => {
    const bx = 120 + i * 210;
    s += rect(bx, 268, 180, 28, C.warningLight, 6);
    s += text(bx + 90, 287, b, 11, C.warning, "middle", 'font-weight="500"');
  });

  // Arrow down
  s += arrow(w / 2, 310, w / 2, 330);

  // Layer 3: Database
  s += card(40, 335, w - 80, 65);
  s += rect(40, 335, w - 80, 36, C.purpleLight, 12);
  s += boldText(w / 2, 358, "DATABAZE", 13, C.purple, "middle");
  s += rect(200, 375, 180, 18, C.purpleLight, 4);
  s += text(
    290,
    389,
    "PostgreSQL",
    11,
    C.purple,
    "middle",
    'font-weight="500"',
  );
  s += rect(400, 375, 180, 18, C.purpleLight, 4);
  s += text(
    490,
    389,
    "Relacni databaze",
    11,
    C.purple,
    "middle",
    'font-weight="500"',
  );

  // Arrow down
  s += arrow(w / 2, 400, w / 2, 420);

  // Layer 4: Hosting
  s += card(40, 425, w - 80, 75);
  s += rect(40, 425, w - 80, 36, C.successLight, 12);
  s += boldText(w / 2, 448, "HOSTING", 13, C.success, "middle");

  s += rect(150, 468, 250, 22, C.successLight, 6);
  s += text(
    275,
    483,
    "Google Cloud Platform (GCP)",
    11,
    C.success,
    "middle",
    'font-weight="500"',
  );
  s += rect(420, 468, 210, 22, C.successLight, 6);
  s += text(
    525,
    483,
    "Podpora: Techfides s.r.o.",
    11,
    C.success,
    "middle",
    'font-weight="500"',
  );

  s += svgClose();
  return s;
}

// 8. Responsive design / device support
function genResponsiveDesign() {
  const w = 860,
    h = 420;
  let s = svgOpen(w, h);

  s += title(20, 15, "Podpora zarizeni — Responsivni design", w - 40);

  // Desktop
  s += card(30, 70, 260, 220);
  s += rect(30, 70, 260, 36, C.primaryLight, 12);
  s += boldText(160, 93, "DESKTOP (> 1024px)", 12, C.primary, "middle");

  // Desktop wireframe mini
  s += rect(50, 120, 60, 150, "#1E293B", 4);
  s += text(80, 140, "Menu", 9, "#CBD5E1", "middle");
  s += text(80, 160, "Nav", 9, "#CBD5E1", "middle");
  s += rect(
    115,
    120,
    155,
    150,
    C.white,
    4,
    `stroke="${C.border}" stroke-width="1"`,
  );
  s += text(192, 145, "Obsah", 11, C.text, "middle");
  s += rect(125, 155, 135, 15, C.primaryLight, 3);
  s += text(192, 166, "Tabulky", 9, C.primary, "middle");
  s += rect(125, 175, 135, 15, C.primaryLight, 3);
  s += text(192, 186, "Dashboardy", 9, C.primary, "middle");
  s += rect(125, 195, 135, 15, C.primaryLight, 3);
  s += text(192, 206, "Kompletni UI", 9, C.primary, "middle");

  // Tablet
  s += card(310, 70, 220, 220);
  s += rect(310, 70, 220, 36, C.warningLight, 12);
  s += boldText(420, 93, "TABLET (768-1024px)", 12, C.warning, "middle");

  // Tablet wireframe mini
  s += rect(
    340,
    120,
    160,
    150,
    C.white,
    4,
    `stroke="${C.border}" stroke-width="1"`,
  );
  s += rect(340, 120, 30, 150, "#1E293B", 4);
  s += text(355, 140, "☰", 12, "#CBD5E1", "middle");
  s += text(440, 145, "Obsah", 11, C.text, "middle");
  s += rect(380, 155, 110, 15, C.warningLight, 3);
  s += text(435, 166, "Karty", 9, C.warning, "middle");
  s += rect(380, 175, 110, 15, C.warningLight, 3);
  s += text(435, 186, "Zjednodusene", 9, C.warning, "middle");
  s += rect(380, 195, 110, 15, C.warningLight, 3);
  s += text(435, 206, "tabulky", 9, C.warning, "middle");

  // Mobile
  s += card(550, 70, 280, 220);
  s += rect(550, 70, 280, 36, C.successLight, 12);
  s += boldText(690, 93, "MOBIL (< 768px)", 12, C.success, "middle");

  // Mobile wireframe mini
  s += rect(
    625,
    120,
    110,
    150,
    C.white,
    8,
    `stroke="${C.border}" stroke-width="1"`,
  );
  s += rect(625, 120, 110, 25, "#1E293B", 8);
  s += text(640, 136, "☰", 10, "#CBD5E1");
  s += text(680, 137, "LAPA IS", 10, "#CBD5E1", "middle");
  s += rect(635, 152, 90, 30, C.successLight, 4);
  s += text(680, 171, "Karta pripadu", 9, C.success, "middle");
  s += text(680, 198, "Rychle akce:", 9, C.textSecondary, "middle");
  const mobileActions = ["📷", "📝", "⏱"];
  mobileActions.forEach((a, i) => {
    s += rect(640 + i * 28, 205, 24, 24, C.successLight, 4);
    s += text(652 + i * 28, 222, a, 12, C.text, "middle");
  });
  s += rect(635, 240, 90, 20, "#1E293B", 4);
  s += text(680, 254, "Navigace", 8, "#CBD5E1", "middle");

  // Key mobile functions
  s += card(30, 310, w - 60, 90);
  s += rect(30, 310, w - 60, 32, C.primaryLight, 12);
  s += boldText(
    w / 2,
    332,
    "Klicove funkce na mobilnim zarizeni",
    12,
    C.primary,
    "middle",
  );

  const mobileFuncs = [
    "Prehled pripadu",
    "Detail pripadu",
    "Fotodokumentace",
    "Poznamky",
    "Evidence casu",
    "Dokumenty",
  ];
  mobileFuncs.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const fx = 60 + col * 270;
    const fy = 356 + row * 24;
    s += iconCircle(fx, fy, 7, C.primary, "✓", 8);
    s += text(fx + 14, fy + 4, f, 12, C.text);
  });

  s += svgClose();
  return s;
}

// 9. Backup strategy
function genBackupStrategy() {
  const w = 780,
    h = 440;
  let s = svgOpen(w, h);

  s += title(20, 15, "Strategie zalohovani a dostupnosti", w - 40);

  // Database section
  s += card(30, 65, w - 60, 110);
  s += rect(30, 65, w - 60, 36, C.primaryLight, 12);
  s += iconCircle(55, 83, 12, C.primary, "DB", 8);
  s += boldText(75, 88, "Databaze (Cloud SQL)", 13, C.primary);

  const dbItems = [
    { label: "Automaticke denni zalohy", icon: "●" },
    { label: "Point-in-time recovery (PITR)", icon: "●" },
    { label: "Retence 30 dnu", icon: "●" },
    { label: "Cross-region replika (volitelne)", icon: "○" },
  ];
  dbItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = 60 + col * 350;
    const iy = 115 + row * 24;
    s += text(
      ix,
      iy,
      item.icon,
      8,
      item.icon === "●" ? C.success : C.textMuted,
    );
    s += text(ix + 14, iy, item.label, 12, C.text);
  });

  // Storage section
  s += card(30, 190, w - 60, 100);
  s += rect(30, 190, w - 60, 36, C.successLight, 12);
  s += iconCircle(55, 208, 12, C.success, "S", 10);
  s += boldText(75, 213, "Dokumenty (Cloud Storage)", 13, C.success);

  const storageItems = [
    { label: "Automaticka redundance (multi-zone)", icon: "●" },
    { label: "Verzovani objektu", icon: "●" },
    { label: "Lifecycle policies pro archivaci", icon: "●" },
  ];
  storageItems.forEach((item, i) => {
    const ix = 60 + (i % 2) * 350;
    const iy = 240 + Math.floor(i / 2) * 24;
    s += text(ix, iy, "●", 8, C.success);
    s += text(ix + 14, iy, item.label, 12, C.text);
  });

  // Application section
  s += card(30, 305, w - 60, 115);
  s += rect(30, 305, w - 60, 36, C.warningLight, 12);
  s += iconCircle(55, 323, 12, C.warning, "A", 10);
  s += boldText(75, 328, "Aplikace (Cloud Run)", 13, C.warning);

  const appItems = [
    { label: "Automaticke skalovani", icon: "●" },
    { label: "Health checks", icon: "●" },
    { label: "Zero-downtime deployment", icon: "●" },
    { label: "Rollback moznost", icon: "●" },
  ];
  appItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = 60 + col * 350;
    const iy = 355 + row * 24;
    s += text(ix, iy, "●", 8, C.warning);
    s += text(ix + 14, iy, item.label, 12, C.text);
  });

  s += svgClose();
  return s;
}

// ════════════════════════════════════════════════════════════════
// GENERATE ALL
// ════════════════════════════════════════════════════════════════
const diagrams = [
  // Business analysis
  ["ba-current-state.svg", genCurrentState],
  ["ba-legal-deadlines.svg", genLegalDeadlines],
  ["ba-target-state.svg", genTargetState],
  ["ba-comparison.svg", genComparison],
  ["ba-erp-vs-custom.svg", genErpVsCustom],
  ["ba-value-summary.svg", genValueSummary],
  // Technical analysis
  ["ta-tech-stack.svg", genTechStack],
  ["ta-responsive-design.svg", genResponsiveDesign],
  ["ta-backup-strategy.svg", genBackupStrategy],
];

diagrams.forEach(([name, gen]) => {
  const svg = gen();
  fs.writeFileSync(path.join(OUT, name), svg, "utf-8");
  console.log(`✓ ${name}`);
});

console.log(`\nGenerated ${diagrams.length} diagrams to ${OUT}`);
