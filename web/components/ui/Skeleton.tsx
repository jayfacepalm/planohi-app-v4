import React from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  className = ""
}) => {
  const shapeStyles = {
    text: "h-3 rounded w-1/3",
    circular: "w-10 h-10 rounded-full",
    rectangular: "h-20 rounded-xl w-full",
  };

  return (
    <div
      className={`bg-zinc-800 animate-shimmer motion-reduce:animate-none bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] ${shapeStyles[variant]} ${className}`}
    />
  );
};
