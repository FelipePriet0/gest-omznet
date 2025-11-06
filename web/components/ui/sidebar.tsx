"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, PanelLeft } from "lucide-react";

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

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
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
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen py-4 hidden md:flex md:flex-col w-[300px] flex-shrink-0 fixed left-0 top-0 overflow-x-hidden",
        open ? "px-4" : "px-2",
        "bg-[var(--color-primary)] text-white",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
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
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between w-full border-b",
          "bg-[var(--color-primary)] text-white border-white/20"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 p-10 z-[100] flex flex-col justify-between",
                "bg-[var(--color-primary)] text-white",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
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
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 group/sidebar p-3 w-full rounded-[5px]",
        "hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer",
        open ? "justify-start" : "justify-center",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-white text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

// Subcomponents to match UI-sidebar structure
export const SidebarHeader = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex items-center gap-2 px-2 py-2 rounded-md mb-2 shrink-0",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SidebarFooter = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "px-2 py-2 mt-2 border-t border-white shrink-0 mz-sidebar-footer",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SidebarContent = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SidebarGroup = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-2", className)} {...props}>
    {children}
  </div>
);

export const SidebarGroupLabel = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "text-xs font-medium text-[hsl(var(--sidebar-foreground))]/70 px-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SidebarGroupContent = ({ className, children, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-2 px-1", className)} {...props}>
    {children}
  </div>
);

export const SidebarMenu = ({ className, children, ...props }: React.ComponentProps<"ul">) => (
  <ul className={cn("flex flex-col", className)} {...props}>
    {children}
  </ul>
);

export const SidebarMenuItem = ({ className, children, ...props }: React.ComponentProps<"li">) => (
  <li className={cn("list-none", className)} {...props}>
    {children}
  </li>
);

export const SidebarMenuButton = ({
  asChild,
  href,
  className,
  children,
  ...props
}: {
  asChild?: boolean;
  href?: string;
} & React.ComponentProps<"a">) => {
  const content = (
    <span
      className={cn(
        "w-full inline-flex items-center gap-2 p-3 rounded-[5px]",
        "hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );

  if (asChild && href) {
    return (
      <Link href={href} className="w-full">
        {content}
      </Link>
    );
  }

  return content;
};

export const SidebarTrigger = ({ className, ...props }: React.ComponentProps<"button">) => {
  const { open, setOpen } = useSidebar();
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center justify-center p-1 text-[var(--color-primary)] opacity-100",
        className
      )}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
};
