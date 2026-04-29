import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { appendRow, readSheet, initSheets } from '@/lib/sheets'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        await initSheets()
        const rows = await readSheet('users!A:E')
        const exists = rows.some(row => row[0] === user.id)
        if (!exists) {
          await appendRow('users!A:E', [
            user.id || '',
            user.email || '',
            user.name || '',
            user.image || '',
            new Date().toISOString(),
          ])
        }
        return true
      } catch (e) {
        console.error('SignIn error:', e)
        return true
      }
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
      }
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/',
  },
})

export { handler as GET, handler as POST }
