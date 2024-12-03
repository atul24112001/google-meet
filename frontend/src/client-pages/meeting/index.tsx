"use client";

import AudioPlayer from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
import "webrtc-adapter";
import {
  Expand,
  Maximize,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Phone,
  User,
  Video,
  VideoOff,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UserType = {
  userId: string;
  name: string;
  email: string;
  accepted: boolean;
};

export default function ClientMeeting({ hostId, meetId, wss }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

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
  const [tracksMap, setTracksMap] = useState<{ [key: string]: string }>({});

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [mediaStreams, setMediaStreams] = useState<{
    [key: string]: {
      [key: string]: { stream: MediaStream; kind: string; updated: boolean };
    };
  }>({});

  const router = useRouter();

  const { toast } = useToast();

  const { user } = useAuth();

  useEffect(() => {
    if (joinedMeeting) {
      return () => {
        try {
          stream.current?.getTracks().forEach((t) => t.stop());
          socket?.send(
            JSON.stringify({
              event: "leave",
              data: "",
            })
          );
        } catch (error) {
          console.log(error);
        }
      };
    }
  }, [joinedMeeting]);

  useEffect(() => {
    (async () => {
      pc.current = await initiateConnection();

      return () => {
        pc.current?.close();
      };
    })();
  }, [allow.shareScreen, allow.video]);

  // useEffect(() => {
  //   return () => {
  //     if (stream.current) {
  //       console.log("Removing");
  //       stream.current.getTracks().forEach((t) => t.stop());
  //     }
  //   };
  // }, [stream.current]);

  useEffect(() => {
    if (stream.current) {
      const audioTracks = stream.current.getAudioTracks();
      const videoTracks = stream.current.getVideoTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = allow.audio;
      }
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = allow.video;
      }
    }
  }, [allow.video, allow.audio]);

  const handleIncomingMessages = (ws: WebSocket, _pc: RTCPeerConnection) => {
    ws.onmessage = (ev) => {
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
        case "answer":
          // const _answer = new RTCSessionDescription();

          _pc?.setRemoteDescription(JSON.parse(data)).catch(console.log);
          break;
        case "offer":
          const { offer } = data;
          (async () => {
            try {
              if (_pc?.signalingState !== "stable") {
                console.warn("Signaling state not stable. Resetting...");
                // _pc.iceGatheringState === "complete"

                await _pc?.setLocalDescription({ type: "rollback" });
              }
              // const _offer = new RTCSessionDescription(offer);
              // const _offer = sdp.parseSctpDescription(JSON.parse(offer).sdp);

              // const isValidOffer = sdp.isValidSDP(_offer);
              // if (!isValidOffer) {
              //   console.log("invalid sdp");
              //   toast({
              //     title: "Invalid sdp",
              //   });
              //   return;
              // }
              // console.log({ _offer });
              await pc.current?.setRemoteDescription(JSON.parse(offer));
              const answer = await pc.current?.createAnswer();
              await pc.current?.setLocalDescription(answer);

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
            } catch (error) {
              console.log("267", error);
            }
          })();

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
          if (_pc?.remoteDescription) {
            _pc?.addIceCandidate(JSON.parse(data)).catch((err) => {
              console.log(err);
            });
          }
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
                  }}
                >
                  Accept
                </ToastAction>
              ),
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
  };

  const initiateConnection = async () => {
    setMediaStreams({});
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    const _mainStream = new MediaStream();
    const _stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: allow.shareScreen ? false : allow.video,
    });

    if (allow.shareScreen) {
      const _screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      _screenStream.getTracks().forEach((track) => {
        _mainStream.addTrack(track);
        // _screenStream.removeTrack(track);
      });
    }

    _stream.getTracks().forEach((track) => {
      _mainStream.addTrack(track);
      // _stream.removeTrack(track);
    });

    const _pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
            "stun:stun.services.mozilla.com",
          ],
        },
      ],
      iceCandidatePoolSize: 10,
    });

    _pc.ontrack = function (event) {
      console.log(`Getting ${event.track.kind} track: `, event.track.id);
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
    };

    const _audioTrack = _mainStream.getAudioTracks()[0];
    _pc.addTrack(_audioTrack, _mainStream);

    if (allow.video || allow.shareScreen) {
      const _videoTrack = _mainStream.getVideoTracks()[0];
      _pc.addTrack(_videoTrack, _mainStream);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = _mainStream;
    }

    stream.current = _mainStream;

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_URL}/websocket`);

    _pc.onicecandidate = (e) => {
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
      // }
    };

    ws.onopen = () => {
      setSocket(ws);
    };
    ws.onclose = function (evt) {
      console.log("Ws closed");
    };

    handleIncomingMessages(ws, _pc);
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

    return _pc;
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

  function disconnect() {
    pc.current?.close();
    stream.current?.getTracks().forEach((t) => {
      t.stop();
    });
    socket?.send(
      JSON.stringify({
        event: "leave",
        data: "",
      })
    );
    router.push("/");
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
                  <div className="w-[100%] aspect-video flex justify-center flex-col items-center object-cover  bg-[#383838] text-white rounded-lg">
                    <User />
                    <h1>{users[tracksMap[streamId]].name}</h1>
                  </div>
                )}

                {stream["video"]?.updated && (
                  <div>
                    <VideoPlayer
                      className={`${
                        fullScreen === streamId
                          ? "fixed  z-20 top-0 bottom-0 left-0 right-0"
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
                      fullScreen === streamId ? "fixed z-30" : "absolute z-10"
                    }  bg-[#00000050] text-center w-full px-2 flex text-white items-center justify-between gap-2 top-0 left-0 `}
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
      <div className="fixed  bottom-0 left-0 right-0 bg-transparent py-3 flex justify-center items-center gap-2  z-10">
        {mediaButtons}
        <Button onClick={disconnect} size="icon" variant="destructive">
          <Phone />
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
