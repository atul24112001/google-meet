import React from "react";

function AudioPlayer({ stream, id, onRemove }: Props) {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      // audioRef.current.play();
      stream.onremovetrack = () => {
        onRemove(id);
      };
    }
  }, [stream]);

  return <audio id={id} ref={audioRef} autoPlay controls={false} />;
}

type Props = {
  stream: MediaStream;
  id: string;
  onRemove: (id: string) => void;
};

export default AudioPlayer;
