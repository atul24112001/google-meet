"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { deleteCookie } from "cookies-next";

export default function Navbar() {
  const { setTheme, theme } = useTheme();
  const { isAuthenticated } = useAuth();
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
      {isAuthenticated && (
        <Button
          variant="destructive"
          onClick={() => {
            localStorage.removeItem("token");
            deleteCookie("token");
            window.location.reload();
          }}
        >
          Logout
        </Button>
      )}
    </div>
  );
}
