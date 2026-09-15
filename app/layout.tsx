import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CodeCopyEnhancer } from "@/components/code-copy-enhancer";
import { ClientNavigation } from "@/components/client-navigation";
import "./globals.css";

// Runs before the browser paints the body. Client-side theme initialization is
// too late for native page navigations and causes a brief light-theme flash.
const themeInitScript = `(()=>{let theme;try{theme=localStorage.getItem("simulation-path-theme")}catch{}if(theme!=="light"&&theme!=="dark"){theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=theme})()`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Simulation Path", template: "%s · Simulation Path" },
  description:
    "Học C++, SDL3, đồ họa và mô phỏng khoa học qua 78 dự án có thể chạy, quan sát và kiểm chứng.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Simulation Path",
    description: "Từ pixel đầu tiên đến mô phỏng khoa học.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteHeader />
        <ClientNavigation />
        <CodeCopyEnhancer />
        {children}
        <footer className="site-footer">
          <div className="shell">
            <b>SIMULATION PATH</b>
            <span>
              Tự viết trước khi dùng thư viện · Thử nghiệm trước khi kết luận · Đo thay vì đoán
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
