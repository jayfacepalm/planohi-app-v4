"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { fetchApi } from "../../lib/api-client";

interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface NavbarProps {
  title?: string;
  navItems?: NavItem[];
  actions?: React.ReactNode;
  userAlias?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  title = "PLANO.HI",
  navItems = [],
  actions,
  userAlias
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetchApi<void>("/auth/logout", {
        method: "POST",
      });
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout request failed:", e);
      window.location.href = "/login";
    } finally {
      setLogoutLoading(false);
    }
  };

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

  const initials = userAlias ? userAlias.slice(0, 2).toUpperCase() : "";

  const profileDropdown = (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/5 bg-[#0f0f15]/40 hover:bg-[#161622]/60 focus:outline-none focus:ring-1 focus:ring-neon-cyan/50 transition-all duration-300 group cursor-pointer"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        id="profile-menu-button"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan flex items-center justify-center text-white text-xs font-semibold font-heading shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300">
          {initials}
        </div>
        <span className="hidden sm:inline text-xs font-medium text-zinc-300 group-hover:text-white transition-colors duration-300 max-w-[120px] truncate">
          {userAlias}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#070708]/95 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none">
          <div className="px-4 py-2 border-b border-white/5 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Active Profile</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">{userAlias}</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 mt-1.5 uppercase tracking-wide">
              Curator
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {logoutLoading ? "Disconnecting..." : "Disconnect Session"}
          </button>
        </div>
      )}
    </div>
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
          {userAlias ? profileDropdown : (actions !== undefined ? actions : defaultActions)}
        </div>
      </div>
    </nav>
  );
};
