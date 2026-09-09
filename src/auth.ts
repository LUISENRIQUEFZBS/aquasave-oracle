import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db"; // side-effect: initializes Oracle thick mode
import { User } from "@/entities/User";
import { ClientUser } from "@/entities/ClientUser";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "credentials-internal",
      name: "Correo y contraseña (interno)",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const db = await getDb();
        const user = await db
          .getRepository(User)
          .findOne({ where: { email: String(creds.email) } });
        if (!user || !user.passwordHash || !user.active) return null;
        const valid = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!valid) return null;
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          userType: "internal",
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "credentials-client",
      name: "Correo y contraseña (cliente)",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const db = await getDb();
        const clientUser = await db
          .getRepository(ClientUser)
          .findOne({ where: { email: String(creds.email) } });
        if (!clientUser || !clientUser.passwordHash || !clientUser.active) return null;
        const valid = await bcrypt.compare(String(creds.password), clientUser.passwordHash);
        if (!valid) return null;
        return {
          id: String(clientUser.id),
          name: clientUser.name,
          email: clientUser.email,
          userType: "client",
          role: clientUser.role,
          clientId: clientUser.clientId,
        };
      },
    }),
  ],
});