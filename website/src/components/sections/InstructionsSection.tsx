'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const fadeInLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const fadeInRight = {
  hidden: { opacity: 0, x: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const steps = [
  {
    number: '01',
    title: 'Program the App',
    description:
      'Enter the average number of hours you are awake each day. This is your only input — the app does the rest, scheduling your 10-second practice automatically throughout your day.',
  },
  {
    number: '02',
    title: 'Deepen the Practice',
    description:
      'In Week 2, your reminders shift to every 30 minutes. As awareness grows, so does your capacity for presence. The silence becomes more accessible, more familiar.',
  },
  {
    number: '03',
    title: 'Integrate the Stillness',
    description:
      'Week 3 brings reminders every 15 minutes. The practice: eyes open, gaze slightly up and to the right, bring up the Feeling of Joyful Anticipation — and Listen. Hold that gaze and feeling. The app vibrates when your 10 seconds are complete, so you never have to count. Watch the video demonstration.',
  },
];

const weeks = [
  {
    week: 'Week 1',
    interval: 'Every Hour',
    description: '10-second pause, hourly throughout the day',
    color: 'bg-gold-500',
    textColor: 'text-gold-500',
    sessions: 8,
  },
  {
    week: 'Week 2',
    interval: 'Every 30 Min',
    description: 'Deepening awareness, twice as frequent',
    color: 'bg-sage-500',
    textColor: 'text-sage-500',
    sessions: 16,
  },
  {
    week: 'Week 3',
    interval: 'Every 15 Min',
    description: 'Stillness integrated throughout the day',
    color: 'bg-navy-800',
    textColor: 'text-navy-900',
    sessions: 32,
  },
];

function SectionHeader({ inView }: { inView: boolean }) {
  return (
    <motion.div
      custom={0}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className="text-center mb-16"
    >
      <p className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-4">
        The Method
      </p>
      <h2 className="font-serif text-4xl md:text-5xl text-navy-950 font-light">
        How It Works
      </h2>
      <div className="mt-5 mx-auto w-16 h-px bg-gold-500 opacity-60" />
    </motion.div>
  );
}

export default function InstructionsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="py-24 md:py-32 bg-cream-100"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <SectionHeader inView={inView} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
          {/* Left column: instructions */}
          <div>
            {/* Pull quote */}
            <motion.blockquote
              custom={0.1}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeInLeft}
              className="border-l-2 border-gold-500 pl-6 mb-10"
            >
              <p className="font-serif text-2xl md:text-3xl text-navy-900 font-light italic leading-snug">
                &ldquo;10 seconds to a better life.&rdquo;
              </p>
            </motion.blockquote>

            {/* Steps */}
            <div className="space-y-6 mb-10">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  custom={0.15 + i * 0.12}
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={fadeInLeft}
                  className="bg-white rounded-sm border border-cream-200 p-6 flex gap-5"
                >
                  <div className="flex-shrink-0">
                    <span className="font-serif text-3xl text-gold-500 font-light leading-none">
                      {step.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-navy-950 mb-2">
                      {step.title}
                    </h3>
                    <p className="font-sans text-sm text-text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Motivation paragraph */}
            <motion.div
              custom={0.5}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeInLeft}
              className="border-l-2 border-gold-400/50 pl-6"
            >
              <p className="font-sans text-sm text-text-muted leading-relaxed">
                The practice does not demand hours. It asks only for ten seconds —
                ten conscious, deliberate seconds — to remind your nervous system
                that beneath the velocity of executive life, there is a reservoir of
                boundless stillness available to you at all times. This is not a
                retreat from performance. It is the very source of it.
              </p>
            </motion.div>
          </div>

          {/* Right column: timeline diagram */}
          <motion.div
            custom={0.2}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={fadeInRight}
          >
            <div className="bg-white rounded-sm border border-cream-200 p-8">
              <h3 className="font-serif text-xl text-navy-950 mb-2">
                Your 3-Week Journey
              </h3>
              <p className="font-sans text-xs text-text-muted mb-8 leading-relaxed">
                A progressive deepening — each week builds upon the last.
              </p>

              <div className="space-y-8">
                {weeks.map((week, i) => (
                  <div key={week.week} className="relative">
                    {/* Connector line */}
                    {i < weeks.length - 1 && (
                      <div className="absolute left-5 top-12 w-px h-8 bg-cream-200" />
                    )}

                    <div className="flex items-start gap-5">
                      {/* Circle node */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div
                          aria-label={`Week ${i + 1}`}
                          className={`w-10 h-10 rounded-full ${week.color} flex items-center justify-center`}
                        >
                          <span className="font-serif text-white text-sm font-light" aria-hidden="true">
                            {i + 1}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif text-lg text-navy-950">
                            {week.week}
                          </span>
                          <span
                            className={`font-sans text-xs font-medium tracking-wide ${week.textColor}`}
                          >
                            {week.interval}
                          </span>
                        </div>
                        <p className="font-sans text-sm text-text-muted mb-3">
                          {week.description}
                        </p>

                        {/* Session dots */}
                        <div role="img" aria-label={`Visual showing ${week.interval.toLowerCase()} reminders throughout the day for ${week.week}`} className="flex flex-wrap gap-1">
                          {Array.from({ length: Math.min(week.sessions, 24) }).map(
                            (_, j) => (
                              <div
                                key={j}
                                className={`w-2 h-2 rounded-full ${week.color} opacity-${
                                  j < 8 ? '80' : j < 16 ? '50' : '30'
                                }`}
                                style={{
                                  opacity:
                                    j < 8
                                      ? 0.8
                                      : j < 16
                                      ? 0.5
                                      : 0.3,
                                }}
                              />
                            )
                          )}
                          {week.sessions > 24 && (
                            <span className="font-sans text-xs text-text-muted self-center ml-1">
                              +{week.sessions - 24}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 pt-6 border-t border-cream-200">
                <p className="font-serif text-sm text-navy-900 italic text-center leading-relaxed">
                  By week three, stillness is no longer something you seek —
                  it finds you.
                </p>
              </div>
            </div>

            {/* Secondary pull quote */}
            <motion.div
              custom={0.4}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={fadeInRight}
              className="mt-8 bg-sage-300/20 border border-sage-300/40 rounded-sm p-6"
            >
              <p className="font-sans text-sm text-text-muted leading-relaxed">
                The app is designed to honor your daily schedule. The cumulative
                effect of this Listening — eyes up-right, with Joyful Anticipation
                — has been described as &ldquo;transformative&rdquo;: the best investment
                that can be made in self-expansion.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
