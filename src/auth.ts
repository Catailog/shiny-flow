import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { SupabaseAdapter } from '@auth/supabase-adapter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adapter =
  supabaseUrl && supabaseSecret
    ? SupabaseAdapter({ url: supabaseUrl, secret: supabaseSecret })
    : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  adapter,
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
