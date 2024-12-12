import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { SendHorizonal } from "lucide-react";
import React, { FormEvent, useEffect, useRef } from "react";

export default function MessageBox({ sendMessage, messages }: Props) {
  const messageContainer = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const formSubmitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (messageInputRef.current) {
      const message = messageInputRef.current.value?.trim();
      if (message) {
        sendMessage(message);
      }
      messageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (messageContainer.current) {
      messageContainer.current.scrollTop =
        messageContainer.current.scrollHeight;
    }
    // messageContainer.current?.scroll({
    //   top: messageContainer.current?.scrollHeight || 0,
    //   behavior: "smooth",
    // });
  }, [messages.length]);
  return (
    <div className="h-full p-4 flex gap-4 flex-col">
      <h2 className="font-semibold text-xl">Chat ({messages.length})</h2>
      <div ref={messageContainer} className="flex-1 mt-1 overflow-y-auto">
        <div>
          {messages.length === 0 && (
            <p className="text-center opacity-50 text-sm">No data</p>
          )}
          {messages.map((message, index) => {
            return (
              <div
                className="mb-2 bg-secondary px-3 py-2 rounded-md"
                key={`${index + 1}`}
              >
                <p className="font-semibold  text-sm">
                  {message.name}{" "}
                  <span className="opacity-50 text-xs">
                    {" "}
                    {user?.id === message.userId && "(You)"}
                  </span>
                </p>
                <p className="text-xs">{message.message}</p>
              </div>
            );
          })}
        </div>
      </div>
      <form onSubmit={formSubmitHandler} className="flex  items-center gap-2">
        <Input
          ref={messageInputRef}
          className="flex-1 active:outline-0 focus:outline-0"
          placeholder="Type something..."
        />
        <Button type="submit" size="icon">
          <SendHorizonal />
        </Button>
      </form>
    </div>
  );
}

type Props = {
  sendMessage: (message: string) => void;
  messages: Message[];
};
