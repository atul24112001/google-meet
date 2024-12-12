import ClientMeeting from "@/client-pages/meeting";
import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Meeting({ params }: ServerProps) {
  try {
    const { meetId } = await params;

    const store = await cookies();
    const token = store.get("token");
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/meet/${meetId}`,
      {
        headers: {
          Authorization: `Bearer ${token?.value}`,
        },
      }
    );

    return (
      <ClientMeeting
        hostId={data.data.hostId}
        meetId={data.data.meetId}
        wss={data.data.wss}
        audioAllowed={data.data.allowAudio}
        screenShareAllowed={data.data.allowScreen}
        videoAllowed={data.data.allowVideo}
      />
    );
  } catch (error) {
    if (error instanceof AxiosError) {
      console.log(error.response);
    }
    console.log(error);
  }
  redirect("/");
}
