'use client';

import { useState, useRef } from 'react';
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

const tiers = [
  {
    id: 'executive',
    role: 'Executive',
    subtitle: 'You — the leader',
    price: '$500',
    description:
      'Full access to the Executive Meditator program. The foundational investment that cascades excellence through your entire organization.',
    cta: 'Begin Your Journey',
    featured: true,
    badge: 'Most Exclusive',
    variant: 'navy' as const,
  },
  {
    id: 'cfo-vp',
    role: 'CFO / VP',
    subtitle: 'Senior leadership',
    price: '$250',
    description:
      'For your most senior leaders. Full program access at half the investment — extending the culture of mindful performance to the C-suite.',
    cta: 'Get Access',
    featured: false,
    badge: null,
    variant: 'sage' as const,
  },
  {
    id: 'manager',
    role: 'Manager Level',
    subtitle: 'Mid-level leadership',
    price: '$125',
    description:
      'For the managers who translate vision into execution. A quarter of the executive investment, a full measure of the benefit.',
    cta: 'Get Access',
    featured: false,
    badge: null,
    variant: 'cream' as const,
  },
  {
    id: 'employees',
    role: 'Employees',
    subtitle: 'Your entire team',
    price: '$0.99',
    description:
      'Peace is not a privilege. At less than a dollar, every team member of the organization gains access to the 10-second meditation — increasing the 3 P\'s for the entire organization.',
    cta: 'Get Access',
    featured: false,
    badge: null,
    variant: 'light-sage' as const,
  },
];

function PricingCard({
  tier,
  index,
  inView,
  onExecutiveCta,
  loading,
}: {
  tier: (typeof tiers)[0];
  index: number;
  inView: boolean;
  onExecutiveCta: () => void;
  loading: boolean;
}) {
  const isNavy = tier.variant === 'navy';
  const isSage = tier.variant === 'sage';
  const isCream = tier.variant === 'cream';
  const isLightSage = tier.variant === 'light-sage';

  const bgClass = isNavy
    ? 'bg-navy-950 border-navy-800'
    : isSage
    ? 'bg-sage-500 border-sage-600'
    : isCream
    ? 'bg-cream-50 border-cream-200'
    : 'bg-sage-300/30 border-sage-300/50';

  const headingClass = isNavy
    ? 'text-white'
    : isSage
    ? 'text-white'
    : 'text-navy-950';

  const subClass = isNavy
    ? 'text-cream-200 opacity-60'
    : isSage
    ? 'text-white opacity-70'
    : 'text-text-muted';

  const priceClass = isNavy
    ? 'text-gold-400'
    : isSage
    ? 'text-white'
    : 'text-navy-950';

  const bodyClass = isNavy
    ? 'text-cream-200 opacity-70'
    : isSage
    ? 'text-white opacity-80'
    : 'text-text-muted';

  const ctaBg = isNavy
    ? 'bg-gold-500 hover:bg-gold-600 text-navy-950'
    : isSage
    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/40'
    : 'bg-navy-950 hover:bg-navy-900 text-white';

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
        <span className={`font-serif text-5xl font-light ${priceClass}`}>
          {tier.price}
        </span>
        {tier.id !== 'employees' && (
          <span className={`font-sans text-sm ml-1 ${subClass}`}>
            / per license
          </span>
        )}
        {tier.id === 'employees' && (
          <span className={`font-sans text-sm ml-1 ${subClass}`}>
            / per month
          </span>
        )}
      </div>

      {/* Description */}
      <p className={`font-sans text-sm leading-relaxed mb-8 flex-1 ${bodyClass}`}>
        {tier.description}
      </p>

      {/* CTA */}
      {tier.id === 'executive' ? (
        <button
          onClick={onExecutiveCta}
          disabled={loading}
          className={`w-full py-3 font-sans text-sm tracking-widest uppercase rounded-sm transition-colors duration-200 ${ctaBg} disabled:opacity-60`}
        >
          {loading ? 'Preparing...' : tier.cta}
        </button>
      ) : (
        <Link
          href="/setup"
          className={`block text-center py-3 font-sans text-sm tracking-widest uppercase rounded-sm transition-colors duration-200 ${ctaBg}`}
        >
          {tier.cta}
        </Link>
      )}
    </motion.div>
  );
}

export default function PricingSection() {
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const handleExecutiveCta = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { url?: string };
      if (data.url && data.url !== '#') {
        window.location.href = data.url;
      } else {
        window.location.href = '/setup';
      }
    } catch {
      window.location.href = '/setup';
    } finally {
      setLoading(false);
    }
  };

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
            Investment
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-950 font-light">
            Investment in Your Excellence
          </h2>
        </motion.div>

        <motion.p
          custom={0.1}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center font-sans text-sm text-text-muted max-w-2xl mx-auto mb-16 leading-relaxed"
        >
          The Executive Meditator is designed around a cascade philosophy: the
          investment reflects organizational hierarchy, ensuring that peace and
          performance flow from the top — and reach every level.
        </motion.p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {tiers.map((tier, i) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              index={i}
              inView={inView}
              onExecutiveCta={handleExecutiveCta}
              loading={loading}
            />
          ))}
        </div>

        {/* Footnote */}
        <motion.p
          custom={0.5}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp}
          className="text-center mt-12 font-serif text-base text-text-muted italic max-w-2xl mx-auto leading-relaxed"
        >
          The investment decreases as it cascades through your organization —
          because peace benefits everyone.
        </motion.p>
      </div>
    </section>
  );
}
