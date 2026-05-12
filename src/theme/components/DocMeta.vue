<script setup lang="ts">
import { useData } from "vitepress";
import { onMounted, ref } from "vue";

const { frontmatter } = useData();
const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

const STATUS_LABEL: Record<string, string> = {
  published: "Publikováno",
  draft: "Koncept",
  review: "K revizi",
  archived: "Archivováno",
};

const DATE_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Parse and format a frontmatter date/datetime value.
 *
 * Accepts:
 *   "2026-04-02"           → date only   → "2. dubna 2026"
 *   "2026-04-02 16:13"     → datetime    → "2. dubna 2026 v 16:13"
 *   "2026-04-02T16:13:00Z" → ISO 8601    → "2. dubna 2026 v 18:13"  (UTC→Prague)
 *
 * Date-only strings are treated as Prague local midnight to avoid
 * UTC parsing shifting the date by one day.
 */
function formatDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number")
    return String(value);
  const raw = String(value).trim();

  // Date-only: YYYY-MM-DD — parse as Prague local date to avoid UTC shift.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(raw);
  if (dateOnly) {
    const [year, month, day] = raw.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    // new Date(y, m, d) creates a local-time Date — DST is irrelevant for date-only display.
    return DATE_FORMAT.format(new Date(year, month - 1, day));
  }

  // Datetime without timezone ("2026-04-02 16:13" or "2026-04-02 16:13:00"):
  // Treat as Prague local time by replacing space with T and appending no Z.
  const localDatetime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.exec(raw);
  if (localDatetime) {
    const normalized = raw.replace(" ", "T");
    // Parse as local time; Intl will re-express it in Europe/Prague.
    const [datePart, timePart] = normalized.split("T") as [string, string];
    const [year, month, day] = datePart.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const [hour, minute] = timePart.split(":").map(Number) as [number, number];
    return DATETIME_FORMAT.format(new Date(year, month - 1, day, hour, minute));
  }

  // ISO 8601 with explicit offset or Z — parse directly, Intl converts to Prague.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return DATETIME_FORMAT.format(parsed);
  }

  return raw;
}
</script>

<template>
  <div
    v-if="isMounted && (frontmatter.status || frontmatter.updated_at)"
    class="doc-meta"
  >
    <span
      v-if="frontmatter.status"
      class="doc-meta__badge"
      :data-status="frontmatter.status"
    >
      {{ STATUS_LABEL[frontmatter.status] ?? frontmatter.status }}
    </span>
    <span v-if="frontmatter.updated_at" class="doc-meta__date">
      Aktualizováno: {{ formatDate(frontmatter.updated_at) }}
    </span>
  </div>
</template>

<style scoped>
.doc-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  font-size: 13px;
}

.doc-meta__badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.doc-meta__badge[data-status="published"] {
  background: #d1fae5;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.doc-meta__badge[data-status="draft"] {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.doc-meta__badge[data-status="review"] {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.doc-meta__badge[data-status="archived"] {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.doc-meta__date {
  color: var(--vp-c-text-2);
}

.dark .doc-meta__badge[data-status="published"] {
  background: #052e16;
  color: #4ade80;
  border-color: #166534;
}

.dark .doc-meta__badge[data-status="draft"] {
  background: #2d1a00;
  color: #fbbf24;
  border-color: #92400e;
}

.dark .doc-meta__badge[data-status="review"] {
  background: #0f1e40;
  color: #60a5fa;
  border-color: #1e40af;
}

.dark .doc-meta__badge[data-status="archived"] {
  background: #1f2937;
  color: #9ca3af;
  border-color: #374151;
}
</style>
