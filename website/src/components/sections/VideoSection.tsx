'use client';

import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// TO ADD A VIDEO: Replace the empty string below with your YouTube or Vimeo URL
// YouTube embed example:  "https://www.youtube.com/embed/YOUR_VIDEO_ID"
// Vimeo embed example:    "https://player.vimeo.com/video/YOUR_VIDEO_ID"
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_EMBED_URL = 'https://www.youtube.com/embed/PvbYK9I_fGo';
const VIDEO_ID = 'PvbYK9I_fGo';
const THUMBNAIL_URL = `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="process"
      ref={ref}
      className="py-24 md:py-32"
      style={{
        background: 'linear-gradient(160deg, #0F1E35 0%, #1B2B4B 100%)',
      }}
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
          <p className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-4">
            The Experience
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-gold-400 font-light leading-tight max-w-3xl mx-auto text-balance">
            Click on the video to watch the process and Feel it&hellip;
          </h2>
        </motion.div>

        {/* Description */}
        <motion.p
          custom={0.15}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="font-sans text-sm md:text-base text-cream-200 opacity-70 text-center max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          With Lily&apos;s expressive face and ability you will see and feel the joyful
          anticipation of the Great Silence of true meditation — what Lily calls
          &ldquo;tapping into the All infinite database&rdquo;&hellip;
        </motion.p>

        {/* Video player / placeholder */}
        <motion.div
          custom={0.25}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="relative w-full rounded-sm overflow-hidden"
          style={{ aspectRatio: '16 / 9' }}
        >
          {VIDEO_EMBED_URL && playing ? (
            <iframe
              src={`${VIDEO_EMBED_URL}?autoplay=1`}
              title="Executive Meditator — The Process"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            /* Placeholder that looks like a real video thumbnail */
            <button
              onClick={() => VIDEO_EMBED_URL && setPlaying(true)}
              className="absolute inset-0 w-full h-full group flex items-center justify-center"
              style={{
                backgroundImage: `url(${THUMBNAIL_URL})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: VIDEO_EMBED_URL ? 'pointer' : 'default',
              }}
              aria-label="Play video"
            >
              {/* Dark overlay so play button stays readable */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(10,16,28,0.25) 0%, rgba(10,16,28,0.55) 100%)',
                }}
              />

              {/* Play button circle */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div
                  className="w-20 h-20 rounded-full border-2 border-gold-500/60 flex items-center justify-center transition-all duration-300 group-hover:border-gold-400 group-hover:scale-105"
                  style={{
                    background: 'rgba(196,169,98,0.1)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg
                    className="w-8 h-8 text-gold-400 translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>

                <div className="text-center">
                  <p className="font-serif text-xl text-cream-100 opacity-90 italic">
                    {VIDEO_EMBED_URL
                      ? 'Watch the Process'
                      : 'Video Coming Soon'}
                  </p>
                  {!VIDEO_EMBED_URL && (
                    <p className="font-sans text-xs text-cream-200 opacity-40 mt-2 tracking-wide">
                      Add your YouTube or Vimeo URL in VideoSection.tsx
                    </p>
                  )}
                </div>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-5 left-5 w-6 h-6 border-t border-l border-gold-500/30" />
              <div className="absolute top-5 right-5 w-6 h-6 border-t border-r border-gold-500/30" />
              <div className="absolute bottom-5 left-5 w-6 h-6 border-b border-l border-gold-500/30" />
              <div className="absolute bottom-5 right-5 w-6 h-6 border-b border-r border-gold-500/30" />
            </button>
          )}
        </motion.div>

        {/* Caption */}
        <motion.p
          custom={0.4}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center mt-6 font-sans text-xs text-cream-200 opacity-40 tracking-wide"
        >
          The Executive Meditator &mdash; Experience the Great Silence
        </motion.p>
      </div>
    </section>
  );
}
