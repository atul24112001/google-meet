"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
// import { User } from "@/types";
import { Mic, Mic2, MicOff, User, Video, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

type UserType = {
  userId: string;
  name: string;
  email: string;
  accepted: boolean;
};

export default function ClientMeeting({ hostId, meetId, wss }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [allow, setAllow] = useState({ audio: true, video: true });
  const [joinedMeeting, setJoinedMeeting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [users, setUsers] = useState<{
    [key: string]: UserType;
  }>({});
  const [userRequests, setUserRequests] = useState<{
    [key: string]: UserType;
  }>({});

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  const { user } = useAuth();

  useEffect(() => {
    if (joinedMeeting) {
      return () => {
        try {
          socket?.send(
            JSON.stringify({
              event: "leave",
              data: {
                meetingId: meetId,
              },
            })
          );
        } catch (error) {
          console.log(error);
        }
      };
    }
  }, [joinedMeeting]);

  useEffect(() => {
    if (allow.audio || allow.video) {
      let mediaStream: MediaStream | null = null;
      let pc: null | RTCPeerConnection = null;
      navigator.mediaDevices.getUserMedia(allow).then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        pc = new RTCPeerConnection();
        mediaStream = stream;

        pc.ontrack = function (event) {
          if (event.track.kind === "audio") {
            let el: any = document.createElement(event.track.kind);
            el.srcObject = event.streams[0];
            el.autoplay = true;
            el.controls = false;
            document.getElementById("remoteVideos")?.appendChild(el);

            event.track.onmute = function (event) {
              el.play();
            };

            event.streams[0].onremovetrack = ({ track }) => {
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
            };
            return;
          }
          let el: any = document.createElement(event.track.kind);
          el.srcObject = event.streams[0];
          el.autoplay = true;
          el.controls = false;
          el.muted = true;
          document.getElementById("remoteVideos")?.appendChild(el);

          event.track.onmute = function (event) {
            el.play();
          };

          event.streams[0].onremovetrack = ({ track }) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          };
        };

        stream.getTracks().forEach((track) => pc?.addTrack(track, stream));
        const ws = new WebSocket(
          `${process.env.NEXT_PUBLIC_API_URL}/websocket`
        );

        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            return;
          }
          ws.send(
            JSON.stringify({
              event: "candidate",
              data: JSON.stringify({
                candidate: e.candidate,
                meetId,
              }),
            })
          );
        };

        ws.onopen = () => setSocket(ws);
        ws.onclose = function (evt) {
          window.alert("Websocket has closed");
        };

        ws.onmessage = function (ev) {
          const { event, message, data } = JSON.parse(ev.data);
          switch (event) {
            case "error":
              toast({
                title: "Something went wrong",
                description: message,
              });
              break;
            case "offer":
              const { offer } = data;
              pc?.setRemoteDescription(JSON.parse(offer).offer);
              pc?.createAnswer().then((answer) => {
                pc?.setLocalDescription(answer);
                ws.send(
                  JSON.stringify({
                    event: "answer",
                    data: JSON.stringify({
                      meetId,
                      answer: answer,
                    }),
                  })
                );
              });
              setUsers((prev) => {
                return data.users.map((u: UserType) => ({
                  ...u,
                  accepted: true,
                }));
              });
              setJoinedMeeting(true);
              break;
            case "candidate":
              try {
                pc?.addIceCandidate(JSON.parse(data));
              } catch (error) {
                console.log(error);
              }
              break;
            case "joining-meeting":
              setJoinedMeeting(true);
              setJoining(false);

              break;
            case "request-participant-join":
              setUserRequests((prev) => {
                return {
                  ...prev,
                  [data.userId]: {
                    ...data,
                    accepted: false,
                  },
                };
              });
              break;
            case "new-participant":
              setUsers((prev) => {
                return {
                  ...prev,
                  [data.userId]: {
                    ...data,
                    accepted: true,
                  },
                };
              });
            case "disconnect":
              setUsers((prev) => {
                delete prev[data.userId];
                return { ...prev };
              });
            default:
          }
        };
        if (joinedMeeting) {
          ws.onopen = () => {
            ws.send(
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
          };
        }
      });

      return () => {
        // if (pc) {
        //   pc.close();
        // }
        if (mediaStream) {
          mediaStream.getTracks().forEach(function (track) {
            track.stop();
          });
        }
      };
    }
  }, [allow.audio, allow.video]);

  function joinHandler() {
    setJoining(true);
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
            </div>
          );
        })}

        {Object.values(userRequests).map((user) => {
          return (
            <div key={user.userId}>
              <h2>{user.name}</h2>
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
                  setUserRequests((prev) => {
                    delete prev[user.userId];
                    return { ...prev };
                  });
                }}
              >
                Accept
              </button>
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
          <Button disabled={joining} onClick={joinHandler}>
            {joining
              ? "Joining.."
              : hostId === user?.id
              ? "Join"
              : "Request to join"}
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

// class CustomRTCPeerConnection extends RTCPeerConnection {
//   id: string;
//   constructor(id: string, configuration?: RTCConfiguration) {
//     super(configuration);
//     this.id = id;
//   }
// }
