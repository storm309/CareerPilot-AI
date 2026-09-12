"use client";

import { UserButton } from "@clerk/nextjs";
import {
  FileSearch,
  HelpCircle,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Sparkles,
  Terminal,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

import { Logo, LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NAV_SECTIONS = [
  {
    label: "Practice",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/coding", label: "Coding round", icon: Terminal },
    ],
  },
  {
    label: "Toolkit",
    items: [
      { href: "/dashboard/resume", label: "Resume ATS", icon: FileSearch },
      { href: "/dashboard/preparation", label: "Writing tools", icon: PenTool },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
      { href: "/dashboard/upgrade", label: "Plans", icon: Sparkles },
      { href: "/dashboard/questions", label: "Help", icon: HelpCircle },
    ],
  },
];

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function isNavItemActive(href, pathname) {
  return href === "/dashboard" ? pathname === href : Boolean(pathname?.startsWith(href));
}

export function currentNavItem(pathname) {
  // Longest match wins, so /dashboard/coding does not resolve to /dashboard.
  return (
    [...NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => isNavItemActive(item.href, pathname)) ?? null
  );
}

function NavLink({ item, collapsed, pathname, onNavigate }) {
  const active = isNavItemActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      // The text label is hidden when collapsed, so the icon needs its own name.
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
        />
      ) : null}
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
    </Link>
  );
}

function SidebarBody({ collapsed, onNavigate, onClose, onToggleCollapsed }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center"
          aria-label="CareerPilot AI dashboard"
        >
          {/* The wordmark is dropped when the rail collapses; the mark
              alone still identifies the product. */}
          {collapsed ? <LogoMark className="h-8 w-8" title="CareerPilot AI" /> : <Logo />}
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            {collapsed ? (
              <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border" />
            ) : (
              <p className="mono-label px-3 pb-2 text-muted-foreground/70">{section.label}</p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    collapsed={collapsed}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-border p-3",
          collapsed && "flex-col"
        )}
      >
        <UserButton afterSignOutUrl="/" />
        <div className={cn("flex items-center gap-1", !collapsed && "ml-auto")}>
          <ThemeToggle />
          {onToggleCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggleCollapsed }) {
  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onMobileClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card/60 backdrop-blur-xl transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <SidebarBody collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      </aside>

      {/* Mobile drawer. The desktop rail is hidden below lg, so without this
          there is no navigation at all on a phone. It never collapses. */}
      {mobileOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 animate-slide-in-left border-r border-border bg-card">
            <SidebarBody collapsed={false} onNavigate={onMobileClose} onClose={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
