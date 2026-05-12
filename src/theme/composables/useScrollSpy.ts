/// <reference lib="dom" />
import { onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute } from "vitepress";

const ACTIVE_CLASS = "scroll-active";

/**
 * Scroll-spy: highlights sidebar links matching the currently visible heading.
 * Listens for scroll events and picks the topmost heading above the viewport.
 */
export function useScrollSpy(): void {
  const route = useRoute();
  let headings: HTMLElement[] = [];
  let currentActiveId = "";
  let rafId = 0;
  let listening = false;

  function clearActive(): void {
    document
      .querySelectorAll(`.VPSidebar a.${ACTIVE_CLASS}`)
      .forEach((el) => el.classList.remove(ACTIVE_CLASS));
  }

  function setActive(id: string): void {
    if (id === currentActiveId) return;
    currentActiveId = id;
    clearActive();

    // Find matching sidebar link — match the hash portion at the end of href
    const links =
      document.querySelectorAll<HTMLAnchorElement>(".VPSidebar a[href]");
    let link: HTMLAnchorElement | null = null;
    for (const a of links) {
      const href = a.getAttribute("href") ?? "";
      if (href.endsWith(`#${id}`)) {
        link = a;
        break;
      }
    }
    if (!link) return;

    link.classList.add(ACTIVE_CLASS);

    // Auto-expand parent collapsed group if needed
    let parent = link.closest(".VPSidebarItem.collapsed");
    while (parent) {
      const caret = parent.querySelector<HTMLElement>(".caret");
      if (caret) caret.click();
      parent =
        parent.parentElement?.closest(".VPSidebarItem.collapsed") ?? null;
    }
  }

  function onScroll(): void {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const offset = 100;

      let activeId = "";
      for (const heading of headings) {
        if (heading.offsetTop <= scrollY + offset) {
          activeId = heading.id;
        } else {
          break;
        }
      }

      if (!activeId && headings.length > 0) {
        activeId = headings[0]!.id;
      }

      if (activeId) {
        setActive(activeId);
      }
    });
  }

  function collectHeadings(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(".VPDoc h2[id], .VPDoc h3[id]"),
    ).sort((a, b) => a.offsetTop - b.offsetTop);
  }

  function setup(): void {
    headings = collectHeadings();
    if (headings.length === 0) return;

    if (!listening) {
      window.addEventListener("scroll", onScroll, { passive: true });
      listening = true;
    }
    onScroll();
  }

  function cleanup(): void {
    cancelAnimationFrame(rafId);
    if (listening) {
      window.removeEventListener("scroll", onScroll);
      listening = false;
    }
    headings = [];
    currentActiveId = "";
    clearActive();
  }

  function delayedSetup(): void {
    // Wait for DOM to stabilize after page transition
    void nextTick().then(() => {
      setTimeout(setup, 300);
    });
  }

  onMounted(delayedSetup);

  watch(
    () => route.path,
    () => {
      cleanup();
      delayedSetup();
    },
  );

  onUnmounted(cleanup);
}
