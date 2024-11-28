import { User as user } from "@prisma/client";

interface User extends user {}

type ServerProps = {
  params: Promise<{
    [key: string]: string;
  }>;
  searchParams: Promise<{
    [key: string]: string;
  }>;
};
