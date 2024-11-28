"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

export default function Navbar() {
  const { setTheme, theme } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShow(true);
    }, 100);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev == "dark" ? "light" : "dark"));
  };

  return (
    <div className="flex gap-2 items-center ">
      {show && (
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={28} /> : <Moon size={28} />}
        </Button>
      )}
    </div>
  );
}
