import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cardVariants, reducedCardVariants, standardTransition } from "@/app/shared/utils/motionPresets";
import { cn } from "./utils";

function Card({ className, ...props }: React.ComponentProps<typeof motion.div>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      data-slot="card"
      variants={prefersReducedMotion ? reducedCardVariants : cardVariants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.12 }}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      transition={standardTransition}
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border transition-[border-color,box-shadow,background-color] duration-300 hover:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
};

