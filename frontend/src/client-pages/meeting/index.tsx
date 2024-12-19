"use client";

import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import "webrtc-adapter";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Footer from "./footer";
import JoinScreen from "./join-screen";
import MediaPanel from "./media-pannel";
import { useAuth } from "@/context/AuthContext";
import MessageBox from "./message-box";
import { getCookie } from "cookies-next/client";
import { useRouter } from "next/navigation";

export default function ClientMeeting({
  hostId,
  meetId,
  videoAllowed,
  audioAllowed,
  screenShareAllowed,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const router = useRouter();

  const [allow, setAllow] = useState({
    audio: true,
    video: true,
    shareScreen: false,
  });
  const [joinedMeeting, setJoinedMeeting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [users, setUsers] = useState<Users>({});
  const [tracksMap, setTracksMap] = useState<TrackMap>({});

  // const [socket, setSocket] = useState<WebSocket | null>(null);
  const [mediaStreams, setMediaStreams] = useState<MediaStreamMap>({});
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [processedOffer, setProcessedOffer] = useState(false);
  const [iceCandidateQueue, setIceCandidateQueue] = useState<RTCIceCandidate[]>(
    []
  );

  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (joinedMeeting) {
      return () => {
        try {
          stream.current?.getTracks().forEach((t) => t.stop());
          socketRef.current?.send(
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
    if (joinedMeeting && peerConnectionRef.current) {
      peerConnectionRef.current.onnegotiationneeded = () => {
        if (peerConnectionRef.current?.connectionState !== "connected") {
          socketRef.current?.send(
            JSON.stringify({
              event: "renegotiate",
              data: meetId,
            })
          );
        }
      };
    }
  }, [joinedMeeting, peerConnectionRef.current]);

  useLayoutEffect(() => {
    if (hostId === user?.id) {
      setAllow({
        audio: true,
        shareScreen: false,
        video: true,
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (processedOffer) {
      const timeout = setTimeout(() => {
        iceCandidateQueue.forEach((candidate) => {
          peerConnectionRef.current?.addIceCandidate(candidate).catch(() => {
            toast({
              title: "Something went wrong",
              description: "Error while adding ice candidates",
            });
          });
        });
        setIceCandidateQueue([]);
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [processedOffer, iceCandidateQueue.length]);

  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        peerConnectionRef.current = await initiateConnection();

        return () => {
          peerConnectionRef.current?.close();
        };
      })();
    }
  }, [allow.shareScreen, allow.video, isAuthenticated]);

  useEffect(() => {
    if (stream.current) {
      const audioTracks = stream.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = allow.audio;
      }
    }
  }, [allow.audio, allow.video]);

  const handleIncomingMessages = (ws: WebSocket, _pc: RTCPeerConnection) => {
    ws.onmessage = (ev) => {
      const _users: { [key: string]: boolean } = {};
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
          _pc?.setRemoteDescription(JSON.parse(data)).catch(console.log);
          break;
        case "text-message":
          setMessages((prev) => {
            return [...prev, data];
          });
          break;
        case "offer":
          const { offer } = data;
          (async () => {
            try {
              if (_pc?.signalingState !== "stable") {
                console.warn("Signaling state not stable. Resetting...");
                await _pc?.setLocalDescription({ type: "rollback" });
              }
              await peerConnectionRef.current?.setRemoteDescription(
                JSON.parse(offer)
              );
              const answer = await peerConnectionRef.current?.createAnswer();
              await peerConnectionRef.current?.setLocalDescription(answer);
              setProcessedOffer(true);
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
            data.users?.reduce((prev: Users, curr: UserType) => {
              _users[curr.userId] = true;
              prev[curr.userId] = {
                ...curr,
                accepted: true,
              };
              return prev;
            }, {} as Users) || {}
          );

          setTracksMap(data.tracks);
          setJoinedMeeting(true);
          break;
        case "candidate":
          setIceCandidateQueue((prev) => {
            return [...prev, JSON.parse(data)];
          });
          break;
        case "joining-meeting":
          if (user?.id === hostId && !joinedMeeting) {
            toast({
              title: "Meeting joined, share the link for others to join",
              description: meetId,
              duration: 10000,
              action: (
                <ToastAction
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/${meetId}`
                    );
                  }}
                  altText="Goto schedule to undo"
                >
                  Copy
                </ToastAction>
              ),
            });
          }
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
                  token: getCookie("token"),
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
    setProcessedOffer(false);
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    const _mainStream = new MediaStream();

    // if (allow.audio || (allow.video && !allow.shareScreen)) {
    const _stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: allow.video && !allow.shareScreen,
    });

    _stream.getTracks().forEach((track) => {
      _mainStream.addTrack(track);
    });

    if (allow.shareScreen) {
      const _screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      _screenStream.getTracks().forEach((track) => {
        _mainStream.addTrack(track);
      });
    }

    const _pc = new RTCPeerConnection({
      iceCandidatePoolSize: 10,
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:164.68.103.23:3478",
            "stun:156.67.111.125:3478",
          ],
        },
        {
          urls: ["turn:164.68.103.23", "turn:156.67.111.125"],
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
        },
      ],
    });

    _pc.ontrack = function (event) {
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

    // const _audioTrack = _mainStream.getAudioTracks()[0];
    // if (_audioTrack) {
    //   _pc.addTrack(_audioTrack, _mainStream);
    // }

    _mainStream.getTracks().map((track) => {
      _pc.addTrack(track, _mainStream);
    });

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
    };

    ws.onopen = () => {
      socketRef.current = ws;
    };
    ws.onclose = function () {
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
              token: getCookie("token"),
            }),
          })
        );
      };
    }

    return _pc;
  };

  function joinHandler() {
    setJoining(true);
    socketRef.current?.send(
      JSON.stringify({
        event: "join-meeting",
        data: JSON.stringify({
          meetingId: meetId,
          token: getCookie("token"),
        }),
      })
    );
  }

  function disconnect() {
    stream.current?.getTracks().forEach((t) => {
      t.stop();
    });
    peerConnectionRef.current?.close();
    socketRef.current?.send(
      JSON.stringify({
        event: "leave",
        data: "",
      })
    );
    router.replace("/");
    router.refresh();
  }

  const toggleMessages = () => setShowMessages((prev) => !prev);

  const sendMessage = (message: string) => {
    console.log("text-mesage", socketRef.current);
    socketRef.current?.send(
      JSON.stringify({
        event: "text-message",
        data: message,
      })
    );
  };

  return (
    <>
      {joinedMeeting && (
        <>
          <div className="h-[92%] flex">
            <MediaPanel
              allow={allow}
              mediaStreams={mediaStreams}
              setAllow={setAllow}
              setMediaStreams={setMediaStreams}
              tracksMap={tracksMap}
              users={users}
              audioAllowed={audioAllowed}
              screenShareAllowed={screenShareAllowed}
              videoAllowed={videoAllowed}
              host={hostId === user?.id}
            />
            {showMessages && (
              <>
                <div className="hidden mt-4 mr-4 rounded-md sm:block w-[350px] border-[2px] border-secondary">
                  <MessageBox messages={messages} sendMessage={sendMessage} />
                </div>
                <div className="fixed top-0 bottom-0 left-0 right-0 z-20 sm:hidden bg-secondary ">
                  <MessageBox messages={messages} sendMessage={sendMessage} />
                </div>
              </>
            )}
          </div>
          <Footer
            showMessages={showMessages}
            allow={allow}
            disconnect={disconnect}
            setAllow={setAllow}
            toggleMessages={toggleMessages}
            audioAllowed={audioAllowed}
            screenShareAllowed={screenShareAllowed}
            videoAllowed={videoAllowed}
            host={hostId === user?.id}
          />
        </>
      )}
      {!joinedMeeting && (
        <JoinScreen
          allow={allow}
          hostId={hostId}
          joinHandler={joinHandler}
          joining={joining}
          setAllow={setAllow}
          ref={localVideoRef}
          audioAllowed={audioAllowed}
          screenShareAllowed={screenShareAllowed}
          videoAllowed={videoAllowed}
          meetId={meetId}
        />
      )}
    </>
  );
}

type Props = {
  meetId: string;
  hostId: string;
  wss: string;
  videoAllowed: boolean;
  audioAllowed: boolean;
  screenShareAllowed: boolean;
};
