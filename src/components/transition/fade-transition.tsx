import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FadeTransitionProps {
  children: ReactNode;
}

const fadeVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

const fadeTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3,
};

export default function FadeTransition({ children }: FadeTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={fadeVariants}
      transition={fadeTransition}
    >
      {children}
    </motion.div>
  );
}
