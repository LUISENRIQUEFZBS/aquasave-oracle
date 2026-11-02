import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Deliberately does NOT import "@/auth": that file pulls in TypeORM + oracledb,
// which cannot run in this bundling context. This only checks whether a session
// cookie exists and redirects unauthenticated users to /login.
// Authoritative session + role checks happen in the layouts via auth() from "@/auth".
const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
