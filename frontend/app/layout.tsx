import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppFrame } from "@/components/layout/AppFrame";
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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <AppFrame>{children}</AppFrame>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
