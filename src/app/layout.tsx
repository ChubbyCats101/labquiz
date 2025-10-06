import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavUser from "./components/NavUser";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KKU Classroom Toolkit",
  description: "Responsive practice app for KKU classroom APIs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="app-shell">
          <header className="site-header">
            <div className="site-header__left">
              <Link href="/" className="site-logo">
                KKU Classroom
              </Link>
              <nav className="site-nav">
                <Link href="/">Home</Link>
                <Link href="/profile">Profile</Link>
                <Link href="/company">Companies</Link>
                <Link href="/school">School</Link>
                <Link href="/teacher">Teachers</Link>
                <Link href="/classmates">Classmates</Link>
                <Link href="/statuses">Statuses</Link>
              </nav>
            </div>
            <NavUser />
          </header>

          <main className="site-main">{children}</main>

          <footer className="site-footer">
            <small>&copy; {currentYear} KKU Classroom Toolkit.</small>
          </footer>
        </div>
      </body>
    </html>
  );
}
