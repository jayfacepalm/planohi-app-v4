"use client";

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { fetchApi } from "../../lib/api-client";

export const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetchApi<void>("/auth/logout", {
        method: "POST",
      });
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout request failed:", e);
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant="secondary"
      className="px-6 py-2 text-xs font-semibold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-none hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-300"
    >
      {loading ? "Terminating session..." : "Disconnect Session"}
    </Button>
  );
};
