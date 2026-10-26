import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.userType = (user as { userType?: "internal" | "client" }).userType;
        if ((user as { role?: string }).role) {
          token.role = (user as { role: string }).role;
        }
        if ((user as { clientId?: number }).clientId) {
          token.clientId = (user as { clientId: number }).clientId;
          token.clientRole = (user as { clientRole: string }).clientRole;
        }
        if ((user as { image?: string | null }).image) {
          token.picture = (user as { image?: string | null }).image;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType as "internal" | "client";
        if (token.role) session.user.role = token.role as string;
        if (token.clientId) {
          session.user.clientId = token.clientId as number;
          session.user.clientRole = token.clientRole as string;
        }
        session.user.image = (token.picture as string | undefined) ?? null;
      }
      return session;
    },
  },
};