import Link from 'next/link';

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'The Process', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For Companies', href: '#corporate' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-cream-100">
      {/* Gold divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-600 to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-14">
          {/* Column 1: Brand */}
          <div>
            <div className="font-serif text-2xl text-white mb-3">
              The Executive{' '}
              <span className="text-gold-500">Meditator</span>
            </div>
            <p className="font-sans text-sm text-cream-200 opacity-60 tracking-widest uppercase mt-1">
              Profits &middot; Productivity &middot; Peace
            </p>
            <p className="font-sans text-sm text-cream-200 opacity-50 mt-5 leading-relaxed max-w-xs">
              Designed for high-performing leaders who understand that true
              excellence requires stillness.
            </p>
          </div>

          {/* Column 2: Navigate */}
          <div>
            <h3 className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-6">
              Navigate
            </h3>
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-sans text-sm text-cream-200 opacity-60 hover:opacity-100 hover:text-gold-400 transition-all duration-200"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/setup"
                className="font-sans text-sm text-cream-200 opacity-60 hover:opacity-100 hover:text-gold-400 transition-all duration-200"
              >
                Get Started
              </Link>
            </nav>
          </div>

          {/* Column 3: Experience + Connect */}
          <div>
            <div className="mb-8">
              <h3 className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-6">
                Experience
              </h3>
              <div className="flex flex-col gap-3">
                <div
                  aria-label="App Store — coming soon"
                  className="inline-flex items-center gap-3 border border-navy-800 rounded-sm px-4 py-3 opacity-40 cursor-default"
                >
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-cream-200"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div>
                    <div className="font-sans text-xs text-cream-200 leading-none mb-0.5">
                      Download on the
                    </div>
                    <div className="font-sans text-sm text-cream-100">
                      App Store
                    </div>
                    <div className="font-sans text-xs text-gold-500 tracking-widest uppercase mt-0.5">
                      Coming Soon
                    </div>
                  </div>
                </div>
                <a
                  href="#"
                  aria-label="Get it on Google Play (coming soon)"
                  className="inline-flex items-center gap-3 border border-navy-800 hover:border-gold-600 rounded-sm px-4 py-3 transition-colors duration-200 group"
                >
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-cream-200 opacity-60 group-hover:opacity-100"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
                  </svg>
                  <div>
                    <div className="font-sans text-xs text-cream-200 opacity-50 leading-none mb-0.5">
                      Get it on
                    </div>
                    <div className="font-sans text-sm text-cream-100 opacity-80">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-4">
                Connect
              </h3>
              <a
                href="mailto:hillisoralee@gmail.com"
                className="font-sans text-sm text-cream-200 opacity-60 hover:opacity-100 hover:text-gold-400 transition-all duration-200"
              >
                hillisoralee@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="h-px bg-navy-800 mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-sans text-xs text-cream-200 opacity-40">
            &copy; {year} The Executive Meditator. All rights reserved.
          </p>
          <p className="font-sans text-xs text-cream-200 opacity-40 italic font-serif">
            Designed for the executive mind.
          </p>
        </div>
      </div>
    </footer>
  );
}
