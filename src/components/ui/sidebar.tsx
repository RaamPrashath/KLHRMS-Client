"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HamburgerMenuIcon, Cross1Icon } from "@radix-ui/react-icons";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  const value = useMemo(
    () => ({ open, setOpen, animate }),
    [open, setOpen, animate]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, animate } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "h-full px-4 py-6 hidden md:flex md:flex-col shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "260px" : "72px") : "260px",
      }}
      initial={false}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.22,
              ease: [0.4, 0, 0.2, 1], // Material standard easing — smooth, no bounce
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();
  const orgSlug = pathname?.split("/")[1] || "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedDate = useMemo(() => {
    if (!mounted) return "";
    const date = new Date();
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  }, [mounted]);

  return (
    <>
      <div
        className={cn(
          "h-14 px-4 flex flex-row md:hidden items-center justify-between w-full border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950"
        )}
        {...props}
      >
        {/* Left: Notification Bell Icon */}
        <div className="flex items-center justify-start z-20">
          <Link href={orgSlug ? `/${orgSlug}/notifications` : "/"} className="relative cursor-pointer flex items-center justify-center p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-[22px] h-[22px] text-slate-500 dark:text-zinc-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <span className="absolute top-1 right-1.5 block h-[7px] w-[7px] rounded-full bg-blue-500 ring-1 ring-white dark:ring-zinc-950" />
          </Link>
        </div>

        {/* Center: Current Date */}
        <div className="flex-1 text-center z-10">
          <span className="text-[14px] font-semibold text-slate-500 dark:text-zinc-400">
            {formattedDate}
          </span>
        </div>

        {/* Right: Hamburger Menu Icon */}
        <div className="flex items-center justify-end z-20">
          <HamburgerMenuIcon
            className="text-neutral-800 dark:text-neutral-200 h-5 w-5 cursor-pointer"
            onClick={() => setOpen((value) => !value)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.28,
                ease: [0.4, 0, 0.2, 1],
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-6 top-[28px] z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen((value) => !value)}
              >
                <Cross1Icon className="h-5 w-5" />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  isActive,
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
}) => {
  const { open, setOpen } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href={link.href}
      onClick={(e) => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setOpen(false);
        }
        onClick?.();
      }}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-[12px] transition-all duration-200 relative overflow-hidden text-[14px]",
        isActive
          ? "bg-indigo-50/70 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 font-semibold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/40 font-medium",
        className
      )}
      {...props}
    >
      <div className={cn(
        "shrink-0 transition-all duration-150 group-hover/sidebar:translate-x-[1px]",
        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover/sidebar:text-slate-600 dark:text-zinc-500 group-hover/sidebar:text-zinc-300"
      )}>
        {link.icon}
      </div>

      <motion.span
        aria-hidden={!open}
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          width: open ? "auto" : 0,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : open
            ? {
                opacity: { duration: 0.14, delay: 0.1, ease: "easeOut" },
                width: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              }
            : {
                opacity: { duration: 0.1, ease: "easeIn" },
                width: { duration: 0.22, delay: 0.06, ease: [0.4, 0, 0.2, 1] },
              }
        }
        className="truncate tracking-tight overflow-hidden inline-block"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const SidebarLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: open ? 1 : 0,
        height: open ? "auto" : 0,
      }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : open
          ? {
              opacity: { duration: 0.14, delay: 0.1, ease: "easeOut" },
              height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
            }
          : {
              opacity: { duration: 0.1, ease: "easeIn" },
              height: { duration: 0.22, delay: 0.06, ease: [0.4, 0, 0.2, 1] },
            }
      }
      className={cn(
        "overflow-hidden px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-zinc-500",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
