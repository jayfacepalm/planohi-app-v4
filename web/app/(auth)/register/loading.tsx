import React from "react";
import { Skeleton } from "../../../components/ui/Skeleton";
import { GlowCard } from "../../../components/ui/GlowCard";

export default function RegisterLoading() {
  return (
    <div className="w-full max-w-md">
      <GlowCard header="02 / SIGN UP (Step 1 of 2)">
        <div className="space-y-6 py-2">
          {/* Header Skeleton */}
          <div className="text-center mb-6 flex flex-col items-center">
            <Skeleton variant="text" className="h-7 w-56 mb-2" />
            <Skeleton variant="text" className="h-3 w-64" />
          </div>

          {/* Form Input 1 (Email) */}
          <div className="space-y-2">
            <Skeleton variant="text" className="h-3 w-24" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>

          {/* Form Input 2 (Alias) */}
          <div className="space-y-2">
            <Skeleton variant="text" className="h-3 w-32" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>

          {/* Form Input 3 (Password) */}
          <div className="space-y-2">
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>

          {/* Form Input 4 (Confirm Password) */}
          <div className="space-y-2">
            <Skeleton variant="text" className="h-3 w-28" />
            <Skeleton variant="rectangular" className="h-10 rounded-xl" />
          </div>

          {/* Button */}
          <Skeleton variant="rectangular" className="h-11 rounded-xl mt-4" />

          {/* Footer link */}
          <div className="flex justify-center pt-2">
            <Skeleton variant="text" className="h-3 w-44" />
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
