"use client";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { Video } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientHomePage() {
  const [meetingLink, setMeetingLink] = useState("");

  const router = useRouter();

  const { isAuthenticated, toggleShowAuthDialog, apiClient } = useAuth();

  const joinMeetingHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const startInstantMeeting = async () => {
    const { data } = await apiClient.post("/meet");
    router.push(`/${data.data.id}`);
  };

  return (
    <div className="mt-3">
      {!isAuthenticated && (
        <Button onClick={toggleShowAuthDialog}>Signup/Signin</Button>
      )}
      {isAuthenticated && (
        <form onSubmit={joinMeetingHandler} className="flex items-center gap-2">
          <Button type="button" onClick={startInstantMeeting}>
            <Video />
            New meeting
          </Button>
          <Input
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="Enter code or link"
            inputMode="url"
          />
          <Button type="submit" disabled={!meetingLink.trim()} variant="ghost">
            Join
          </Button>
        </form>
      )}
    </div>
  );
}
