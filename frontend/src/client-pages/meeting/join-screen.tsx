import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/layout/navbar";
import { Mic, MicOff, User, Video, VideoOff } from "lucide-react";
import React, { Dispatch, forwardRef, SetStateAction, useState } from "react";

const JoinScreen = forwardRef<HTMLVideoElement, Props>(
  (
    {
      allow,
      setAllow,
      hostId,
      meetId,
      joinHandler,
      joining,
      videoAllowed,
      audioAllowed,
      screenShareAllowed,
    },
    localVideoRef
  ) => {
    const [permissions, setPermissions] = useState({
      allowAudio: audioAllowed,
      allowVideo: videoAllowed,
      allowScreen: screenShareAllowed,
    });
    const [loading, setLoading] = useState(false);

    const { user, apiClient } = useAuth();
    const { toast } = useToast();

    const changeHandler = async (
      target: "allowAudio" | "allowVideo" | "allowScreen",
      state: boolean
    ) => {
      setLoading(true);
      const data = permissions;
      data[target] = state;
      try {
        const {} = await apiClient.put("/meet/" + meetId, data);
        setPermissions((prev) => {
          return {
            ...prev,
            [target]: state,
          };
        });
      } catch (error) {
        toast({
          title: "Something went wrong",
          description: "Failed to update permissions",
        });
      }
      setLoading(false);
    };

    return (
      <>
        <nav className="flex w-[90%] m-auto justify-between items-center  py-3">
          <h1 className="md:text-2xl font-bold">
            <span className="text-purple-500">Google</span>&nbsp;Meet
          </h1>
          <Navbar />
        </nav>
        <div className="m-3 h-[80%] md:flex gap-3 items-center">
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
              {(audioAllowed || hostId === user?.id) && (
                <Button
                  onClick={() => {
                    setAllow((prev) => ({ ...prev, audio: !prev.audio }));
                  }}
                  size="icon"
                  variant="ghost"
                >
                  {allow.audio ? <Mic /> : <MicOff />}
                </Button>
              )}
              {(videoAllowed || hostId === user?.id) && (
                <Button
                  onClick={() => {
                    setAllow((prev) => ({ ...prev, video: !prev.video }));
                  }}
                  size="icon"
                  variant="ghost"
                >
                  {allow.video ? <Video /> : <VideoOff />}
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-3 justify-center items-center">
            <h1 className="text-2xl">Ready to Join ?</h1>
            <Button disabled={joining || loading} onClick={joinHandler}>
              {joining
                ? "Joining.."
                : hostId === user?.id
                ? "Start Meeting"
                : "Request to join"}
            </Button>
            {/* {hostId === user?.id && (
              <>
                <div>
                  <h2 className="text-lg mb-2">
                    Participants are allowed to share
                  </h2>
                  <div className="flex justify-between">
                    <div className="flex justify-between items-center gap-3">
                      <Label>Audio</Label>
                      <Checkbox
                        defaultChecked={permissions.allowAudio}
                        onCheckedChange={(state) =>
                          changeHandler("allowAudio", !!state)
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <Label>Video</Label>
                      <Checkbox
                        defaultChecked={permissions.allowVideo}
                        onCheckedChange={(state) =>
                          changeHandler("allowVideo", !!state)
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <Label>Screen</Label>
                      <Checkbox
                        defaultChecked={permissions.allowScreen}
                        onCheckedChange={(state) =>
                          changeHandler("allowScreen", !!state)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex mt-2  justify-between items-center gap-3">
                  <h2 className="text-lg">Allow everyone</h2>
                  <Checkbox
                    onCheckedChange={(state) => {
                      // changeHandler("allowEveryone", !!state)
                    }}
                  />
                </div>
              </>
            )} */}
          </div>
        </div>
      </>
    );
  }
);
type Props = {
  joining: boolean;
  joinHandler: () => void;
  hostId: string;
  allow: Allow;
  setAllow: Dispatch<SetStateAction<Allow>>;
  videoAllowed: boolean;
  audioAllowed: boolean;
  screenShareAllowed: boolean;
  meetId: string;
};

JoinScreen.displayName = "JoinScreen";
export default JoinScreen;
