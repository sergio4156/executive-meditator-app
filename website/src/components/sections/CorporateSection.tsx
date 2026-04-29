'use client';

import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

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

const threePs = [
  {
    letter: 'P',
    label: 'Profits',
    description:
      'Clarity of mind directly correlates with quality of decision-making. Executives who practice stillness consistently report improved strategic thinking and measurable business outcomes.',
  },
  {
    letter: 'P',
    label: 'Productivity',
    description:
      'When the mind is not exhausted by its own noise, it accomplishes more in less time. The 10-second practice acts as a system reset — restoring focus and momentum throughout the day.',
  },
  {
    letter: 'P',
    label: 'Peace',
    description:
      'The highest performers understand that sustainable excellence requires inner stability. Peace is not the absence of pressure — it is the capacity to perform brilliantly within it.',
  },
];

const licenseOptions = [
  { value: '', label: 'Select number of licenses' },
  { value: '1-10', label: '1 – 10 licenses' },
  { value: '10-50', label: '10 – 50 licenses' },
  { value: '50-100', label: '50 – 100 licenses' },
  { value: '100-500', label: '100 – 500 licenses' },
  { value: '500+', label: '500+ licenses' },
];

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  licenses: string;
  message: string;
}

interface FormErrors {
  name?: string;
  company?: string;
  email?: string;
  licenses?: string;
}

export default function CorporateSection() {
  const [form, setForm] = useState<FormState>({
    name: '',
    company: '',
    email: '',
    phone: '',
    licenses: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.company.trim()) e.company = 'Company name is required.';
    if (!form.email.trim()) {
      e.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Please enter a valid email address.';
    }
    if (!form.licenses) e.licenses = 'Please select a license range.';
    return e;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        setSuccess(true);
      } else {
        setServerError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setServerError('Unable to submit. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormErrors) =>
    `w-full bg-cream-50 border font-sans text-sm text-text-primary px-4 py-3 rounded-sm placeholder:text-text-muted placeholder:opacity-50 focus:outline-none focus:ring-1 transition-colors duration-200 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-cream-200 focus:border-gold-500 focus:ring-gold-500'
    }`;

  return (
    <section id="corporate" ref={ref} className="relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left panel — navy */}
        <motion.div
          custom={0}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInLeft}
          className="bg-navy-950 px-8 md:px-14 py-24 md:py-32 flex flex-col justify-center"
        >
          <p className="font-sans text-xs text-gold-500 uppercase tracking-widest mb-5">
            Corporate Experience
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-white font-light leading-snug mb-5">
            CEO Account Setup &amp;{' '}
            <br className="hidden md:block" />
            Corporate Experience
          </h2>
          <p className="font-sans text-sm text-cream-200 opacity-70 leading-relaxed mb-12 max-w-md">
            The Executive Meditator corporate program is designed for organizations
            that understand performance is inseparable from presence. When the
            leader is still, the organization moves with precision. When the team
            is present, execution becomes effortless.
          </p>

          {/* The 3 P's */}
          <div className="space-y-8">
            {threePs.map((p, i) => (
              <motion.div
                key={i}
                custom={0.15 + i * 0.1}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={fadeInLeft}
                className="flex gap-5"
              >
                {/* Gold P icon */}
                <div className="flex-shrink-0 w-10 h-10 border border-gold-500/40 flex items-center justify-center rounded-sm">
                  <span className="font-serif text-xl text-gold-500 font-light">
                    {p.letter}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-lg text-gold-400 mb-1">
                    {p.label}
                  </h3>
                  <p className="font-sans text-sm text-cream-200 opacity-60 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right panel — cream / form */}
        <motion.div
          custom={0.1}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInRight}
          className="bg-cream-100 px-8 md:px-14 py-24 md:py-32 flex flex-col justify-center"
        >
          {success ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-14 h-14 border border-gold-500 flex items-center justify-center rounded-full mb-6">
                <svg
                  className="w-6 h-6 text-gold-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="font-serif text-3xl text-navy-950 font-light mb-3">
                Thank You
              </h3>
              <p className="font-sans text-sm text-text-muted leading-relaxed max-w-sm">
                Your inquiry has been received. A member of our team will be in
                touch within one business day to discuss your organization&apos;s
                executive meditation program.
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-2xl text-navy-950 font-light mb-2">
                Corporate Inquiry
              </h3>
              <p className="font-sans text-sm text-text-muted mb-8 leading-relaxed">
                Tell us about your organization and we will design a program
                tailored to your leadership team.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Full Name */}
                <div>
                  <label className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2">
                    Full Name <span className="text-gold-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className={inputClass('name')}
                  />
                  {errors.name && (
                    <p role="alert" className="font-sans text-xs text-red-500 mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2">
                    Company Name <span className="text-gold-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Your organization"
                    className={inputClass('company')}
                  />
                  {errors.company && (
                    <p role="alert" className="font-sans text-xs text-red-500 mt-1">
                      {errors.company}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2">
                    Email Address <span className="text-gold-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className={inputClass('email')}
                  />
                  {errors.email && (
                    <p role="alert" className="font-sans text-xs text-red-500 mt-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone (optional) */}
                <div>
                  <label className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2">
                    Phone{' '}
                    <span className="normal-case opacity-50 tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-cream-50 border border-cream-200 font-sans text-sm text-text-primary px-4 py-3 rounded-sm placeholder:text-text-muted placeholder:opacity-50 focus:outline-none focus:border-gold-500 transition-colors duration-200"
                  />
                </div>

                {/* Number of Licenses */}
                <div>
                  <label
                    htmlFor="licenses"
                    className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2"
                  >
                    Number of Licenses <span className="text-gold-600">*</span>
                  </label>
                  <select
                    id="licenses"
                    name="licenses"
                    value={form.licenses}
                    onChange={handleChange}
                    className={`${inputClass('licenses')} appearance-none`}
                  >
                    {licenseOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.licenses && (
                    <p role="alert" className="font-sans text-xs text-red-500 mt-1">
                      {errors.licenses}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block font-sans text-xs text-text-muted uppercase tracking-widest mb-2">
                    Message{' '}
                    <span className="normal-case opacity-50 tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your team's goals..."
                    rows={4}
                    className="w-full bg-cream-50 border border-cream-200 font-sans text-sm text-text-primary px-4 py-3 rounded-sm placeholder:text-text-muted placeholder:opacity-50 focus:outline-none focus:border-gold-500 transition-colors duration-200 resize-none"
                  />
                </div>

                {/* Server error */}
                {serverError && (
                  <p role="alert" className="font-sans text-xs text-red-500 text-center">
                    {serverError}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-navy-950 hover:bg-navy-900 text-cream-50 font-sans text-sm tracking-widest uppercase py-4 rounded-sm transition-colors duration-200 disabled:opacity-60 mt-2"
                >
                  {submitting ? 'Sending...' : 'Submit Inquiry'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
