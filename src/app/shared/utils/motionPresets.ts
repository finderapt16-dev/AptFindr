import type { Transition, Variants } from "motion/react";

export const standardTransition: Transition = {
  duration: 0.38,
  ease: [0.22, 1, 0.36, 1],
};

export const quickTransition: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

export const pageTransition: Transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.998 },
};

export const reducedPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export const reducedCardVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};
