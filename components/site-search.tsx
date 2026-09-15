"use client";

import Link from "@/components/app-link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadSearchDetailItems, loadSearchOverviewItems } from "@/course/generated/search/loaders";
import type { SearchItem } from "@/course/search/types";
import { normalizeSearchText } from "@/lib/search-normalization.mjs";

type LoadState = "idle" | "loading" | "ready" | "error";

export function SiteSearch({ onClose }: { onClose(): void }) {
  const [query, setQuery] = useState("");
  const [overviewItems, setOverviewItems] = useState<SearchItem[]>([]);
  const [detailItems, setDetailItems] = useState<SearchItem[]>([]);
  const [overviewState, setOverviewState] = useState<LoadState>("loading");
  const [detailState, setDetailState] = useState<LoadState>("idle");
  const [retryToken, setRetryToken] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    void loadSearchOverviewItems()
      .then((items) => {
        if (active) {
          setOverviewItems(items);
          setOverviewState("ready");
        }
      })
      .catch(() => {
        if (active) setOverviewState("error");
      });
    return () => {
      active = false;
    };
  }, [retryToken]);

  useEffect(() => {
    if (detailState !== "loading") return;
    void loadSearchDetailItems()
      .then((items) => {
        setDetailItems(items);
        setDetailState("ready");
      })
      .catch(() => {
        setDetailState("error");
      });
  }, [detailState]);

  const searchItems = useMemo(
    () => [...overviewItems, ...detailItems],
    [detailItems, overviewItems],
  );

  const results = useMemo(() => {
    const words = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return searchItems.filter((item) => item.kind !== "Sắp ra mắt").slice(0, 8);
    return searchItems
      .filter((item) => words.every((word) => item.haystack.includes(word)))
      .slice(0, 12);
  }, [query, searchItems]);

  return (
    <section
      className="search-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm bài học"
    >
      <div className="search-input">
        <span aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim() && (detailState === "idle" || detailState === "error")) {
              setDetailState("loading");
            }
          }}
          placeholder="Tìm dự án, bài học hoặc khái niệm…"
          aria-label="Từ khóa tìm kiếm"
        />
        <kbd>ESC</kbd>
      </div>
      <div className="search-results" aria-live="polite">
        {results.map((item) => (
          <Link key={item.href} href={item.href} onClick={onClose}>
            <span>{item.kind}</span>
            <b>{item.title}</b>
            <i aria-hidden="true">↗</i>
          </Link>
        ))}
        {(overviewState === "loading" || (query.trim() && detailState === "loading")) && (
          <p>Đang tải chỉ mục tìm kiếm…</p>
        )}
        {(overviewState === "error" || detailState === "error") && (
          <p className="search-error">
            Không tải được đầy đủ chỉ mục.{" "}
            <button
              type="button"
              onClick={() => {
                if (overviewState === "error") setOverviewState("loading");
                if (detailState === "error") setDetailState(query.trim() ? "loading" : "idle");
                setRetryToken((value) => value + 1);
              }}
            >
              Thử lại
            </button>
          </p>
        )}
        {overviewState === "ready" && detailState !== "loading" && !results.length && (
          <p>Không tìm thấy kết quả phù hợp.</p>
        )}
      </div>
    </section>
  );
}
