"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";

interface DashboardPaginationProps {
  pageNumber: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const DashboardPagination: React.FC<DashboardPaginationProps> = ({
  pageNumber,
  totalPages,
  totalElements,
  hasNext,
  hasPrevious,
}) => {
  const router = useRouter();

  const handlePageChange = (direction: "prev" | "next") => {
    const params = new URLSearchParams(window.location.search);
    const nextPage = direction === "next" ? pageNumber + 1 : pageNumber - 1;
    params.set("page", nextPage.toString());
    router.push(`?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-6 w-full text-xs font-sans text-zinc-500">
      <span>
        Total of <span className="text-zinc-300 font-medium">{totalElements}</span> workspaces
      </span>

      <div className="flex items-center gap-4">
        <Button
          type="button"
          onClick={() => handlePageChange("prev")}
          disabled={!hasPrevious}
          variant="ghost"
          className="px-3 py-1.5 h-auto text-xs hover:text-white cursor-pointer"
        >
          ← Previous
        </Button>
        <span className="text-zinc-400">
          Page <span className="text-white font-medium">{pageNumber + 1}</span> of <span className="text-white font-medium">{totalPages}</span>
        </span>
        <Button
          type="button"
          onClick={() => handlePageChange("next")}
          disabled={!hasNext}
          variant="ghost"
          className="px-3 py-1.5 h-auto text-xs hover:text-white cursor-pointer"
        >
          Next →
        </Button>
      </div>
    </div>
  );
};
