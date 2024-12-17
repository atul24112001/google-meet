"use client";

import React, { PropsWithChildren } from "react";
import { AuthContextProvider } from "@/context/AuthContext";
import { User } from "@prisma/client";

export default function Provider({
  children,
  authPayload,
}: PropsWithChildren<Props>) {
  return (
    <AuthContextProvider authPayload={authPayload}>
      <div className="h-screen">{children}</div>
    </AuthContextProvider>
  );
}

type Props = {
  authPayload: { data: User; token: string } | null;
};
