"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/layout/navbar";
import { Mic, Mic2, MicOff, User, Video, VideoOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export default function ClientMeeting({ hostId, meetId, wss }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [allow, setAllow] = useState({ audio: true, video: true });

  const { user } = useAuth();

  useEffect(() => {
    if (allow.audio || allow.video) {
      let mediaStream: MediaStream | null = null;
      navigator.mediaDevices.getUserMedia(allow).then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          mediaStream = stream;
        }
      });

      return () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach(function (track) {
            track.stop();
          });
        }
      };
    }
  }, [allow]);

  return (
    <>
      <nav className="flex w-[90%] m-auto justify-between items-center  py-3">
        <h1 className="md:text-2xl font-bold">
          <span className="text-purple-500">Google</span>&nbsp;Meet
        </h1>
        <Navbar />
      </nav>
      <div className="m-3 h-[80%]  md:flex gap-3 items-center">
        <div className="relative  flex-1 mb-4 md:mb-0 flex justify-center items-center">
          {!allow.video && (
            <div className="w-[90%] aspect-video flex justify-center flex-col items-center object-cover  bg-[#383838] text-white rounded-lg">
              <User />
              <h1>{user?.name}(You)</h1>
            </div>
          )}
          {allow.video && (
            <video
              className="w-[90%] aspect-video object-cover  bg-background rounded-lg"
              ref={localVideoRef}
              width="160"
              height="120"
              autoPlay
              muted
            ></video>
          )}
          <div className="absolute flex text-white items-center justify-center gap-2 bottom-2 z-10">
            <Button
              onClick={() => {
                setAllow((prev) => ({ ...prev, audio: !prev.audio }));
              }}
              size="icon"
              variant="ghost"
            >
              {allow.audio ? <Mic /> : <MicOff />}
            </Button>
            <Button
              onClick={() => {
                setAllow((prev) => ({ ...prev, video: !prev.video }));
              }}
              size="icon"
              variant="ghost"
            >
              {allow.video ? <Video /> : <VideoOff />}
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3 justify-center items-center">
          <h1 className="text-2xl">Ready to Join ?</h1>
          <Button>{hostId === user?.id ? "Join" : "Request to join"}</Button>
        </div>
      </div>
    </>
  );
}

type Props = {
  meetId: string;
  hostId: string;
  wss: string;
};
