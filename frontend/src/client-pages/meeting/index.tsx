"use client";

import AudioPlayer from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
// import { User } from "@/types";
import {
  Expand,
  Fullscreen,
  Maximize,
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
import React, { useEffect, useMemo, useRef, useState } from "react";

type UserType = {
  userId: string;
  name: string;
  email: string;
  accepted: boolean;
};

export default function ClientMeeting({ hostId, meetId, wss }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [fullScreen, setFullScreen] = useState("");
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
  const [mediaStreams, setMediaStreams] = useState<{
    [key: string]: {
      [key: string]: { stream: MediaStream; kind: string; updated: boolean };
    };
  }>({});
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
            track.stop();
          });
        });
      }
    };
  }, [allow]);

  const initiateConnection = (streams: MediaStream[]) => {
    setMediaStreams((prev) => {
      Object.keys(prev).forEach((streamId) => {
        if (prev[streamId]?.audio) {
          prev[streamId].audio.updated = false;
        }
        if (prev[streamId]?.video) {
          prev[streamId].video.updated = false;
        }
      });
      return prev;
    });
    let pc = new RTCPeerConnection();

    pc.ontrack = function (event) {
      setMediaStreams((prev) => {
        prev[event.streams[0].id] = {
          ...(prev[event.streams[0].id] || {}),
          [event.track.kind]: {
            stream: event.streams[0],
            kind: event.track.kind,
            updated: true,
          },
        };
        return { ...prev };
      });

      event.streams[0].onremovetrack = () => {
        setMediaStreams((prev) => {
          delete prev[event.streams[0].id][event.track.kind];
          return { ...prev };
        });
      };

      // document.getElementById(event.track.id)?.remove();
      // if (event.track.kind === "audio") {
      //   let el = document.createElement("audio");
      //   el.srcObject = event.streams[0];
      //   el.autoplay = true;
      //   el.controls = false;
      //   // el.id = event.track.id;
      //   document.getElementById("remoteVideos")?.appendChild(el);

      //   event.track.onmute = function (event) {
      //     el.play();
      //   };

      //   event.streams[0].onremovetrack = ({ track }) => {
      //     document.getElementById(track.id)?.remove();
      //     if (el.parentNode) {
      //       el.parentNode.removeChild(el);
      //     }
      //   };
      //   return;
      // }
      // let el = document.createElement("video");
      // let elName = document.createElement("p");
      // el.srcObject = event.streams[0];
      // el.autoplay = true;
      // el.controls = false;
      // el.className =
      //   "w-[90%] aspect-video object-cover  bg-background rounded-lg";
      // el.muted = true;
      // el.id = event.streams[0].id;
      // elName.innerText = event.streams[0].id;
      // document.getElementById("remoteVideos")?.appendChild(el);
      // document.getElementById("remoteVideos")?.appendChild(elName);

      // event.track.onmute = function (event) {
      //   el.play();
      // };

      // event.streams[0].onremovetrack = ({ track }) => {
      //   document.getElementById("remoteVideos")?.removeChild(el);
      //   document.getElementById("remoteVideos")?.removeChild(elName);
      // };
    };

    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        return pc?.addTrack(track, stream);
      });
    });

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
    };
    ws.onclose = function (evt) {
      console.log("Ws closed");
      // window.alert("Websocket has closed");
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

          setUsers(
            data.users.reduce((prev: any, curr: any) => {
              _users[curr.userId] = true;
              prev[curr.userId] = {
                ...curr,
                accepted: true,
              };
              return prev;
            }, {} as { [key: string]: UserType })
          );
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
            toast({
              title: `${data.name} wants to join`,
              description: data.email,
              action: (
                <ToastAction
                  altText="Try again"
                  onClick={() => {
                    ws.send(
                      JSON.stringify({
                        event: "accept-join-request",
                        data: JSON.stringify({
                          meetingId: meetId,
                          ...data,
                          ...allow,
                        }),
                      })
                    );
                    setUserRequests((prev) => {
                      delete prev[data.userId];
                      return { ...prev };
                    });
                  }}
                  // variant="ghost"
                >
                  Accept
                </ToastAction>
              ),
            });
            // setUserRequests((prev) => {
            //   return {
            //     // ...prev[as].userId,
            //     [data.userId]: {
            //       ...data,
            //       accepted: false,
            //     },
            //   };
            // });
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
            }),
          })
        );
      };
    }
    return pc;
  };

  function joinHandler() {
    setJoining(true);
    socket?.send(
      JSON.stringify({
        event: "join-meeting",
        data: JSON.stringify({
          meetingId: meetId,
          token: localStorage.getItem("token"),
        }),
      })
    );
  }

  const streamingUsers = useMemo(() => {
    return Object.values(tracksMap);
  }, [tracksMap]);

  const mediaButtons = useMemo(() => {
    return (
      <>
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
      </>
    );
  }, [allow]);

  return joinedMeeting ? (
    <div>
      <div
        className="flex flex-wrap p-5 h-screen gap-4 justify-center items-center"
        id="remoteVideos"
      >
        {Object.keys(mediaStreams).map((streamId) => {
          const stream = mediaStreams[streamId];

          if (
            !stream["audio"]?.updated &&
            !stream["video"]?.updated &&
            !users[tracksMap[streamId]]
          ) {
            return null;
          }

          if (!tracksMap[streamId]) {
            return null;
          }

          return (
            <div key={streamId}>
              <div className="relative w-[340px] flex-1 mb-4 md:mb-0 flex justify-center items-center">
                {!stream["video"]?.updated && users[tracksMap[streamId]] && (
                  <div className="w-[90%] aspect-video flex justify-center flex-col items-center object-cover  bg-[#383838] text-white rounded-lg">
                    <User />
                    <h1>{users[tracksMap[streamId]].name}</h1>
                  </div>
                )}

                {stream["video"]?.updated && (
                  <div
                  // onClick={() => {
                  //   setFullScreen((prev) =>
                  //     streamId === prev ? "" : streamId
                  //   );
                  // }}
                  >
                    {/* <div
                      className={`${
                        fullScreen === streamId ? "fixed" : "absolute"
                      }  hidden hover:flex top-0 bottom-0 left-0 right-0  z-20 text-white justify-center items-center `}
                    >
                    
                    </div> */}
                    <VideoPlayer
                      className={`${
                        fullScreen === streamId
                          ? "fixed  z-10 top-0 bottom-0 left-0 right-0"
                          : ""
                      } w-[100%] aspect-video object-cover bg-background rounded-lg`}
                      id={streamId}
                      stream={stream["video"].stream}
                      onRemove={(id) => {
                        setMediaStreams((prev) => {
                          if (prev[id]?.["audio"]) {
                            return {
                              ...prev,
                              [id]: {
                                audio: prev[id]["audio"],
                              },
                            };
                          }
                          delete prev[id];
                          return { ...prev };
                        });
                      }}
                    />
                  </div>
                )}
                {stream["video"]?.updated && users[tracksMap[streamId]] && (
                  <div
                    className={`${
                      fullScreen === streamId ? "fixed" : "absolute"
                    }  bg-[#00000050] text-center w-full px-2 flex text-white items-center justify-between gap-2 top-0 left-0 z-30`}
                  >
                    <p className="text-sm">{users[tracksMap[streamId]].name}</p>
                    {fullScreen === streamId && (
                      <div className="flex items-center gap-1">
                        {mediaButtons}
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setFullScreen((prev) =>
                          prev === streamId ? "" : streamId
                        );
                      }}
                      className="text-white"
                      variant="link"
                    >
                      {fullScreen === streamId ? <Maximize /> : <Expand />}
                    </Button>
                  </div>
                )}
              </div>
              {stream["audio"]?.updated && (
                <AudioPlayer
                  onRemove={(id) => {
                    setMediaStreams((prev) => {
                      if (prev[id]?.["video"]) {
                        return {
                          ...prev,
                          [id]: {
                            audio: prev[id]["video"],
                          },
                        };
                      }
                      delete prev[id];
                      return { ...prev };
                    });
                  }}
                  id={streamId}
                  stream={stream["audio"].stream}
                />
              )}
            </div>
          );
        })}

        {Object.keys(users).map((userId) => {
          if (streamingUsers.includes(userId) && userId !== user?.id) {
            return null;
          }

          const _user = users[userId];
          return (
            <div
              key={userId}
              className="w-[340px] object-cover  bg-[#383838]  aspect-video mb-4 md:mb-0 flex justify-center items-center rounded-lg"
            >
              <div className="flex justify-center flex-col items-center  text-white ">
                <User />
                <h1>
                  {_user.name}
                  {userId === user?.id ? "(You)" : null}
                </h1>
              </div>
            </div>
          );
        })}
      </div>
      {/* <div>
        
        {Object.values(userRequests).map((user) => {
          return (
            <div key={user.userId}>
              <h2>{user.name}</h2>
             
            </div>
          );
        })}
      </div> */}
      <div className="fixed  bottom-0 left-0 right-0 bg-transparent py-3 flex justify-center items-center gap-2  z-10">
        {mediaButtons}
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
