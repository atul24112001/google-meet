import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Video,
  VideoOff,
} from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";

export default function MediaController({ allow, setAllow }: Props) {
  return (
    <>
      <Button
        onClick={() => {
          setAllow((prev) => ({ ...prev, audio: !prev.audio }));
        }}
        size="icon"
        variant={allow.audio ? "ghost" : "destructive"}
      >
        {allow.audio ? <Mic /> : <MicOff />}
      </Button>
      <Button
        onClick={() => {
          setAllow((prev) => ({ ...prev, video: !prev.video }));
        }}
        size="icon"
        variant={allow.video ? "ghost" : "destructive"}
      >
        {allow.video ? <Video /> : <VideoOff />}
      </Button>
      <Button
        onClick={() => {
          setAllow((prev) => ({ ...prev, shareScreen: !prev.shareScreen }));
        }}
        size="icon"
        variant="ghost"
      >
        {allow.shareScreen ? <MonitorX /> : <MonitorUp />}
      </Button>
    </>
  );
}

type Props = {
  allow: Allow;
  setAllow: Dispatch<SetStateAction<Allow>>;
};
