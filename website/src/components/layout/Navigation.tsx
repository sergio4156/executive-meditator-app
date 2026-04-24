'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'The Process', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For Companies', href: '#corporate' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setMobileOpen(false);
    }
  };

  return (
    <>
      <a href="#hero" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-navy-900 focus:text-gold-400 focus:px-4 focus:py-2 focus:rounded">Skip to content</a>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-navy-950/95 backdrop-blur-md shadow-lg shadow-navy-950/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto pl-6 pr-10 md:px-10">
          <div className="flex items-center justify-between h-18 py-4">
            {/* Logo */}
            <Link
              href="#hero"
              onClick={(e) => handleNavClick(e, '#hero')}
              className="font-serif text-xl text-white tracking-wide hover:opacity-80 transition-opacity duration-200"
            >
              The Executive{' '}
              <span className="text-gold-500">Meditator</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-sans text-sm text-cream-100 hover:text-gold-400 transition-colors duration-200 tracking-wide opacity-90 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 rounded"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-4">
              <Link
                href="/setup"
                className="hidden md:inline-flex items-center px-5 py-2 border border-gold-500 text-gold-400 font-sans text-sm tracking-widest uppercase hover:bg-navy-900 transition-colors duration-200 rounded-sm"
              >
                Get Started
              </Link>

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex flex-col gap-1.5 p-2.5 min-h-[44px] min-w-[44px] items-center justify-center group"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                <span
                  className={`block w-6 h-0.5 bg-cream-100 transition-all duration-300 ${
                    mobileOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                <span
                  className={`block w-6 h-0.5 bg-cream-100 transition-all duration-300 ${
                    mobileOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`block w-6 h-0.5 bg-cream-100 transition-all duration-300 ${
                    mobileOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-screen' : 'max-h-0'
          }`}
        >
          <div className="bg-navy-950/98 backdrop-blur-md border-t border-navy-800 px-6 py-6">
            <nav className="flex flex-col gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-sans text-base text-cream-100 hover:text-gold-400 transition-colors duration-200 tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 rounded"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/setup"
                className="inline-flex items-center justify-center mt-2 px-5 py-3 border border-gold-500 text-gold-400 font-sans text-sm tracking-widest uppercase hover:bg-navy-900 transition-colors duration-200 rounded-sm"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
