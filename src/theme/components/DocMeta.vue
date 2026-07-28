<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import IconCheck from "../icons/IconCheck.vue";

const { frontmatter, lang } = useData();
const { t, te } = useI18n();

function statusLabel(status: string): string {
  const key = `docMeta.status.${status}`;
  return te(key) ? t(key) : status;
}

// Format in UTC and build dates with Date.UTC so server and client render the
// same string: authored wall-clock values show verbatim, with no timezone shift
// and no hydration mismatch.
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(lang.value, {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
);

const dateTimeFormat = computed(
  () =>
    new Intl.DateTimeFormat(lang.value, {
      timeZone: "UTC",
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
    return dateFormat.value.format(new Date(Date.UTC(year, month - 1, day)));
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
      new Date(Date.UTC(year, month - 1, day, hour, minute)),
    );
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return dateTimeFormat.value.format(parsed);
  }

  return raw;
}

const authorLabel = computed(() =>
  te("docMeta.author") ? t("docMeta.author") : "",
);

const isHeroPage = computed(() => !!frontmatter.value?.hero);
const visible = computed(
  () =>
    !isHeroPage.value &&
    (frontmatter.value?.status || frontmatter.value?.updated_at),
);
</script>

<template>
  <div v-if="visible" class="doc-meta">
    <span
      v-if="frontmatter.status"
      class="doc-status-badge"
      :data-status="frontmatter.status"
    >
      {{ statusLabel(frontmatter.status) }}
    </span>
    <span v-if="frontmatter.updated_at" class="doc-meta__date">
      {{ t("docMeta.updated") }}: {{ formatDate(frontmatter.updated_at) }}
    </span>
    <span v-if="authorLabel" class="doc-meta__author">
      <IconCheck class="doc-meta__check" />
      {{ authorLabel }}
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

.dark .doc-meta__author {
  color: var(--brand-secondary);
}
</style>
