import React from "react";

function VideoPlayer({ stream, id, className, onRemove }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    stream.onremovetrack = () => {
      onRemove(id);
    };
  }, [stream]);

  return (
    <video
      id={id}
      className={className}
      ref={videoRef}
      muted
      autoPlay
      onPause={() => {
        console.log("Paused video");
      }}
      onLoadStart={() => {
        console.log("Loading video");
      }}
      onLoad={() => {
        console.log("Loading ends");
      }}
      controls={false}
    ></video>
  );
}

type Props = {
  stream: MediaStream;
  id: string;
  className: string;
  onRemove: (id: string) => void;
};

export default VideoPlayer;
