import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { User } from "@/entities/User";
import { ClientUser } from "@/entities/ClientUser";
import { authConfig } from "@/auth.config";
import * as adapterEntities from "@/lib/auth-adapter-entities";

const { TypeORMAdapter } = await import("@auth/typeorm-adapter");

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  adapter: TypeORMAdapter(
    {
      type: "oracle",
      host: process.env.ORACLE_HOST,
      port: Number(process.env.ORACLE_PORT),
      serviceName: process.env.ORACLE_SERVICE_NAME,
      username: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      synchronize: false,
    },
    { entities: adapterEntities }
  ),
  providers: [
    Google({
      id: "google-internal",
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Google({
      id: "google-client",
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "credentials", // internal — matches InternalLoginForm's signIn("credentials", ...)
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
      id: "client-credentials", // matches ClientLoginForm's signIn("client-credentials", ...)
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