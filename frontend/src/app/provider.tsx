"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";
import { AuthContextProvider } from "@/context/AuthContext";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export default function Provider({ children }: PropsWithChildren<Props>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthContextProvider>
        <div className="h-screen ">{children}</div>
      </AuthContextProvider>
    </ThemeProvider>
  );
}

interface Props {}
