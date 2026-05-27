"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export const SearchInput: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset page on new search
      router.push(`?${params.toString()}`);
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [query, router]);

  return (
    <div className="relative w-full max-w-sm">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
        <Search className="w-4 h-4" />
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search event workspaces..."
        className="w-full bg-[#121214] border border-white/10 hover:border-white/15 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-xl pl-10 pr-4 py-2 text-white placeholder-zinc-500 focus:outline-none transition-all font-sans text-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
