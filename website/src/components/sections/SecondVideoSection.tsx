'use client';

import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// TO ADD A VIDEO: Replace the empty string below with your YouTube or Vimeo URL
// YouTube embed example:  "https://www.youtube.com/embed/YOUR_VIDEO_ID"
// Vimeo embed example:    "https://player.vimeo.com/video/YOUR_VIDEO_ID"
// ─────────────────────────────────────────────────────────────────────────────
const SECOND_VIDEO_EMBED_URL = '';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function SecondVideoSection() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="second-process"
      ref={ref}
      className="py-24 md:py-32 bg-cream-100"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          custom={0}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center mb-12"
        >
          <p className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-4">
            Quantum Presence
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-navy-950 font-light leading-tight max-w-3xl mx-auto text-balance">
            The Process with Lily &mdash; Quantum Entanglement &amp; The First
            Principle of Oneness
          </h2>
          <div className="mt-6 mx-auto w-16 h-px bg-gold-500 opacity-60" />
        </motion.div>

        {/* Description */}
        <motion.p
          custom={0.15}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-sans text-sm md:text-base text-text-muted text-center max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          In this session, Lily guides you through the deeper dimensions of the
          practice — where science and stillness converge. Quantum Entanglement
          as a metaphor for our fundamental interconnectedness. The First
          Principle of Oneness as the ground from which all performance, all
          creativity, all true leadership ultimately arises.
        </motion.p>

        {/* Video player / placeholder */}
        <motion.div
          custom={0.25}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="relative w-full rounded-sm overflow-hidden border border-cream-200 shadow-lg"
          style={{ aspectRatio: '16 / 9' }}
        >
          {SECOND_VIDEO_EMBED_URL && playing ? (
            <iframe
              src={`${SECOND_VIDEO_EMBED_URL}?autoplay=1`}
              title="Executive Meditator — Quantum Entanglement & The First Principle of Oneness"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            /* Placeholder styled in cream/sage tones */
            <button
              onClick={() => SECOND_VIDEO_EMBED_URL && setPlaying(true)}
              className="absolute inset-0 w-full h-full group flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, #F2EDE6 0%, #E8E3DB 50%, #ECE7E0 100%)',
                cursor: SECOND_VIDEO_EMBED_URL ? 'pointer' : 'default',
              }}
              aria-label="Play video"
            >
              {/* Subtle pattern */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    'linear-gradient(#6B8F77 1px, transparent 1px), linear-gradient(90deg, #6B8F77 1px, transparent 1px)',
                  backgroundSize: '80px 80px',
                }}
              />

              {/* Play button circle */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div
                  className="w-20 h-20 rounded-full border-2 border-navy-800/30 flex items-center justify-center transition-all duration-300 group-hover:border-navy-800/60 group-hover:scale-105"
                  style={{
                    background: 'rgba(36, 51, 84, 0.06)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg
                    className="w-8 h-8 text-navy-900 opacity-50 group-hover:opacity-70 translate-x-0.5 transition-opacity duration-200"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>

                <div className="text-center">
                  <p className="font-serif text-xl text-navy-900 opacity-70 italic">
                    {SECOND_VIDEO_EMBED_URL
                      ? 'Watch with Lily'
                      : 'Video Coming Soon'}
                  </p>
                  {!SECOND_VIDEO_EMBED_URL && (
                    <p className="font-sans text-xs text-text-muted opacity-50 mt-2 tracking-wide">
                      Add your YouTube or Vimeo URL in SecondVideoSection.tsx
                    </p>
                  )}
                </div>
              </div>

              {/* Corner decorations in sage */}
              <div className="absolute top-5 left-5 w-6 h-6 border-t border-l border-sage-500/30" />
              <div className="absolute top-5 right-5 w-6 h-6 border-t border-r border-sage-500/30" />
              <div className="absolute bottom-5 left-5 w-6 h-6 border-b border-l border-sage-500/30" />
              <div className="absolute bottom-5 right-5 w-6 h-6 border-b border-r border-sage-500/30" />
            </button>
          )}
        </motion.div>

        {/* Caption */}
        <motion.p
          custom={0.35}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center mt-4 font-sans text-xs text-text-muted opacity-50 tracking-wide"
        >
          The Executive Meditator &mdash; With Lily
        </motion.p>

        {/* Final CTA */}
        <motion.div
          custom={0.45}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="mt-20 text-center"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent mb-14" />

          <p className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-5">
            Your Journey Begins Now
          </p>
          <h3 className="font-serif text-3xl md:text-4xl text-navy-950 font-light mb-5 text-balance">
            Ready to Begin Your Journey?
          </h3>
          <p className="font-sans text-sm text-text-muted max-w-lg mx-auto mb-10 leading-relaxed">
            Join the growing community of executives who have discovered that
            the most powerful competitive advantage is not a tool, a strategy,
            or a framework — it is stillness itself.
          </p>

          <Link
            href="/setup"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-sans text-sm font-medium tracking-widest uppercase px-10 py-4 rounded-sm transition-colors duration-200"
          >
            Get Started
          </Link>

          <p className="mt-5 font-sans text-xs text-text-muted opacity-50">
            Executive tier &mdash; $500 &middot; Secured by Stripe
          </p>
        </motion.div>
      </div>
    </section>
  );
}
