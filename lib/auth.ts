import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        botToken: { label: 'Bot Token', type: 'text' } // للوصول عبر البوت
      },
      async authorize(credentials) {
        if (!credentials) return null
        
        // الوصول عبر توكن البوت
        if (credentials.botToken) {
          const botUser = await validateBotToken(credentials.botToken)
          if (botUser) {
            return {
              id: botUser.userId,
              email: botUser.email,
              name: 'Bot Client',
              plan: botUser.plan,
              status: 'active'
            }
          }
          return null
        }
        
        // الوصول العادي عبر البريد وكلمة المرور
        if (!credentials.email || !credentials.password) return null
        
        const user = await validateCredentials(credentials.email, credentials.password)
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            status: user.status
          }
        }
        
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.plan = (user as any).plan
        token.status = (user as any).status
        token.isBot = (user as any).name === 'Bot Client'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        ;(session.user as any).plan = token.plan
        ;(session.user as any).status = token.status
        ;(session.user as any).isBot = token.isBot
      }
      return session
    },
  },
}

// دوال المساعدة
async function validateBotToken(token: string): Promise<any> {
  // في الإنتاج، تحقق من قاعدة البيانات
  const validTokens = ['vrb_demo_token_123', 'vrb_test_token_456']
  
  if (validTokens.includes(token)) {
    return {
      userId: 'bot_user_' + Date.now(),
      email: 'bot@vikingrise.com',
      plan: 'pro',
      token
    }
  }
  return null
}

async function validateCredentials(email: string, password: string): Promise<any> {
  // في الإنتاج، تحقق من قاعدة البيانات
  const users = [
    {
      id: 'user_001',
      email: 'ahmed85q@hotmail.com',
      password: 'demo123', // في الإنتاج استخدم hashing
      name: 'Ahmed',
      plan: 'pro',
      status: 'active'
    }
  ]
  
  return users.find(u => u.email === email && u.password === password)
}