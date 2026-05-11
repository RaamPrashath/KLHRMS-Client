"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { createContext, useContext, useMemo, useState } from "react";
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
        "h-full px-4 py-4 hidden md:flex md:flex-col shrink-0",
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
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 flex flex-row md:hidden items-center justify-between w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
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
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
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
  const { open } = useSidebar();
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2 px-3 rounded-xl transition-all duration-200 relative overflow-hidden",
        isActive
          ? "bg-white/10 text-white font-medium"
          : "text-white/50 hover:text-white hover:bg-white/5",
        className
      )}
      {...props}
    >
      <div className={cn(
        "shrink-0 transition-colors duration-200",
        isActive ? "text-primary" : "text-white/40 group-hover/sidebar:text-white/70"
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
        className="text-[13.5px] truncate tracking-tight overflow-hidden inline-block"
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
        "overflow-hidden px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
