<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import IconCheck from "../icons/IconCheck.vue";
import { useStrings } from "../composables/useStrings.js";

const { frontmatter } = useData();
const strings = useStrings();

const statusLabels = computed<Record<string, string>>(() => ({
  published: strings.value.statusPublished,
  draft: strings.value.statusDraft,
  review: strings.value.statusReview,
  archived: strings.value.statusArchived,
}));

const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(strings.value.dateLocale, {
      timeZone: "Europe/Prague",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
);

const dateTimeFormat = computed(
  () =>
    new Intl.DateTimeFormat(strings.value.dateLocale, {
      timeZone: "Europe/Prague",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
);

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
    return dateFormat.value.format(new Date(year, month - 1, day));
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
    return dateTimeFormat.value.format(
      new Date(year, month - 1, day, hour, minute),
    );
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return dateTimeFormat.value.format(parsed);
  }

  return raw;
}

const isHeroPage = computed(() => !!frontmatter.value?.hero);
const visible = computed(
  () =>
    !isHeroPage.value &&
    (frontmatter.value?.status || frontmatter.value?.updated_at),
);
</script>

<template>
  <ClientOnly>
    <div v-if="visible" class="doc-meta">
      <span
        v-if="frontmatter.status"
        class="doc-meta__badge"
        :data-status="frontmatter.status"
      >
        {{ statusLabels[frontmatter.status] ?? frontmatter.status }}
      </span>
      <span v-if="frontmatter.updated_at" class="doc-meta__date">
        {{ strings.updatedLabel }}: {{ formatDate(frontmatter.updated_at) }}
      </span>
      <span v-if="strings.authorLabel" class="doc-meta__author">
        <IconCheck class="doc-meta__check" />
        {{ strings.authorLabel }}
      </span>
    </div>
  </ClientOnly>
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
  border-radius: 0;
  font-weight: 700;
  letter-spacing: 0;
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
  color: var(--brand-primary);
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
  color: var(--brand-secondary);
}
</style>
