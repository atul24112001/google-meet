"use client";

import React, { PropsWithChildren } from "react";
import { AuthContextProvider } from "@/context/AuthContext";

export default function Provider({ children }: PropsWithChildren) {
  return (
    <AuthContextProvider>
      <div className="h-screen">{children}</div>
    </AuthContextProvider>
  );
}
