<script setup lang="ts">
import { useData } from "vitepress";
// @ts-expect-error VitePress virtual module
import { Content } from "vitepress/dist/client/app/components/Content.js";

const { site } = useData();
</script>

<template>
  <div class="print-layout">
    <header class="print-header">
      <div class="print-header__title">{{ site.title }}</div>
    </header>
    <main class="print-content">
      <Content />
    </main>
  </div>
</template>

<style>
.print-layout *,
.print-layout *::before,
.print-layout *::after {
  box-sizing: border-box;
}

.print-layout {
  font-family: "Inter", "Noto Color Emoji", "Helvetica Neue", Arial, sans-serif;
  font-size: 9pt;
  line-height: 1.35;
  color: #1a1a1a;
  background: #fff;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1.25rem 1.5rem;
}

.print-header {
  padding: 0.75rem 0 0.55rem;
  border-bottom: 1.5px solid #1a1a1a;
  margin-bottom: 1.1rem;
}

.print-header__title {
  font-size: 7.5pt;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #666;
}

.print-layout h1 {
  font-size: 18pt;
  font-weight: 700;
  line-height: 1.15;
  margin: 1.1rem 0 0.3rem;
  color: #111;
}

.print-layout h2 {
  font-size: 12pt;
  font-weight: 600;
  margin: 1rem 0 0.3rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid #ddd;
  color: #222;
}

.print-layout h3 {
  font-size: 9.5pt;
  font-weight: 600;
  margin: 0.7rem 0 0.2rem;
  color: #333;
}

.print-layout h4 {
  font-size: 9pt;
  font-weight: 600;
  margin: 0.5rem 0 0.1rem;
  color: #444;
}

.print-layout p {
  margin: 0 0 0.4rem;
}

.print-layout code {
  font-family:
    "JetBrains Mono", "Fira Code", "Courier New", "Noto Color Emoji", monospace;
  font-size: 7.5pt;
  background: #f3f3f3;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  padding: 0.05em 0.25em;
}

.print-layout pre {
  background: #f6f8fa;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 0.45rem 0.75rem;
  overflow-x: auto;
  margin: 0.4rem 0;
  font-size: 7.5pt;
  line-height: 1.4;
}

.print-layout pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
}

.print-layout table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.45rem 0;
  font-size: 8pt;
}

.print-layout th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: left;
  padding: 0.2rem 0.5rem;
  border: 1px solid #ccc;
}

.print-layout td {
  padding: 0.15rem 0.5rem;
  border: 1px solid #ddd;
  vertical-align: top;
}

.print-layout tr:nth-child(even) td {
  background: #fafafa;
}

.print-layout ul,
.print-layout ol {
  padding-left: 1.1rem;
  margin: 0.15rem 0 0.4rem;
}

.print-layout li {
  margin-bottom: 0.05rem;
}

.print-layout blockquote {
  margin: 0.4rem 0;
  padding: 0.2rem 0.65rem;
  border-left: 2px solid #bbb;
  color: #555;
  font-style: italic;
}

.print-layout a {
  color: #1a56db;
  text-decoration: none;
}

.print-layout hr {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 0.75rem 0;
}

/* Both properties: Playwright renders on screen, real printing uses @media print. */
.print-layout .page-break {
  break-after: page;
  page-break-after: always;
  height: 0;
  margin: 0;
}

/* Page-break anchors. */
.print-layout a[id] {
  display: block;
}

.print-layout h1,
.print-layout h2,
.print-layout h3 {
  break-after: avoid;
  page-break-after: avoid;
}

.print-layout pre,
.print-layout table {
  break-inside: avoid;
  page-break-inside: avoid;
}

@media print {
  .print-layout {
    max-width: 100%;
    padding: 0;
  }

  .print-header {
    padding: 0 0 0.4rem;
    margin-bottom: 0.75rem;
  }
}
</style>
