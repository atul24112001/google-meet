import ClientHomePage from "@/client-pages/home";
import { Button } from "@/components/ui/button";
import Navbar from "@/layout/navbar";
import Image from "next/image";
export default function Home() {
  return (
    <>
      <nav className="flex w-[90%] m-auto justify-between items-center  py-3">
        <h1 className="md:text-2xl font-bold">
          <span className="text-purple-500">Google</span>&nbsp;Meet
        </h1>
        <Navbar />
      </nav>
      <main className="w-[90%] m-auto md:h-3/4 md:flex justify-between  items-center my-10">
        <div className="flex-1 md:px-10 mb-8 md:mb-0 md:flex justify-center items-center">
          <div className="">
            <h2 className="text-2xl md:text-3xl font-semibold">
              Video calls and meetings for&nbsp;
              <span className="text-purple-500 ">everyone</span>
            </h2>
            <p className="text-secondary-foreground md:text-xl">
              Connect, collaborate and celebrate from anywhere with{" "}
              <span className="">Google&nbsp;</span>meet
            </p>
            <ClientHomePage />
          </div>
        </div>
        <div className="flex  md:px-10 flex-1 justify-center items-center">
          <div>
            <div className="flex justify-center mb-3">
              <Image
                width={280}
                height={280}
                quality={100}
                className="w-1/2"
                src="/images/landing.svg"
                alt="landing.svg"
              />
            </div>
            <h3 className="text-center text-xl">
              Get a link that you can share
            </h3>
            <p className="text-center text-secondary-foreground">
              Click <span className="font-semibold">New Meeting</span> to get a
              link that you can send to people that you want to meet with
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
