import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { getDb } from "@/lib/db";
import { User } from "@/entities/User";
import { ClientUser } from "@/entities/ClientUser";
import { authConfig } from "@/auth.config";

// Fecha local (Lima) en formato YYYY-MM-DD, para columnas DATE
function hoy() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        const db = await getDb();
        const user = await db.getRepository(User).findOne({ where: { email } });
        if (!user || user.status !== 1 || !user.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
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
      id: "client-credentials",
      name: "client-credentials",
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        const db = await getDb();
        const clientUser = await db.getRepository(ClientUser).findOne({ where: { email } });
        if (!clientUser || clientUser.status !== 1 || !clientUser.passwordHash) return null;
        const valid = await bcrypt.compare(password, clientUser.passwordHash);
        if (!valid) return null;
        return {
          id: String(clientUser.id),
          name: clientUser.name,
          email: clientUser.email,
          userType: "client",
          clientId: clientUser.clientId,
          clientRole: clientUser.role,
        };
      },
    }),
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
    MicrosoftEntraID({
      id: "microsoft-entra-id",
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      const db = await getDb();
      if (account?.provider === "google-internal" || account?.provider === "microsoft-entra-id") {
        const existing = await db.getRepository(User).findOne({ where: { email: user.email! } });
        return !!existing && existing.status === 1;
      }
      if (account?.provider === "google-client") {
        const existing = await db.getRepository(ClientUser).findOne({ where: { email: user.email! } });
        if (!existing || existing.status !== 1) return false;
        if (!existing.emailVerifiedAt) {
          await db.getRepository(ClientUser).update(
            { id: existing.id },
            { emailVerifiedAt: hoy() }
          );
        }
        return true;
      }
      return true;
    },
    async jwt(params) {
      const { account } = params;
      const db = await getDb();

      if (account?.provider === "google-internal" && params.user?.email) {
        const googleImage = params.user.image;
        const u = await db.getRepository(User).findOne({ where: { email: params.user.email } });
        if (u) {
          params.user = {
            id: String(u.id),
            name: u.name,
            email: u.email,
            userType: "internal",
            role: u.role,
            image: googleImage,
          };
        }
      }

      if (account?.provider === "microsoft-entra-id" && params.user?.email) {
        const u = await db.getRepository(User).findOne({ where: { email: params.user.email } });
        if (u) {
          let resolvedImage: string | null = null;
          if (u.microsoftPhotoUrl) {
            resolvedImage = u.microsoftPhotoUrl;
          } else if (account.access_token) {
            try {
              const photoRes = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                headers: { Authorization: `Bearer ${account.access_token}` },
              });
              if (photoRes.ok) {
                const bytes = Buffer.from(await photoRes.arrayBuffer());
                const filename = `${u.id}.jpg`;
                const dir = path.join(process.cwd(), "public", "uploads", "avatars");
                await mkdir(dir, { recursive: true });
                await writeFile(path.join(dir, filename), bytes);
                const storedUrl = `/uploads/avatars/${filename}`;
                await db.getRepository(User).update({ id: u.id }, { microsoftPhotoUrl: storedUrl });
                resolvedImage = storedUrl;
              }
            } catch {
              // una foto faltante nunca debe bloquear el ingreso
            }
          }
          params.user = {
            id: String(u.id),
            name: u.name,
            email: u.email,
            userType: "internal",
            role: u.role,
            image: resolvedImage,
          };
        }
      }

      if (account?.provider === "google-client" && params.user?.email) {
        const googleImage = params.user.image;
        const cu = await db.getRepository(ClientUser).findOne({ where: { email: params.user.email } });
        if (cu) {
          params.user = {
            id: String(cu.id),
            name: cu.name,
            email: cu.email,
            userType: "client",
            clientId: cu.clientId,
            clientRole: cu.role,
            image: googleImage,
          };
        }
      }

      return authConfig.callbacks!.jwt!(params);
    },
  },
});