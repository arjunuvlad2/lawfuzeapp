'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

const TAILWIND_FUCHSIA_CLASSES = [
  'fill-indigo-300 dark:fill-indigo-600',
  'fill-indigo-400 dark:fill-indigo-500',
  'fill-indigo-500 dark:fill-indigo-400',
  'fill-indigo-600 dark:fill-indigo-300',
  'fill-indigo-700 dark:fill-indigo-200',
];

const Logo = () => {
  // State for stepped color animation
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % TAILWIND_FUCHSIA_CLASSES.length);
    }, 1000); // 400ms per step ~2s full cycle
    return () => clearInterval(interval);
  }, [step]);

  // Offset each rect's color cycle for a lively effect
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3"
    >
      {/* Glowing Bolt Part */}
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={50}
        height={50}
        initial={{ rotate: -30, scale: 0.8, opacity: 0 }}
        animate={{ rotate: 0, scale: 1.1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 8,
          delay: 0.3,
        }}
      >
        <motion.path
          d="M52 10 L42 40 H60 L38 90 L48 50 H30 Z"
          fill="url(#boltGradient)"
          stroke="white"
          strokeWidth={1}
          initial={{ pathLength: 0, scale: 0.8, rotate: -10, opacity: 0 }}
          animate={{
            pathLength: 1,
            scale: [1, 1.05, 0.95, 1],
            opacity: 1,
            rotate: 0,
            filter: [
              "drop-shadow(0 0 4px #00f6ff)",
              "drop-shadow(0 0 12px #00f6ff)",
              "drop-shadow(0 0 4px #00f6ff)"
            ]
          }}
          transition={{
            pathLength: { duration: 1.2, ease: "easeInOut" },
            scale: {
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            },
            filter: {
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            },
            opacity: { duration: 0.6, delay: 0.3 }
          }}
        />

        <defs>
          <linearGradient id="boltGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00ffff" />
            <stop offset="100%" stopColor="#0090ff" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Text Part */}
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-3xl sm:text-3xl mx-2 font-bold bg-gradient-to-r from-white via-sky-400 to-indigo-400 bg-clip-text text-transparent"
      >
        LawFuze
      </motion.h1>
    </motion.div>
  );
};

export default Logo;

