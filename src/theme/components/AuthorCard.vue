<script setup lang="ts">
import { withBase } from "vitepress";

withDefaults(
  defineProps<{
    /** The person's name. */
    name: string;
    /** What they do, shown under the name. Omit to drop the line. */
    role?: string;
    /** Portrait, resolved against the site base. Omit to drop the frame. */
    avatar?: string;
    /**
     * Only set this when the portrait carries information the name does not. Left empty by
     * default: the name sits beside it in text, so a screen reader announcing the photo
     * again would just repeat it.
     */
    alt?: string;
  }>(),
  { alt: "" },
);
</script>

<template>
  <aside class="author-card">
    <img
      v-if="avatar"
      class="author-card__portrait"
      :src="withBase(avatar)"
      :alt="alt"
      loading="lazy"
      decoding="async"
    />
    <div class="author-card__body">
      <p class="author-card__name">{{ name }}</p>
      <p v-if="role" class="author-card__role">{{ role }}</p>
      <div class="author-card__detail"><slot /></div>
    </div>
  </aside>
</template>

<style scoped>
/*
 * Who stands behind the document. A byline with evidence: the name and role carry the
 * claim, the slot carries what backs it up.
 *
 * Glass on the backdrop, like the feature cards and the spotlight. No bloom and no
 * hairline here: this is a credential, not a call to action, and it should read as the
 * quietest of the three panels.
 */
.author-card {
  display: flex;
  align-items: flex-start;
  gap: var(--tf-spacing-6);
  margin-block: var(--tf-spacing-7);
  padding: var(--tf-spacing-7);
  border: 1px solid var(--tf-color-line);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: blur(var(--tf-blur-panel)) saturate(var(--tf-glass-saturate));
  box-shadow: var(--tf-shadow-1);
}

.author-card__portrait {
  flex: none;
  width: var(--tf-size-4xl);
  height: var(--tf-size-4xl);
  border-radius: var(--tf-radius-pill);
  object-fit: cover;
  /* A ring rather than a border: a border would shrink the image inside the circle and
     leave the crop off-centre. */
  box-shadow: 0 0 0 1px
    color-mix(in oklab, var(--tf-color-accent) 30%, var(--tf-color-line-hi));
}

.author-card__body {
  min-width: 0;
}

.author-card__name {
  margin: 0;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  color: var(--tf-color-fg);
}

/* Its own line rather than trailing the name behind a separator: a role runs long in
   Czech, and any glyph between the two has to survive both languages. */
.author-card__role {
  margin: var(--tf-spacing-1) 0 0;
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
  color: var(--tf-color-muted);
}

.author-card__detail {
  margin-top: var(--tf-spacing-4);
  font-size: var(--tf-text-body-sm);
  color: var(--tf-color-muted);
}

/* The slot holds Markdown, which arrives with the reading column's own block spacing. */
.author-card__detail :deep(> :first-child) {
  margin-top: 0;
}

.author-card__detail :deep(> :last-child) {
  margin-bottom: 0;
}

.author-card__detail :deep(ul),
.author-card__detail :deep(ol) {
  padding-left: var(--tf-spacing-5);
}

@media (max-width: 560px) {
  .author-card {
    flex-direction: column;
    gap: var(--tf-spacing-4);
  }
}
</style>
