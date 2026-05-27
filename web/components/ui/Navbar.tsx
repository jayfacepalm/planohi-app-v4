"use client";

import React from "react";
import Link from "next/link";
import { Button } from "./Button";

interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface NavbarProps {
  title?: string;
  navItems?: NavItem[];
  actions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  title = "PLANO.HI",
  navItems = [],
  actions
}) => {
  const defaultActions = (
    <>
      <Button variant="secondary" className="px-4 py-1.5 text-xs h-auto">
        API Docs
      </Button>
      <Button variant="primary" className="px-4 py-1.5 text-xs h-auto">
        Sign In
      </Button>
    </>
  );

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#070708]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/">
            <span className="text-xl font-heading font-bold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent tracking-wider cursor-pointer">
              {title}
            </span>
          </Link>
          {navItems && navItems.length > 0 && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              {navItems.map((item, index) => {
                const href = item.href || "#";
                if (item.active) {
                  return (
                    <Link
                      key={index}
                      href={href}
                      className="text-neon-cyan cursor-pointer transition-colors relative after:content-[''] after:absolute after:bottom-[-20px] after:left-0 after:right-0 after:h-[2px] after:bg-neon-cyan"
                    >
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={index}
                    href={href}
                    className="hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {actions !== undefined ? actions : defaultActions}
        </div>
      </div>
    </nav>
  );
};
