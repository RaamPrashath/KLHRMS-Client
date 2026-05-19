import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  const hasFooter = icon ?? title ?? description;
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group/bento relative overflow-hidden row-span-1 flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 transition-colors duration-300 dark:border-zinc-800/60 dark:bg-[#0A0A0C] shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]",
        "hover:border-zinc-300 dark:hover:border-zinc-700/80",
        hasFooter ? "space-y-4" : "",
        className,
      )}
    >
      {/* Dynamic light gradient sweep on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-500/[0.01] via-transparent to-zinc-500/[0.02] dark:from-white/[0.002] dark:to-white/[0.008] pointer-events-none opacity-0 group-hover/bento:opacity-100 transition-opacity duration-500" />
      
      {/* Micro-dot grid background inspired by better-auth */}
      <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] opacity-[0.4] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
        {header}
        {hasFooter ? (
          <div className="mt-4 transition duration-300 ease-out group-hover/bento:translate-x-1">
            {icon}
            {title ? (
              <div className="mt-2 mb-1.5 font-sans font-bold text-neutral-800 dark:text-neutral-200 text-sm tracking-tight">
                {title}
              </div>
            ) : null}
            {description ? (
              <div className="font-sans text-xs font-normal text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {description}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
