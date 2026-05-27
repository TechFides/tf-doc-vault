<script setup lang="ts">
import { LOGO_SHAPES, LOGO_VIEW_BOX } from "./logoSymbol.js";
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="LOGO_VIEW_BOX"
    fill="currentColor"
    aria-hidden="true"
    v-html="LOGO_SHAPES"
  />
</template>
