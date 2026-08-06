"use client";

import { motion } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export default function ScrollReveal({ children, className = "", delayMs = 0 }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px", amount: 0.15 }}
      transition={{
        type: "spring",
        bounce: 0,
        duration: 0.6,
        delay: delayMs / 1000,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
