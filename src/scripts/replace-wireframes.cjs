/**
 * Replaces ASCII wireframe code blocks in <cwd>/docs/v1/index.md with SVG image
 * references. Handles both ```text and bare ``` fences.
 */
const fs = require("fs");
const path = require("path");

const docPath = path.join(process.cwd(), "docs", "v1", "index.md");
let content = fs.readFileSync(docPath, "utf-8");
// Normalize line endings to \n for matching, restore at end
const hadCRLF = content.includes("\r\n");
if (hadCRLF) content = content.replace(/\r\n/g, "\n");

// [labelPrefix (up to and including ```), endSection identifier, svg filename, alt text]
const wireframes = [
  [
    "**Wireframe:**\n\n```",
    "UC-02",
    "wf-case-new.svg",
    "Wireframe: Formulář nového případu",
  ],
  [
    "**Wireframe:**\n\n```",
    "UC-03",
    "wf-assign-solver.svg",
    "Wireframe: Přiřazení řešitele",
  ],
  [
    "**Wireframe (mobilni zarizeni):**\n\n```",
    "UC-07",
    "wf-field-work.svg",
    "Wireframe: Terénní práce (mobilní zařízení)",
  ],
  [
    '**Wireframe (po kliknuti na "Pridat fotografii"):**\n\n```',
    "UC-08",
    "wf-photo-doc.svg",
    "Wireframe: Fotodokumentace",
  ],
  [
    "**Wireframe - Dokumenty spisu:**\n\n```",
    "UC-10",
    "wf-documents.svg",
    "Wireframe: Dokumenty spisu",
  ],
  [
    "**Wireframe - Expertni zprava:**\n\n```",
    "UC-11",
    "wf-expert-report.svg",
    "Wireframe: Editor expertní zprávy",
  ],
  [
    "**Wireframe - Revize zpravy:**\n\n```",
    "UC-13",
    "wf-review.svg",
    "Wireframe: Revize zprávy",
  ],
  [
    "**Wireframe - SLA prehled (dashboard):**\n\n```",
    "UC-15",
    "wf-sla-overview.svg",
    "Wireframe: SLA přehled",
  ],
  [
    "**Pravidla eskalace:**\n\n```",
    "UC-16",
    "wf-escalation.svg",
    "Wireframe: Eskalační matice",
  ],
  [
    "**Wireframe - Evidence vykonu:**\n\n```",
    "UC-17",
    "wf-time-tracking.svg",
    "Wireframe: Evidence výkonů a času",
  ],
  [
    "**Wireframe - Evidence cest:**\n\n```",
    "UC-18",
    "wf-travel.svg",
    "Wireframe: Evidence cest a km",
  ],
  [
    "**Wireframe - Fakturacni podklady:**\n\n```",
    "UC-19",
    "wf-billing.svg",
    "Wireframe: Fakturační podklady",
  ],
  [
    "**Wireframe - Dashboard (Team Leader):**\n\n```",
    "**Wireframe - Dashboard (Management):**",
    "wf-dashboard-tl.svg",
    "Wireframe: Dashboard Team Leader",
  ],
  [
    "**Wireframe - Dashboard (Management):**\n\n```",
    "UC-20",
    "wf-dashboard-mgmt.svg",
    "Wireframe: Dashboard Management",
  ],
  [
    "**Wireframe - Komunikace:**\n\n```",
    "UC-23",
    "wf-communication.svg",
    "Wireframe: Evidence komunikace",
  ],
  [
    "**Wireframe - Vyber sablony emailu:**\n\n```",
    "UC-24",
    "wf-email-template.svg",
    "Wireframe: Výběr šablony emailu",
  ],
  [
    "**Wireframe - Prihlaseni:**\n\n```",
    "UC-25",
    "wf-login.svg",
    "Wireframe: Přihlášení do systému",
  ],
  [
    "## 5. Wireframe - Seznam pripadu (hlavni obrazovka)\n\n```",
    "## 6.",
    "wf-cases-list.svg",
    "Wireframe: Seznam případů",
  ],
  [
    "## 6. Wireframe - Detail pripadu (hlavni obrazovka)\n\n```",
    "## 7.",
    "wf-case-detail.svg",
    "Wireframe: Detail případu",
  ],
];

let replacedCount = 0;

for (const [labelPrefix, _endSection, svg, alt] of wireframes) {
  const labelIdx = content.indexOf(labelPrefix);
  if (labelIdx === -1) {
    console.log(`⚠ Could not find label for ${svg}`);
    continue;
  }

  // labelPrefix ends with the opening ```, so back up three characters.
  const fenceStartIdx = labelIdx + labelPrefix.length - 3;

  let searchFrom = fenceStartIdx + 3;
  // Skip the rest of the opening fence line, which may read ```text or ```.
  const newlineAfterOpen = content.indexOf("\n", searchFrom);
  if (newlineAfterOpen === -1) {
    console.log(`⚠ No newline after opening fence for ${svg}`);
    continue;
  }
  searchFrom = newlineAfterOpen + 1;

  let closingFenceIdx = -1;
  while (true) {
    const idx = content.indexOf("\n```", searchFrom);
    if (idx === -1) break;
    const afterFence = idx + 4;
    if (
      afterFence >= content.length ||
      content[afterFence] === "\n" ||
      content[afterFence] === "\r"
    ) {
      closingFenceIdx = idx + 1;
      break;
    }
    searchFrom = afterFence;
  }

  if (closingFenceIdx === -1) {
    console.log(`⚠ Could not find closing fence for ${svg}`);
    continue;
  }

  const blockEnd = closingFenceIdx + 3;
  const imgTag = `![${alt}](/images/wireframes/${svg})`;
  content =
    content.substring(0, fenceStartIdx) + imgTag + content.substring(blockEnd);
  replacedCount++;
  console.log(`✓ Replaced ${svg}`);
}

// Add navigation wireframe before section 5
const navInsertPoint = content.indexOf("## 5. Wireframe - Seznam pripadu");
if (navInsertPoint !== -1) {
  const navImg =
    "\n### Wireframe navigačního menu\n\n![Wireframe: Navigační menu](/images/wireframes/wf-navigation.svg)\n\n---\n\n";
  content =
    content.substring(0, navInsertPoint) +
    navImg +
    content.substring(navInsertPoint);
  console.log("✓ Added navigation wireframe");
}

if (hadCRLF) content = content.replace(/\n/g, "\r\n");
fs.writeFileSync(docPath, content, "utf-8");
console.log(`\nDone: replaced ${replacedCount} wireframes`);
