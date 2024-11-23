"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import React from "react";

export default function ClientHomePage() {
  const { isAuthenticated, toggleShowAuthDialog } = useAuth();
  return (
    <div className="mt-3">
      {!isAuthenticated && (
        <Button onClick={toggleShowAuthDialog}>Signup/Signin</Button>
      )}
    </div>
  );
}
