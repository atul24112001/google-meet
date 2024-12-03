import { Button } from "@/components/ui/button";
import { MessageSquare, MessageSquareOff, Phone } from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";
import MediaController from "./media-controller";

export default function Footer({
  disconnect,
  toggleMessages,
  allow,
  setAllow,
  showMessages,
}: Props) {
  return (
    <div className="py-3 flex justify-center items-center gap-2 border-t-[2px] border-secondary  z-10">
      <MediaController allow={allow} setAllow={setAllow} />
      <Button onClick={toggleMessages} size="icon" variant="ghost">
        {showMessages ? <MessageSquareOff /> : <MessageSquare />}
      </Button>
      <Button onClick={disconnect} size="icon" variant="destructive">
        <Phone />
      </Button>
    </div>
  );
}

type Props = {
  disconnect: () => void;
  toggleMessages: () => void;
  allow: Allow;
  showMessages: boolean;
  setAllow: Dispatch<SetStateAction<Allow>>;
};

type Allow = { audio: boolean; video: boolean; shareScreen: boolean };
