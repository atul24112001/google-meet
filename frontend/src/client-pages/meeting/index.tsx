"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
// import { User } from "@/types";
import {
  Mic,
  Mic2,
  MicOff,
  MonitorUp,
  MonitorX,
  ScreenShare,
  ScreenShareOff,
  User,
  Video,
  VideoOff,
} from "lucide-react";
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
  const [allow, setAllow] = useState({
    audio: true,
    video: true,
    shareScreen: false,
  });
  const [joinedMeeting, setJoinedMeeting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [users, setUsers] = useState<{
    [key: string]: UserType;
  }>({});
  const [userRequests, setUserRequests] = useState<{
    [key: string]: UserType;
  }>({});
  const [tracksMap, setTracksMap] = useState<{ [key: string]: string }>({});

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
    let pc: null | RTCPeerConnection = null;

    document.getElementById("remoteVideos")?.childNodes.forEach((node) => {
      document.getElementById("remoteVideos")?.removeChild(node);
    });
    const streams: MediaStream[] = [];

    (async () => {
      if (allow.shareScreen) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        streams.push(stream);
      }

      if (allow.audio || allow.video) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: allow.audio,
          video: allow.video,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        streams.push(stream);
      }
      pc = initiateConnection(streams);
    })();

    // if (!allow.audio && !allow.video) {
    //   pc = initiateConnection([]);
    // } else if(allow.shareScreen){
    //   navigator.mediaDevices.getDisplayMedia({
    //     audio: true,
    //     video: true,
    //   }).then((stream) => {
    //     pc = initiateConnection([stream]);
    //     mediaStream = stream;
    //   })
    // } else {
    //   navigator.mediaDevices.getUserMedia({audio: allow.audio, video: allow.video}).then((stream) => {
    // if (localVideoRef.current) {
    //   localVideoRef.current.srcObject = stream;
    // }

    //     pc = initiateConnection([stream]);
    //     mediaStream = stream;
    //   });
    // }

    return () => {
      if (pc) {
        pc.getSenders().forEach((sender) => {
          pc?.removeTrack(sender);
        });
        pc?.close();
      }
      if (streams.length > 0) {
        streams.forEach((mediaStream) => {
          mediaStream.getTracks().forEach(function (track) {
            document.getElementById(track.id)?.remove();
            track.stop();
          });
        });
      }
    };
  }, [allow]);

  const initiateConnection = (streams: MediaStream[]) => {
    let pc = new RTCPeerConnection();

    pc.ontrack = function (event) {
      // setMediaStream(prev => {
      // event.streams[0].id
      // })
      document.getElementById(event.track.id)?.remove();
      if (event.track.kind === "audio") {
        let el = document.createElement("audio");
        el.srcObject = event.streams[0];
        el.autoplay = true;
        el.controls = false;
        // el.id = event.track.id;
        document.getElementById("remoteVideos")?.appendChild(el);

        event.track.onmute = function (event) {
          el.play();
        };

        event.streams[0].onremovetrack = ({ track }) => {
          document.getElementById(track.id)?.remove();
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        };
        return;
      }
      let el = document.createElement("video");
      let elName = document.createElement("p");
      el.srcObject = event.streams[0];
      el.autoplay = true;
      el.controls = false;
      el.className =
        "w-[90%] aspect-video object-cover  bg-background rounded-lg";
      el.muted = true;
      el.id = event.streams[0].id;
      elName.innerText = event.streams[0].id;
      document.getElementById("remoteVideos")?.appendChild(el);
      document.getElementById("remoteVideos")?.appendChild(elName);

      event.track.onmute = function (event) {
        el.play();
      };

      event.streams[0].onremovetrack = ({ track }) => {
        document.getElementById("remoteVideos")?.removeChild(el);
        document.getElementById("remoteVideos")?.removeChild(elName);
      };
    };

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_URL}/websocket`);

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

    ws.onopen = () => {
      setSocket(ws);
      streams.forEach((stream) => {
        stream.getTracks().forEach((track) => {
          ws.send(
            JSON.stringify({
              event: "new-track",
              data: JSON.stringify({
                meetingId: meetId,
                userId: user?.id,
                trackId: track.id,
              }),
            })
          );
          return pc?.addTrack(track, stream);
        });
      });
    };
    ws.onclose = function (evt) {
      window.alert("Websocket has closed");
    };

    ws.onmessage = function (ev) {
      let _users: { [key: string]: boolean } = {};
      Object.keys(users).forEach((id) => {
        _users[id] = true;
      });
      const { event, message, data } = JSON.parse(ev.data);
      switch (event) {
        case "error":
          setJoining(false);
          toast({
            title: "Something went wrong",
            description: message,
          });
          break;
        case "offer":
          const { offer } = data;
          pc?.setRemoteDescription(JSON.parse(offer).offer)
            .then(() => {
              pc?.createAnswer()
                .then((answer) => {
                  pc?.setLocalDescription(answer);
                  ws.send(
                    JSON.stringify({
                      event: "answer",
                      data: JSON.stringify({
                        meetId,
                        answer: answer,
                        audio: localStorage.getItem("audio") !== "false",
                        video: localStorage.getItem("video") !== "false",
                      }),
                    })
                  );
                })
                .catch(console.log);
            })
            .catch(console.log);
          setUsers((prev) => {
            return data.users.map((u: UserType) => {
              _users[u.userId] = true;
              return { ...u, accepted: true };
            });
          });
          setTracksMap(data.tracks);
          setJoinedMeeting(true);
          break;
        case "candidate":
          pc?.addIceCandidate(JSON.parse(data)).catch((err) => {
            console.log(err);
          });
          break;
        case "joining-meeting":
          setJoinedMeeting(true);
          setJoining(false);

          break;
        case "request-participant-join":
          if (_users[data.userId]) {
            ws.send(
              JSON.stringify({
                event: "join-meeting",
                data: JSON.stringify({
                  meetingId: meetId,
                  token: localStorage.getItem("token"),
                }),
              })
            );
          } else {
            setUserRequests((prev) => {
              return {
                ...prev,
                [data.userId]: {
                  ...data,
                  accepted: false,
                },
              };
            });
          }
          break;
        case "new-participant":
          _users[data.userId] = true;
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
          _users[data.userId] = false;
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
              // audio: allow.audio,
              // video: allow.video,
            }),
          })
        );
      };
    }
    return pc;
  };

  // useEffect(() => {
  // if (allow.audio || allow.video) {
  //   socket?.send(
  //     JSON.stringify({
  //       event: "change-track",
  //       data: JSON.stringify({
  //         audio: allow.audio,
  //         video: allow.video,
  //         meetingId: meetId,
  //       }),
  //     })
  //   );
  //   localStorage.setItem("audio", `${allow.audio}`);
  //   localStorage.setItem("video", `${allow.video}`);
  // }
  // }, [allow.audio, allow.video]);

  function joinHandler() {
    setJoining(true);
    socket?.send(
      JSON.stringify({
        event: "join-meeting",
        data: JSON.stringify({
          meetingId: meetId,
          token: localStorage.getItem("token"),
          // audio: allow.audio,
          // video: allow.video,
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
      <div
        className="flex flex-wrap gap-4 justify-center items-center"
        id="remoteVideos"
      ></div>
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
      <div className="fixed  bottom-0 left-0 right-0 bg-transparent py-3 flex justify-center items-center gap-2  z-10">
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
        <Button
          onClick={() => {
            setAllow((prev) => ({ ...prev, shareScreen: !prev.shareScreen }));
          }}
          size="icon"
          variant="ghost"
        >
          {allow.shareScreen ? <MonitorX /> : <MonitorUp />}
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
