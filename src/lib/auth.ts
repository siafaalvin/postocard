import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { verifyKonvoCredentials } from "@/lib/konvo-auth";
import { hash } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Try local Postocard credentials first
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            tier: true,
            registrationPaidAt: true,
            passwordHash: true,
          },
        });

        if (user) {
          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          if (!user.registrationPaidAt) return null;
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ?? null,
            tier: user.tier,
          };
        }

        // Fallback: try Konvo credentials — registered Konvo users get free access
        const konvo = await verifyKonvoCredentials(credentials.email, credentials.password);
        if (!konvo.success || !konvo.email) return null;

        // Auto-provision a Postocard account for this Konvo user
        const username = konvo.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
        const newUser = await prisma.user.upsert({
          where: { email: konvo.email },
          update: { registrationPaidAt: new Date() },
          create: {
            email: konvo.email,
            username: username + "_" + Date.now().toString(36).slice(-4),
            displayName: username,
            passwordHash: await hash(credentials.password, 12),
            tier: "basic",
            registrationPaidAt: new Date(),
            konvoUserId: konvo.konvoUserId ?? null,
          },
        });

        return {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.displayName,
          avatarUrl: newUser.avatarUrl ?? null,
          tier: newUser.tier,
          needsOnboarding: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as unknown as { username: string }).username;
        token.displayName = (user as unknown as { displayName: string }).displayName;
        token.avatarUrl = (user as unknown as { avatarUrl: string | null }).avatarUrl;
        token.tier = (user as unknown as { tier: string }).tier;
        token.needsOnboarding = (user as unknown as { needsOnboarding?: boolean }).needsOnboarding ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.displayName = token.displayName as string;
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
        session.user.tier = token.tier as string;
        session.user.needsOnboarding = token.needsOnboarding as boolean ?? false;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      tier: string;
      needsOnboarding: boolean;
    };
  }
}
