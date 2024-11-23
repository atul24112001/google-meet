"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";
import { AuthContextProvider } from "@/context/AuthContext";

export default function Provider({ children }: PropsWithChildren<Props>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthContextProvider>
        <div className="h-screen ">{children}</div>
      </AuthContextProvider>
    </NextThemesProvider>
  );
}

interface Props {}
