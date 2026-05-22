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

function formatDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number")
    return String(value);
  const raw = String(value).trim();

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(raw);
  if (dateOnly) {
    const [year, month, day] = raw.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    return DATE_FORMAT.format(new Date(year, month - 1, day));
  }

  const localDatetime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.exec(raw);
  if (localDatetime) {
    const normalized = raw.replace(" ", "T");
    const [datePart, timePart] = normalized.split("T") as [string, string];
    const [year, month, day] = datePart.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const [hour, minute] = timePart.split(":").map(Number) as [number, number];
    return DATETIME_FORMAT.format(new Date(year, month - 1, day, hour, minute));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return DATETIME_FORMAT.format(parsed);
  }

  return raw;
}

// Skip DocMeta on pages that have a BrandHero (homepage-style pages).
const isHeroPage = !!frontmatter.value?.hero;
</script>

<template>
  <div
    v-if="isMounted && !isHeroPage && (frontmatter.status || frontmatter.updated_at)"
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
    <span class="doc-meta__author">
      <svg
        class="doc-meta__check"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
      Created by Techfides
    </span>
  </div>
</template>

<style scoped>
.doc-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  font-size: 13px;
  flex-wrap: wrap;
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

.doc-meta__author {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #0074c8;
  font-weight: 500;
}

.doc-meta__check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
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

.dark .doc-meta__author {
  color: #00a0e3;
}
</style>
