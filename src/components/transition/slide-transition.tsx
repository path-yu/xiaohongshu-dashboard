import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SlideTransitionProps {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
}

export default function SlideTransition({
  children,
  direction = "right",
}: SlideTransitionProps) {
  const directionOffset = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    up: { x: 0, y: -30 },
    down: { x: 0, y: 30 },
  };

  const slideVariants = {
    initial: {
      opacity: 0,
      x: directionOffset[direction].x,
      y: directionOffset[direction].y,
    },
    in: {
      opacity: 1,
      x: 0,
      y: 0,
    },
    out: {
      opacity: 0,
      x: -directionOffset[direction].x,
      y: -directionOffset[direction].y,
    },
  };

  const slideTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={slideVariants}
      transition={slideTransition}
    >
      {children}
    </motion.div>
  );
}
