"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LogoImage from "./LogoImage";
import { BRANDING } from "@/lib/branding";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#products", label: "Products" },
  { href: "#warranty", label: "Warranty" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/60 backdrop-blur-[20px] saturate-[1.8] border-b transition-shadow duration-300 ${
        scrolled ? "border-slate-200 shadow-sm" : "border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
        <Link href="/" className="flex items-center h-full">
          <LogoImage width={160} height={40} className="h-9 md:h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-sm font-semibold text-slate-600 hover:text-brand-900 transition-colors py-1"
            >
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-brand-700 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-brand-900 hover:bg-brand-800 text-white text-sm font-bold uppercase tracking-wide px-5 py-2.5 rounded-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Sales Catalogue
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 text-slate-700"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden border-t border-slate-200 bg-white transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-5 space-y-2">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-base font-semibold text-slate-700 hover:text-brand-900 active:bg-slate-50 py-3 px-3 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/catalog"
            onClick={() => setOpen(false)}
            className="block text-center bg-brand-900 hover:bg-brand-800 text-white text-sm font-bold uppercase tracking-wide px-5 py-3 rounded-md shadow-sm transition-colors"
          >
            Sales Catalogue
          </Link>
        </div>
      </div>
    </header>
  );
}
