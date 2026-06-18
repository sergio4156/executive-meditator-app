'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function WhoSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="who"
      ref={ref}
      className="py-24 md:py-32 bg-cream-50"
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
        <motion.p
          custom={0}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-4"
        >
          Who
        </motion.p>

        <motion.h2
          custom={0.1}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-serif text-3xl md:text-4xl text-navy-950 font-light mb-10 text-balance"
        >
          Who is an Executive Meditator?
        </motion.h2>

        <motion.p
          custom={0.2}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-sans text-base md:text-lg text-text-muted leading-relaxed mb-6"
        >
          An <span className="text-navy-950 font-medium">Executive Meditator</span>{' '}
          is anyone — artist, teacher, engineer, parent, healer, professional —
          who has completed the 21-day program and now lives with permanent
          access to the{' '}
          <span className="text-gold-600 font-medium">All-Infinite Database</span>{' '}
          through the{' '}
          <span className="text-gold-600 font-medium">Great Silence</span>.
        </motion.p>

        <motion.p
          custom={0.3}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-sans text-base md:text-lg text-text-muted leading-relaxed"
        >
          No title required. The app does the transforming. Once permanent,
          inspiration flows naturally — automatically filtered through the{' '}
          <span className="text-gold-600 font-medium">
            First Principle of Oneness
          </span>
          , ensuring everything you create is aligned with that foundational
          truth.
        </motion.p>

        {/* Subtle gold divider */}
        <motion.div
          custom={0.4}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="mt-12 mx-auto w-16 h-px bg-gold-500/40"
        />
      </div>
    </section>
  );
}
