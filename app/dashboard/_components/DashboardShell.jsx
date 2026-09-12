"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Sidebar, { currentNavItem } from "./Sidebar";

const STORAGE_KEY = "careerpilot:sidebar-collapsed";

// Routes that are not sidebar destinations still need a readable title.
const SUB_PAGE_TITLES = [
  { match: /\/interview\/[^/]+\/start$/, title: "Interview in progress", parent: "Dashboard" },
  { match: /\/interview\/[^/]+\/feedback$/, title: "Feedback", parent: "Dashboard" },
  { match: /\/interview\/[^/]+$/, title: "Interview setup", parent: "Dashboard" },
];

function resolveHeading(pathname) {
  const subPage = SUB_PAGE_TITLES.find((entry) => entry.match.test(pathname ?? ""));
  if (subPage) return { title: subPage.title, parent: subPage.parent };

  const navItem = currentNavItem(pathname);
  return { title: navItem?.label ?? "Dashboard", parent: null };
}

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // localStorage does not exist on the server, and reading it during render
  // would make the markup disagree with what React hydrates.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Blocked storage: the expanded default is fine.
    }
    setHydrated(true);
  }, []);

  // Navigating from the drawer should close it.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // The drawer is a modal layer; the page behind it must not scroll.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Not worth surfacing; the preference just will not persist.
      }
      return next;
    });
  };

  const isCollapsed = hydrated && collapsed;
  const { title, parent } = resolveHeading(pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Chrome is dropped when the feedback report is printed to PDF. */}
      <div data-print-hide>
        <Sidebar
          collapsed={isCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>

      <div
        className={cn(
          "transition-[padding] duration-200",
          isCollapsed ? "lg:pl-[68px]" : "lg:pl-60"
        )}
      >
        <header data-print-hide className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-2 text-sm">
              {parent ? (
                <>
                  <li>
                    <Link
                      href="/dashboard"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {parent}
                    </Link>
                  </li>
                  <li aria-hidden className="text-muted-foreground/40">
                    /
                  </li>
                </>
              ) : null}
              <li className="truncate font-semibold" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
