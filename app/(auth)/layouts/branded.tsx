'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/app/components/brand/Logo';
import { MotionConfig, motion } from 'framer-motion';
import Mark from '@/app/components/brand/CourtIcon';

const listVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delayChildren: 0.08, staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* Animated typing text + cursor (for the first 4 lines) */
function TypingText({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const chars = Array.from(text);
  return (
    <span className="inline-block">
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: startDelay + i * 0.02 }}
          className="whitespace-pre"
        >
          {ch}
        </motion.span>
      ))}
      {/* blinking cursor */}
      <motion.span
        aria-hidden
        className="inline-block w-[1ch] border-l border-current align-middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: startDelay + chars.length * 0.02, duration: 1, repeat: Infinity }}
      />
    </span>
  );
}

/* Pulsing bullet dot */
function Bullet({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="mt-1 h-2 w-2 rounded-full bg-primary/80"
      initial={{ scale: 0.9, opacity: 0.9 }}
      animate={{ scale: [0.9, 1.08, 0.98, 1], opacity: [0.9, 1, 0.95, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export function BrandedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .branded-bg { background-image: url('${toAbsoluteUrl('/media/images/2600x1600/1.png')}'); }
        .dark .branded-bg { background-image: url('${toAbsoluteUrl('/media/images/2600x1600/1-dark.png')}'); }
      `}</style>

      <div className="grid lg:grid-cols-2 grow">
        {/* Left: logo ABOVE the form card */}
        <div className="relative flex flex-col items-center justify-center p-8 lg:pb-12 order-2 lg:order-1">
          <div className="w-full max-w-[420px] flex justify-center">
            <Link href="/" aria-label="LawFuze Home" className="inline-flex">
              <Logo />
            </Link>
          </div>

          {/* The form card */}
          <Card className="w-full max-w-[420px] mt-4">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
        </div>

        {/* Right: brand panel */}
        <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg relative overflow-hidden">
          <div className="flex flex-col p-8 lg:p-10 gap-6 relative z-10">
            <div className="flex flex-col gap-3 max-w-xl">
              {/* Compact heading */}
              <h3 className="text-xl md:text-2xl font-semibold leading-tight">
                Ask LawFuze. Court-Ready Arguments & Forms.
              </h3>

              {/* 8-feature list: first 4 typed, next 4 static */}
              <MotionConfig reducedMotion="user">
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="mt-2 grid gap-2 text-sm text-secondary-foreground"
                >
                  {/* 1–4: hero features (typing) */}
                  <motion.li variants={itemVariants} whileHover={{ x: 3 }} className="flex items-start gap-2">
                    <Bullet delay={0.0} />
                    <TypingText text="Argument Generation (positions, counter-arguments, authorities)" startDelay={0.05} />
                  </motion.li>

                  <motion.li variants={itemVariants} whileHover={{ x: 3 }} className="flex items-start gap-2">
                    <Bullet delay={0.15} />
                    <TypingText text="Prediction Analysis (outcomes, risks, likely steps)" startDelay={0.25} />
                  </motion.li>

                  <motion.li variants={itemVariants} whileHover={{ x: 3 }} className="flex items-start gap-2">
                    <Bullet delay={0.3} />
                    <TypingText text="Chat Workspace (Ask / Draft / Summarise / Compare)" startDelay={0.45} />
                  </motion.li>

                  <motion.li variants={itemVariants} whileHover={{ x: 3 }} className="flex items-start gap-2">
                    <Bullet delay={0.45} />
                    <TypingText text="Client Intake Automation → e-sign" startDelay={0.65} />
                  </motion.li>

                  {/* 5–8: best additional features (static) */}
                  <motion.li variants={itemVariants} whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                    <span>Evidence & citation fidelity </span>
                  </motion.li>
                  <motion.li variants={itemVariants} whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                    <span>Clause extraction & comparison </span>
                  </motion.li>
                  <motion.li variants={itemVariants} whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                    <span>Acts & clauses navigator and many more...</span>
                  </motion.li>




                </motion.ul>
              </MotionConfig>

            </div>
          </div>

          {/* Readability overlay */}
          <div className="pointer-events-none absolute inset-0 lg:rounded-xl bg-gradient-to-t from-background/70 to-transparent" />
        </div>
      </div>
    </>
  );
}
