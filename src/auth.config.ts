import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Real providers (need DB access) are added in auth.ts, not here — mirrors
  // the real app: proxy.ts only checks "session exists?" via this edge-safe
  // config, since Prisma/TypeORM can't run at the edge.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // @ts-expect-error - custom fields attached by our providers in auth.ts
        token.userType = user.userType;
        // @ts-expect-error
        token.role = user.role;
        // @ts-expect-error
        token.clientId = user.clientId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // @ts-expect-error
        session.user.userType = token.userType;
        // @ts-expect-error
        session.user.role = token.role;
        // @ts-expect-error
        session.user.clientId = token.clientId;
      }
      return session;
    },
  },
};