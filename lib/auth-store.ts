import { database } from "./db"
import bcryptjs from "bcryptjs"

// Current user session
let currentUser: { id: number; name: string; email: string } | null = null

export const authStore = {
  // Login
  login: async (email: string, password: string) => {
    const user = database.getUserByEmail(email)

    if (!user) {
      throw new Error("Invalid email or password")
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)

    if (!isPasswordValid) {
      throw new Error("Invalid email or password")
    }

    // Set current user (omit password)
    currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    }

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(currentUser))
    }

    return currentUser
  },

  // Register
  register: async (name: string, email: string, password: string) => {
    try {
      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10)

      // Create new user
      const userId = database.createUser(name, email, hashedPassword)

      // Set current user
      currentUser = {
        id: userId,
        name,
        email,
      }

      // Store in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(currentUser))
      }

      return currentUser
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Failed to register user")
    }
  },

  // Logout
  logout: () => {
    currentUser = null

    // Remove from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
    }
  },

  // Get current user
  getCurrentUser: () => {
    // Try to get from memory first
    if (currentUser) {
      return currentUser
    }

    // Try to get from localStorage
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser)
          return currentUser
        } catch (error) {
          console.error("Error parsing stored user:", error)
          localStorage.removeItem("user")
        }
      }
    }

    return null
  },

  // Save detection to history
  saveDetection: (data: { type: string; faceCount: number; preview: string }) => {
    if (!currentUser) return null

    return database.saveDetection(currentUser.id, data.type, data.faceCount, data.preview)
  },

  // Get detection history
  getDetectionHistory: () => {
    if (!currentUser) return []

    return database.getDetectionHistory(currentUser.id)
  },

  // Delete detection history item
  deleteDetection: (id: number) => {
    return database.deleteDetection(id)
  },
}

