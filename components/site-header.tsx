"use client";

import Link from "@/components/app-link";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

const SiteSearch = lazy(() =>
  import("@/components/site-search").then((module) => ({ default: module.SiteSearch })),
);

type Theme = "light" | "dark";
const THEME_KEY = "simulation-path-theme";
const THEME_EVENT = "simulation-path-theme-change";
let volatileTheme: Theme | null = null;

function readTheme(): Theme {
  if (volatileTheme) return volatileTheme;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the operating-system preference.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) {
      volatileTheme =
        event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
      callback();
    }
  };
  addEventListener(THEME_EVENT, callback);
  addEventListener("storage", onStorage);
  media.addEventListener("change", callback);
  return () => {
    removeEventListener(THEME_EVENT, callback);
    removeEventListener("storage", onStorage);
    media.removeEventListener("change", callback);
  };
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const closeSearch = () => {
    setOpen(false);
    window.setTimeout(() => searchButtonRef.current?.focus(), 0);
  };

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    volatileTheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The in-memory UI still updates through the DOM below.
    }
    document.documentElement.dataset.theme = next;
    dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              S<span>P</span>
            </span>
            <b>
              SIMULATION
              <br />
              PATH
            </b>
          </Link>
          <nav aria-label="Điều hướng chính">
            <Link href="/roadmap">Lộ trình</Link>
            <Link href="/getting-started">Bắt đầu</Link>
            <Link href="/downloads">Mã nguồn</Link>
            <Link href="/glossary">Thuật ngữ</Link>
          </nav>
          <div className="header-tools">
            <button
              ref={searchButtonRef}
              className="search-trigger"
              onClick={() => setOpen(true)}
              aria-label="Tìm kiếm"
              aria-expanded={open}
            >
              <span aria-hidden="true">⌕</span> Tìm kiếm <kbd>Ctrl K</kbd>
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Chuyển sang giao diện ${theme === "dark" ? "sáng" : "tối"}`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="search-backdrop">
          <button
            className="search-backdrop-dismiss"
            onClick={closeSearch}
            aria-label="Đóng tìm kiếm"
          />
          <Suspense
            fallback={
              <section className="search-dialog search-loading" aria-label="Đang mở tìm kiếm">
                Đang mở tìm kiếm…
              </section>
            }
          >
            <SiteSearch onClose={closeSearch} />
          </Suspense>
        </div>
      )}
    </>
  );
}
