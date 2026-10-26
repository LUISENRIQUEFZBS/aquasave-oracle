import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    userType?: "internal" | "client";
    role?: string;
    clientId?: number;
    clientRole?: string;
  }

  interface Session {
    user: {
      userType: "internal" | "client";
      role?: string;
      clientId?: number;
      clientRole?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userType?: "internal" | "client";
    role?: string;
    clientId?: number;
    clientRole?: string;
  }
}