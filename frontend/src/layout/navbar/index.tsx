"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import React from "react";
import { Sun, SunMoon } from "lucide-react";

export default function Navbar() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    setTheme((prev) => (prev == "dark" ? "light" : "dark"));
  };
  return (
    <div className="flex gap-2 items-center ">
      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        {theme === "dark" ? <Sun size={28} /> : <SunMoon size={28} />}
      </Button>
    </div>
  );
}
