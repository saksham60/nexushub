import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/AppShell";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexusHub",
  description: "Enterprise operations hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <RouteGuard>
            <AppShell>{children}</AppShell>
          </RouteGuard>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
