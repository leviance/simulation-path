"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function anchorFrom(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

function internalHref(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { url, href: `${url.pathname}${url.search}${url.hash}` };
}

// Intercepting internal anchors once keeps links server-rendered and avoids a
// full document reload without relying on Vinext's private window globals.
export function ClientNavigation() {
  const router = useRouter();

  useEffect(() => {
    const prefetched = new Set<string>();

    const prefetch = (anchor: HTMLAnchorElement | null) => {
      if (!anchor) return;
      const destination = internalHref(anchor);
      if (!destination || prefetched.has(destination.href)) return;
      if (
        destination.url.pathname === window.location.pathname &&
        destination.url.search === window.location.search
      )
        return;
      prefetched.add(destination.href);
      router.prefetch(destination.href);
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = anchorFrom(event.target);
      const destination = anchor ? internalHref(anchor) : null;
      if (!destination) return;

      const current = new URL(window.location.href);
      if (
        destination.url.pathname === current.pathname &&
        destination.url.search === current.search
      ) {
        if (destination.url.hash !== current.hash) return;
        if (destination.url.hash) return;
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      event.preventDefault();
      router.push(destination.href, { scroll: true });
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "touch") prefetch(anchorFrom(event.target));
    };
    const onFocusIn = (event: FocusEvent) => prefetch(anchorFrom(event.target));

    document.addEventListener("click", onClick);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [router]);

  return null;
}
