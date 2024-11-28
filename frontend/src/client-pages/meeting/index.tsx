"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
import { Mic, Mic2, MicOff, User, Video, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function ClientMeeting({ hostId, meetId, wss }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [allow, setAllow] = useState({ audio: true, video: true });
  const [joinedMeeting, setJoinedMeeting] = useState(false);
  const [users, setUsers] = useState<{
    [key: string]: {
      userId: string;
      name: string;
      email: string;
      accepted: boolean;
    };
  }>({});
  const [peerConnection, setPeerConnection] =
    useState<CustomRTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<null | MediaStream>(null);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      connectWss(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const pc = new CustomRTCPeerConnection(crypto.randomUUID());
    setPeerConnection(pc);
  }, []);

  useEffect(() => {
    if (socket && localStream) {
      socket.onmessage = (ev) => {
        const { event, message, data } = JSON.parse(ev.data);
        switch (event) {
          case "error":
            toast({
              title: "Something went wrong",
              description: message,
            });
            break;
          case "offer":
            acceptOffer(data);
            break;
          case "candidate":
            handleIceCandidate(data);
            break;
          case "joining-meeting":
            joinMeeting();
            break;
          case "request-participant-join":
            setUsers((prev) => {
              return {
                ...prev,
                [data.userId]: {
                  ...data,
                  accepted: false,
                },
              };
            });
            break;
        }
      };
    }
  }, [socket, localStream, peerConnection?.id]);

  useEffect(() => {
    if (allow.audio || allow.video) {
      let mediaStream: MediaStream | null = null;
      navigator.mediaDevices.getUserMedia(allow).then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        mediaStream = stream;
      });

      return () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach(function (track) {
            track.stop();
          });
        }
      };
    }
  }, [allow.audio, allow.video, joinedMeeting]);

  function handleIceCandidate(data: any) {
    peerConnection?.addIceCandidate(JSON.parse(data));
  }

  async function joinMeeting() {
    setJoinedMeeting(true);
  }

  async function acceptOffer(data: any) {
    const parsedData = JSON.parse(data);
    if (!peerConnection) {
      return;
    }

    peerConnection.ontrack = function (e) {
      console.log({ remoteTrack: e });
      if (e.track.kind === "audio") {
        return;
      }

      let el = document.createElement("video");
      el.srcObject = e.streams[0];
      el.autoplay = true;
      el.controls = true;
      el.style.aspectRatio = "video";
      document.getElementById("remoteVideos")?.appendChild(el);

      e.track.onmute = function (event) {
        el.play();
      };

      e.streams[0].onremovetrack = ({ track }) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      };
    };

    peerConnection.onicecandidate = (e) => {
      if (!e.candidate) {
        return;
      }

      socket?.send(
        JSON.stringify({
          event: "candidate",
          data: JSON.stringify({
            candidate: e.candidate,
            meetId,
          }),
        })
      );
    };
    peerConnection.setRemoteDescription(parsedData.offer);
    peerConnection.createAnswer(data.offer).then((answer) => {
      peerConnection.setLocalDescription(answer);
      socket?.send(
        JSON.stringify({
          event: "answer",
          data: JSON.stringify({
            meetId,
            answer: answer,
          }),
        })
      );
    });

    peerConnection.getSenders().forEach((sender) => {
      peerConnection.removeTrack(sender);
    });

    console.log({ localStream });
    localStream?.getTracks().forEach((track) => {
      console.log({ track });
      peerConnection.addTrack(track, localStream);
    });
  }

  function connectWss(retry: number) {
    if (retry < 5) {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_URL}/websocket`);
      ws.onclose = (e) => {
        console.log(e);
        connectWss(retry + 1);
      };

      ws.onerror = (e) => {
        console.log(e);
      };
      ws.onopen = () => {
        setSocket(ws);
      };
    }
  }

  function joinHandler() {
    console.log("Joinging meeting ", meetId);
    socket?.send(
      JSON.stringify({
        event: "join-meeting",
        data: JSON.stringify({
          meetingId: meetId,
          token: localStorage.getItem("token"),
          audio: allow.audio,
          video: allow.video,
        }),
      })
    );
  }

  // if (!isAuthenticated) {
  //   router.replace("/");
  //   return null;
  // }

  return joinedMeeting ? (
    <div>
      <h1>hii</h1>
      <div id="remoteVideos"></div>
      <div>
        {Object.keys(users).map((userId) => {
          const user = users[userId];
          return (
            <div key={userId}>
              <h2>{user.name}</h2>
              {!user.accepted && (
                <button
                  onClick={() => {
                    socket?.send(
                      JSON.stringify({
                        event: "accept-join-request",
                        data: JSON.stringify({
                          meetingId: meetId,
                          ...user,
                          ...allow,
                        }),
                      })
                    );
                    setUsers((prev) => {
                      prev[userId].accepted = true;
                      return { ...prev };
                    });
                  }}
                >
                  Accept
                </button>
              )}
            </div>
          );
        })}
      </div>
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
  ) : (
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
          <Button onClick={joinHandler}>
            {hostId === user?.id ? "Join" : "Request to join"}
          </Button>
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

class CustomRTCPeerConnection extends RTCPeerConnection {
  id: string;
  constructor(id: string, configuration?: RTCConfiguration) {
    super(configuration);
    this.id = id;
  }
}
