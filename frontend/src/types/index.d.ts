type ServerProps = {
  params: Promise<{
    [key: string]: string;
  }>;
  searchParams: Promise<{
    [key: string]: string;
  }>;
};

type UserType = {
  userId: string;
  name: string;
  email: string;
  accepted: boolean;
};
type Users = {
  [key: string]: UserType;
};

type MediaStreamMap = {
  [key: string]: {
    [key: string]: { stream: MediaStream; kind: string; updated: boolean };
  };
};

type TrackMap = { [key: string]: string };

type Allow = { audio: boolean; video: boolean; shareScreen: boolean };

type Message = {
  userId: string;
  name: string;
  message: string;
};
