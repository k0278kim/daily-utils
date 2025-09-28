import { google } from "googleapis";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {JWT} from "next-auth/jwt";

async function refreshAccessToken(token: JWT) {
  try {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    console.log(token)
    client.setCredentials({ refresh_token: token.refreshToken as string });

    const { credentials } = await client.refreshAccessToken();
    console.log("🔄 Token refreshed:", credentials);

    return {
      ...token,
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date,
      refreshToken: credentials.refresh_token ?? token.refreshToken, // 새 refreshToken 없으면 기존거 유지
    };
  } catch (err) {
    console.error("❌ Error refreshing access token:", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive",
          access_type: "offline", // ✅ refresh_token 받으려면 꼭 필요
          prompt: "consent",       // ✅ 처음 로그인 때 무조건 refresh_token 발급
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 로그인 직후
      if (account) {
        token.accessToken = account.access_token;
        token.expiresAt = Date.now() + (account.expires_in as number) * 1000;

        // refresh_token이 새로 오면 업데이트, 없으면 기존 값 유지
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }

        return token;
      }


      // 토큰이 아직 유효하면 그대로 반환
      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }

      // 만료되었으면 refresh
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
