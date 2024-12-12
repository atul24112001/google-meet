"use client";
import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function ClientHomePage() {
  const [meetingLink, setMeetingLink] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const { isAuthenticated, toggleShowAuthDialog, apiClient } = useAuth();

  const joinMeetingHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pattern =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
    const linkParts = meetingLink.split("/");
    if (!pattern.test(meetingLink) || linkParts.length == 0) {
      toast({
        title: "Something went wrong",
        description: "Invalid meeting link/code",
      });
      return;
    }
    const id = linkParts[linkParts.length - 1];
    router.push(`/${id}`);
  };

  const startInstantMeeting = async () => {
    try {
      const { data } = await apiClient.post("/meet");
      router.push(`/${data.data.meetId}`);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="mt-3">
      {!isAuthenticated && (
        <Button onClick={toggleShowAuthDialog}>Signup/Signin</Button>
      )}
      {isAuthenticated && (
        <form
          onSubmit={joinMeetingHandler}
          className="lg:flex items-center gap-2"
        >
          <Button
            type="button"
            className=" w-full lg:w-fit mb-2 lg:mb-0"
            onClick={startInstantMeeting}
          >
            <Video />
            New meeting
          </Button>
          <div className="flex flex-1 gap-2 items-center">
            <Input
              className="w-full"
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="Enter code or link"
              inputMode="url"
            />
            <Button
              type="submit"
              disabled={!meetingLink.trim()}
              variant="ghost"
            >
              Join
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
