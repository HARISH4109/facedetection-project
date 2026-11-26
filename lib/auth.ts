import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare, hash } from "bcryptjs"

// In a real app, this would be a database
// For demo purposes, we'll use an in-memory store
const users = [
  {
    id: "1",
    name: "Demo User",
    email: "user@example.com",
    password: "$2b$10$8r0S/DUgqZ.KCgE.y.MPUuQFJNqLBBL8KlRZ7YlL1xANDxEVOJNlO", // hashed "password"
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // Find user by email
        const user = users.find((user) => user.email === credentials.email)

        // If user doesn't exist
        if (!user) {
          // For demo purposes, create a new user
          const newUser = {
            id: String(users.length + 1),
            name: credentials.email.split("@")[0],
            email: credentials.email,
            password: await hash(credentials.password, 10),
          }
          users.push(newUser)
          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
          }
        }

        // Check password
        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid password")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "NEXTAUTH_SECRET",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === "development",
}

