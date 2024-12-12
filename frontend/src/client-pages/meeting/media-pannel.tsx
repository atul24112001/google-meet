import VideoPlayer from "@/components/VideoPlayer";
import { Expand, Maximize, User } from "lucide-react";
import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import MediaController from "./media-controller";
import { Button } from "@/components/ui/button";
import AudioPlayer from "@/components/AudioPlayer";
import { useAuth } from "@/context/AuthContext";

export default function MediaPanel({
  mediaStreams,
  tracksMap,
  users,
  setMediaStreams,
  allow,
  setAllow,
  videoAllowed,
  audioAllowed,
  screenShareAllowed,
  host,
}: Props) {
  const [fullScreen, setFullScreen] = useState("");

  const { user } = useAuth();

  const streamingUsers = useMemo(() => {
    return Object.values(tracksMap || {});
  }, [tracksMap]);

  return (
    <div
      className="flex flex-1 p-5 h-screen gap-4 justify-center items-center flex-wrap"
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

        if (!tracksMap?.[streamId]) {
          return null;
        }

        return (
          <div key={streamId}>
            <div className="relative w-[340px] flex-1 mb-4 md:mb-0 flex justify-center items-center">
              {!stream["video"]?.updated && users[tracksMap[streamId]] && (
                <div className="w-[100%] aspect-video flex justify-center flex-col items-center object-cover  bg-[#383838] text-white rounded-md">
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
                        : "rounded-md"
                    } w-[100%] aspect-video object-cover bg-background `}
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
                    fullScreen === streamId
                      ? "fixed z-30"
                      : "absolute rounded-md z-10"
                  }  bg-[#00000050] text-center w-full px-2 flex text-white items-center justify-between gap-2 top-0 left-0 `}
                >
                  <p className="text-sm">{users[tracksMap[streamId]].name}</p>
                  {fullScreen === streamId && (
                    <div className="flex items-center gap-1">
                      <MediaController
                        allow={allow}
                        setAllow={setAllow}
                        audioAllowed={audioAllowed}
                        screenShareAllowed={screenShareAllowed}
                        videoAllowed={videoAllowed}
                        host={host}
                      />
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
            className="w-[340px] object-cover  bg-[#383838]  aspect-video mb-4 md:mb-0 flex justify-center items-center rounded-md"
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
  );
}

type Props = {
  mediaStreams: MediaStreamMap;
  tracksMap: TrackMap;
  users: Users;
  allow: Allow;
  setMediaStreams: Dispatch<SetStateAction<MediaStreamMap>>;
  setAllow: Dispatch<SetStateAction<Allow>>;
  videoAllowed: boolean;
  audioAllowed: boolean;
  screenShareAllowed: boolean;
  host: boolean;
};
