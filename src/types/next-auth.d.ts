import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string | null;
      refreshToken?: string | null;
      username?: string | null;
    } & DefaultSession["user"]; // Keep existing user properties
  }

  // Keep existing User properties if needed
  // interface User extends DefaultUser {
  //   // Add custom properties here if needed for the User object
  // }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    username?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
