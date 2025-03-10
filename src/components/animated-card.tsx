import { Card, type CardProps } from "@mui/material";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// Create a proper type for the motion component
type MotionCardProps = HTMLMotionProps<"div"> & CardProps;

// Create the motion component with proper typing
const MotionCard = motion<CardProps>(Card);

interface AnimatedCardProps extends Omit<MotionCardProps, "transition"> {
  delay?: number;
}

const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, delay = 0, ...props }, ref) => {
    return (
      <MotionCard
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: delay,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
        {...props}
      >
        {children}
      </MotionCard>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

export default AnimatedCard;
