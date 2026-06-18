'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

type Variant = 'cream' | 'navy';

interface Tier {
  id: 'individual' | 'corporate';
  role: string;
  subtitle: string;
  price: string;
  pricingNote: string;
  description: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
  badge: string | null;
  variant: Variant;
}

const tiers: Tier[] = [
  {
    id: 'individual',
    role: 'Individual',
    subtitle: 'Anyone, any field',
    price: '$10',
    pricingNote: 'One-time. Lifetime access.',
    description:
      'Complete the 21-day program. Permanently unlock the Great Silence — 10 seconds of inner stillness, accessible anytime, for life.',
    cta: 'Get the App',
    ctaHref: '/setup',
    featured: false,
    badge: null,
    variant: 'cream',
  },
  {
    id: 'corporate',
    role: 'Corporate',
    subtitle: 'Up to 500 employees',
    price: '$500',
    pricingNote: 'One-time, organization-wide.',
    description:
      'A 21-day transformation for your entire team. Less than $1 per employee. Returns: Peace, Productivity, Profits — what once took monks a lifetime, now in 21 days.',
    cta: 'Get in Touch',
    ctaHref: '#corporate',
    featured: true,
    badge: 'Best Value',
    variant: 'navy',
  },
];

function PricingCard({
  tier,
  index,
  inView,
}: {
  tier: Tier;
  index: number;
  inView: boolean;
}) {
  const isNavy = tier.variant === 'navy';

  const bgClass = isNavy
    ? 'bg-navy-950 border-navy-800'
    : 'bg-cream-50 border-cream-200';

  const headingClass = isNavy ? 'text-white' : 'text-navy-950';

  const subClass = isNavy
    ? 'text-cream-200 opacity-60'
    : 'text-text-muted';

  const priceClass = isNavy ? 'text-gold-400' : 'text-navy-950';

  const bodyClass = isNavy
    ? 'text-cream-200 opacity-70'
    : 'text-text-muted';

  const ctaBg = isNavy
    ? 'bg-gold-500 hover:bg-gold-600 text-navy-950'
    : 'bg-navy-950 hover:bg-navy-900 text-white';

  const handleAnchorScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (tier.ctaHref.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(tier.ctaHref.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div
      custom={0.1 + index * 0.1}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={`relative rounded-sm border p-8 flex flex-col ${bgClass} ${
        tier.featured ? 'ring-1 ring-gold-500/40' : ''
      }`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="font-sans text-xs text-navy-950 bg-gold-500 px-3 py-1 tracking-widest uppercase">
            {tier.badge}
          </span>
        </div>
      )}

      {/* Role */}
      <div className="mb-6">
        <h3 className={`font-serif text-2xl font-light mb-1 ${headingClass}`}>
          {tier.role}
        </h3>
        <p className={`font-sans text-xs uppercase tracking-widest ${subClass}`}>
          {tier.subtitle}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div>
          <span className={`font-serif text-5xl font-light ${priceClass}`}>
            {tier.price}
          </span>
          <span className={`font-sans text-sm ml-2 ${subClass}`}>USD</span>
        </div>
        <p className={`font-sans text-xs mt-2 ${subClass}`}>
          {tier.pricingNote}
        </p>
      </div>

      {/* Description */}
      <p className={`font-sans text-sm leading-relaxed mb-8 flex-1 ${bodyClass}`}>
        {tier.description}
      </p>

      {/* CTA */}
      {tier.ctaHref.startsWith('#') ? (
        <a
          href={tier.ctaHref}
          onClick={handleAnchorScroll}
          className={`block text-center py-3 font-sans text-sm tracking-widest uppercase rounded-sm transition-colors duration-200 ${ctaBg}`}
        >
          {tier.cta}
        </a>
      ) : (
        <Link
          href={tier.ctaHref}
          className={`block text-center py-3 font-sans text-sm tracking-widest uppercase rounded-sm transition-colors duration-200 ${ctaBg}`}
        >
          {tier.cta}
        </Link>
      )}
    </motion.div>
  );
}

export default function PricingSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" ref={ref} className="py-24 md:py-32 bg-cream-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          custom={0}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center mb-5"
        >
          <p className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-4">
            Pricing
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-950 font-light">
            One Investment, Permanent Returns
          </h2>
        </motion.div>

        <motion.p
          custom={0.1}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center font-sans text-sm text-text-muted max-w-2xl mx-auto mb-16 leading-relaxed"
        >
          One-time purchase. Lifetime access. The 21-day program installs the
          Great Silence as a permanent capacity — for you, or for your entire
          organization.
        </motion.p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              index={i}
              inView={inView}
            />
          ))}
        </div>

        {/* Practice disclaimer */}
        <motion.div
          custom={0.6}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="mt-16 max-w-2xl mx-auto border-t border-navy-950/10 pt-10"
        >
          <p className="font-sans text-xs text-gold-600 uppercase tracking-widest mb-4 text-center">
            A Note on Practice and Results
          </p>
          <p className="font-sans text-sm text-text-muted leading-relaxed text-center">
            Results vary by individual. The transformation this program
            describes — including the experience of the Great Silence and
            ongoing access to inspired insight — depends on consistent
            engagement across all 21 days. A minimum of 5 awake hours per day
            is recommended for the program to take full effect. The Executive
            Meditator app is a wellness and meditation tool, not medical advice
            or a substitute for professional care. Your access is for life —
            the program is fully resettable, so you may begin again as many
            times as needed to arrive at the experience you came for.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
