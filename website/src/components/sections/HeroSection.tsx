'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function HeroSection() {
  const handleLearnMore = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0F1E35 0%, #1B2B4B 60%, #0F1E35 100%)',
      }}
    >
      {/* Subtle radial sage glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(107,143,119,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Animated gradient orbs — very slow, very calm */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none animate-float-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(196,169,98,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none animate-float-slower"
        style={{
          background:
            'radial-gradient(circle, rgba(107,143,119,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Logo mark */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-8"
        >
          <span
            className="font-serif text-5xl md:text-7xl tracking-[0.3em] text-gold-500 font-light select-none"
            style={{ letterSpacing: '0.25em' }}
          >
            T&middot;E&middot;M
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={0.15}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-serif text-3xl md:text-5xl lg:text-6xl text-white font-light leading-tight mb-6 text-balance"
        >
          As an Executive, your most valuable asset is time.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          custom={0.3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-sans text-base md:text-lg text-cream-200 opacity-80 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          With the Executive Meditator app we honor the 3 P&apos;s —{' '}
          <span className="text-gold-400">Profits</span>,{' '}
          <span className="text-gold-400">Productivity</span>, and{' '}
          <span className="text-gold-400">Peace</span>. In just 3 weeks of dedicated
          time, you will experience the 3 P&apos;s.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={0.45}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-sans text-sm font-medium tracking-widest uppercase px-8 py-4 rounded-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
          >
            Download the App
          </Link>
          <a
            href="#how-it-works"
            onClick={handleLearnMore}
            className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white font-sans text-sm tracking-widest uppercase px-8 py-4 rounded-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
          >
            Learn More
          </a>
        </motion.div>

        {/* 3 P's pill badges */}
        <motion.div
          custom={0.6}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-center justify-center gap-6 mt-14"
        >
          {['Profits', 'Productivity', 'Peace'].map((p) => (
            <div key={p} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-gold-500 opacity-70" />
              <span className="font-serif text-sm text-cream-200 opacity-60 italic">
                {p}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-sans text-xs text-cream-200 opacity-40 tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            className="w-4 h-4 text-cream-200 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
