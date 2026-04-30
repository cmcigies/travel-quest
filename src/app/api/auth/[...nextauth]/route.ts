import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { appendRow, readSheet, initSheets } from '@/lib/sheets'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // WebView 차단 우회: 외부 브라우저 강제
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      try {
        const rows = await readSheet('users!A2:D')
        const exists = rows.find(r => r[1] === user.email)
        if (!exists) {
          await appendRow('users!A:D', [
            Date.now().toString(36),
            user.email,
            user.name || '',
            new Date().toISOString(),
          ])
        }
      } catch (e) {
        // users 시트 없어도 로그인은 허용
      }
      return true
    },
    async session({ session, token }) {
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
    error: '/',
  },
})

export { handler as GET, handler as POST }
