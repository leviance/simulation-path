"use client";

import { useEffect } from "react";

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back for browsers that deny the asynchronous clipboard permission.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function decorate(pre: HTMLElement) {
  if (pre.dataset.copyReady) return;
  pre.dataset.copyReady = "true";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy-button";
  button.setAttribute("aria-label", "Sao chép đoạn code");
  button.textContent = "SAO CHÉP";
  pre.append(button);
}

function decorateTree(root: ParentNode) {
  if (root instanceof HTMLElement && root.matches(".prose pre")) decorate(root);
  root.querySelectorAll<HTMLElement>(".prose pre").forEach(decorate);
}

export function CodeCopyEnhancer() {
  useEffect(() => {
    decorateTree(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) decorateTree(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onClick = async (event: MouseEvent) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>(".code-copy-button")
          : null;
      if (!button) return;
      const pre = button.closest("pre");
      const code = pre?.querySelector("code")?.textContent ?? "";
      const copied = await copyText(code);
      button.textContent = copied ? "ĐÃ CHÉP" : "KHÔNG THỂ CHÉP";
      window.setTimeout(() => {
        button.textContent = "SAO CHÉP";
      }, 1400);
    };
    document.addEventListener("click", onClick);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
