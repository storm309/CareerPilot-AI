"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/preparation", label: "Prep Tools" },
  { href: "/dashboard/questions", label: "FAQ" },
  { href: "/dashboard/upgrade", label: "Upgrade" },
];

function Header() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating from the mobile sheet should close it.
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  const isActive = (href) =>
    href === "/dashboard" ? path === href : path?.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 p-4">
        <Link href="/dashboard" className="shrink-0" aria-label="CareerPilot AI home">
          <Image
            src="/logo.png"
            width={160}
            height={100}
            alt="CareerPilot AI"
            priority
            className="h-10 w-auto object-contain dark:invert"
          />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "text-sm transition-colors hover:text-primary",
                    isActive(item.href)
                      ? "font-bold text-primary"
                      : "font-medium text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* The old header hid the nav entirely below md with no replacement, so
          every page except the dashboard was unreachable on a phone. */}
      {menuOpen ? (
        <nav aria-label="Mobile" className="border-t border-border md:hidden">
          <ul className="flex flex-col p-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent",
                    isActive(item.href) ? "font-bold text-primary" : "font-medium"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export default Header;
