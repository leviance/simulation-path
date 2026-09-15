import type { AnchorHTMLAttributes } from "react";

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

// Keep anchors server-rendered and free of per-link hydration. The single
// ClientNavigation listener upgrades same-origin clicks to Vinext App Router
// navigation while preserving downloads, external URLs and modifier keys.
export default function AppLink({ href, children, ...props }: AppLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
