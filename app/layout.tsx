import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { CartProvider } from "@/context/CartContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { headers } from "next/headers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phone Commerce",
  description:
    "Discover a wide selection of trendy clothes, shoes and accessories on Bloom E-Commerce. Enjoy fast delivery and free returns. Shop now!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <CartProvider>
          {!isAdmin && <Header />}

          <main className="flex-grow">{children}</main>

          <Toaster />

          {!isAdmin && <Footer />}
        </CartProvider>
      </body>
    </html>
  );
}
