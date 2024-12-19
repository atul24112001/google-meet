"use client";
import CircularLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@prisma/client";
import axios, { AxiosError, AxiosInstance } from "axios";
import { setCookie } from "cookies-next/client";
import {
  ChangeEvent,
  createContext,
  FormEvent,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthContextTypes = {
  isAuthenticated: boolean;
  user: null | User;
  apiClient: AxiosInstance;
  authenticate: (
    email: string,
    password?: string,
    name?: string
  ) => Promise<void>;
  toggleShowAuthDialog: () => void;
};

const AuthContext = createContext<AuthContextTypes>({
  isAuthenticated: false,
  user: null,
  apiClient: axios,
  authenticate: async () => {},
  toggleShowAuthDialog: () => {},
});

export const AuthContextProvider = ({
  children,
  authPayload,
}: PropsWithChildren<Props>) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authPayload);
  const [user, setUser] = useState<null | User>(null);
  const [token, setToken] = useState("");
  const [userExist, setUserExist] = useState<null | boolean>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [details, setDetails] = useState({ name: "", email: "", password: "" });

  const { toast } = useToast();

  const apiClient = useMemo(() => {
    return axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  }, [token]);

  const tryCatchWrapper = async (
    action: () => Promise<void>,
    notify?: boolean
  ) => {
    setAuthenticating(true);
    let success = true;
    try {
      await action();
    } catch (error) {
      if (notify) {
        toast({
          title: "Something went wrong",
          description:
            error instanceof AxiosError
              ? error.response?.data?.message
              : (error as Error).message,
          variant: "destructive",
        });
      }
      success = false;
    }
    setAuthenticating(false);
    return success;
  };

  const checkUserExit = async (email: string) => {
    const success = await tryCatchWrapper(async () => {
      await apiClient.post("/auth/check", {
        email,
      });
    });
    setUserExist(success);
  };

  const authenticateHandler = (data: { data: User; token: string }) => {
    setIsAuthenticated(true);
    setUser(data.data);
    setToken(data.token);
    if (data.token) {
      setCookie("token", data.token, {
        maxAge: 3600 * 24 * 30,
      });
    }
    localStorage.setItem("token", data.token);
  };

  useEffect(() => {
    if (authPayload) {
      authenticateHandler(authPayload);
    }
  }, []);

  const signin = async (email: string, password: string) => {
    await tryCatchWrapper(async () => {
      const { data } = await apiClient.post("/auth/signin", {
        email,
        password,
      });
      authenticateHandler(data);
      toggleShowAuthDialog();
    }, true);
  };

  const signup = async (email: string, password: string, name: string) => {
    await tryCatchWrapper(async () => {
      const { data } = await apiClient.post("/auth/signup", {
        email,
        password,
        name,
      });
      authenticateHandler(data);
      toggleShowAuthDialog();
    }, true);
  };

  const authenticate = async (
    email: string,
    password?: string,
    name?: string
  ) => {
    if (userExist == null) {
      await checkUserExit(email);
      return;
    }

    if (userExist && password) {
      await signin(email, password);
      return;
    }

    if (!userExist && password && name) {
      await signup(email, password, name);
      return;
    }
  };

  const toggleShowAuthDialog = () => setShowAuthDialog((prev) => !prev);

  const changeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setDetails((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    authenticate(details.email, details.password, details.name);
  };

  const value = useMemo(() => {
    return {
      isAuthenticated,
      user,
      apiClient,
      authenticate,
      toggleShowAuthDialog,
    };
  }, [isAuthenticated, user, token]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={showAuthDialog} onOpenChange={toggleShowAuthDialog}>
        <DialogContent className="w-[90%] md:w-[50%] lg:w-[40%]">
          <DialogHeader>
            <DialogTitle>Authenticate</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitHandler}>
            <div className="mb-2">
              <Label htmlFor="email">Email</Label>
              <Input
                value={details.email}
                onChange={changeHandler}
                disabled={userExist !== null}
                type="email"
                id="email"
                name="email"
                placeholder="Email"
              />
            </div>
            {userExist === false && (
              <div className="mb-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  value={details.name}
                  onChange={changeHandler}
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Name"
                />
              </div>
            )}
            {userExist !== null && (
              <div className="mb-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  value={details.password}
                  onChange={changeHandler}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                />
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    onCheckedChange={(e) => setShowPassword(!!e)}
                    id="show-password"
                  />
                  <label
                    htmlFor="show-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Show Password
                  </label>
                </div>
              </div>
            )}
            <DialogFooter className="mt-3">
              <Button disabled={authenticating} type="submit">
                {authenticating && <CircularLoader />}
                {!authenticating && userExist === null
                  ? "Submit"
                  : userExist
                  ? "Login"
                  : "Signup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
};

type Props = {
  authPayload: { data: User; token: string } | null;
};

export const useAuth = () => useContext(AuthContext);
