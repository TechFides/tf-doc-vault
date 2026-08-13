<script setup lang="ts">
import { withBase } from "vitepress";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** Client logo, resolved against the site base. Omit to drop the row. */
    logo?: string;
    /** The client's name. Used as the logo's alternative text. */
    client?: string;
    /** What was delivered. Omit to drop the row. */
    title?: string;
    /** Who vouches for it. Omit to drop the whole footer. */
    contact?: string;
    /** Their role, and anything else worth a quiet line under the name. */
    contactRole?: string;
    /** Their photo. Without one the footer falls back to their initials. */
    contactAvatar?: string;
    /** Override the derived initials, for a name the first letters get wrong. */
    initials?: string;
  }>(),
  { client: "" },
);

/** First letters of the first two words: "Václav Hradec" gives VH. */
const derivedInitials = computed(() => {
  if (props.initials) return props.initials;
  return (props.contact ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
});
</script>

<template>
  <aside class="reference-card">
    <img
      v-if="logo"
      class="reference-card__logo"
      :src="withBase(logo)"
      :alt="client"
      loading="lazy"
      decoding="async"
    />
    <p v-if="title" class="reference-card__title">{{ title }}</p>
    <!-- tf-checks is in patterns.css, shared with StepCard. -->
    <div class="reference-card__points tf-checks"><slot /></div>
    <div v-if="$slots.tags" class="reference-card__tags">
      <slot name="tags" />
    </div>
    <div v-if="contact" class="reference-card__contact">
      <img
        v-if="contactAvatar"
        class="reference-card__portrait"
        :src="withBase(contactAvatar)"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span v-else class="reference-card__initials" aria-hidden="true">
        {{ derivedInitials }}
      </span>
      <span class="reference-card__who">
        <span class="reference-card__name">{{ contact }}</span>
        <span v-if="contactRole" class="reference-card__role">{{
          contactRole
        }}</span>
      </span>
    </div>
  </aside>
</template>

<style scoped>
/*
 * One delivered project. Built to sit in a grid of these, so it is a column rather than a band
 * and nothing in it depends on the card being wide.
 *
 * gap rather than margins between the parts, because it guarantees the minimum spacing that the
 * footer's `margin-top: auto` would otherwise collapse to nothing on a card the grid is not
 * stretching.
 */
.reference-card {
  display: flex;
  flex-direction: column;
  gap: var(--tf-spacing-5);
  margin-block: var(--tf-spacing-6);
  padding: var(--tf-spacing-6);
  border: 1px solid var(--tf-color-line);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-color-panel-glass);
  backdrop-filter: var(--tf-glass-filter);
  /* The hairline of light along the top edge that makes a glass panel read as glass rather than
     as a flat fill. */
  box-shadow:
    var(--tf-shadow-1),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/*
 * Flattened to one ink colour rather than framed on a plate. A row of references is a logo wall,
 * and a wall of full-colour marks reads as a ransom note; one colour makes it a set, and the
 * card keeps its glass instead of carrying a white rectangle.
 *
 * brightness(0) collapses the mark to black for light mode, and dark mode inverts that to
 * white. Give it a logo with a transparent background: a baked-in white one flattens to a solid
 * block.
 */
.reference-card__logo {
  align-self: flex-start;
  width: auto;
  height: var(--tf-size-xl);
  max-width: 100%;
  object-fit: contain;
  filter: brightness(0);
  opacity: 0.72;
}

.dark .reference-card__logo {
  filter: brightness(0) invert(1);
  opacity: 0.82;
}

.reference-card__title {
  margin: 0;
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-h4);
  font-weight: 600;
  line-height: var(--tf-leading-tight);
  letter-spacing: var(--tf-tracking-h);
  color: var(--tf-color-fg);
}

.reference-card__points {
  /* tf-checks carries block margins for use in a page; here the card's gap places it. */
  margin-block: 0;
  font-size: var(--tf-text-body-sm);
  line-height: var(--tf-leading-body);
}

.reference-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tf-spacing-2);
}

/*
 * The rule is on the footer rather than a separate element, so a card with no contact has no
 * dangling line at its foot.
 *
 * margin-top: auto pins it to the bottom. In a grid the row stretches every card to its
 * tallest, and without this a short reference left its footer floating mid-card with a few
 * hundred pixels of nothing under it while its neighbour's sat at the foot.
 */
.reference-card__contact {
  display: flex;
  align-items: center;
  gap: var(--tf-spacing-3);
  margin-top: auto;
  padding-top: var(--tf-spacing-5);
  border-top: 1px solid var(--tf-color-line);
}

.reference-card__portrait,
.reference-card__initials {
  flex: none;
  width: var(--tf-size-xl);
  height: var(--tf-size-xl);
  border-radius: var(--tf-radius-pill);
  box-shadow: 0 0 0 1px
    color-mix(in oklab, var(--tf-color-accent) 35%, transparent);
}

.reference-card__portrait {
  object-fit: cover;
}

.reference-card__initials {
  display: grid;
  place-items: center;
  background: var(--tf-color-accent-soft);
  color: var(--tf-color-accent-ink);
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-caption);
  font-weight: 600;
  letter-spacing: var(--tf-tracking-label);
}

.reference-card__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.reference-card__name {
  font-family: var(--tf-font-display);
  font-size: var(--tf-text-body-sm);
  font-weight: 600;
  color: var(--tf-color-fg);
}

.reference-card__role {
  font-size: var(--tf-text-caption);
  color: var(--tf-color-muted);
}
</style>
