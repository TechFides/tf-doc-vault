<template>
  <footer class="brand-footer">
    <div class="brand-footer__inner">
      <a href="https://techfides.cz" target="_blank" rel="noopener" class="brand-footer__link">
        techfides.cz
      </a>
      <span class="brand-footer__sep" aria-hidden="true">•</span>
      <a href="mailto:info@techfides.cz" class="brand-footer__link">
        info@techfides.cz
      </a>
      <span class="brand-footer__sep" aria-hidden="true">•</span>
      <span class="brand-footer__address">
        Titanium Business Complex, Nové sady 25, 602 00 Brno-střed
      </span>
    </div>
  </footer>
</template>

<style scoped>
.brand-footer {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 24px;
  padding: 24px;
  text-align: center;
}

.brand-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.brand-footer__link {
  color: var(--tf-primary);
  text-decoration: none;
}

.brand-footer__link:hover {
  text-decoration: underline;
  color: var(--tf-primary-hover);
}

.brand-footer__sep {
  color: var(--vp-c-text-3);
}

.brand-footer__address {
  color: var(--vp-c-text-2);
}

.dark .brand-footer__link {
  color: var(--tf-secondary);
}

.dark .brand-footer__link:hover {
  color: #33b5e8;
}

/* Mobile: stack vertically with 16px gap */
@media (max-width: 639px) {
  .brand-footer__inner {
    flex-direction: column;
    gap: 16px;
  }

  .brand-footer__sep {
    display: none;
  }
}
</style>
