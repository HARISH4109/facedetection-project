// Browser-compatible database using IndexedDB
type User = {
  id: number
  name: string
  email: string
  password: string
  created_at: string
}

type DetectionHistory = {
  id: number
  user_id: number
  type: string
  face_count: number
  preview: string
  timestamp: string
}

// Simple auto-increment ID generator
let nextUserId = 1
let nextHistoryId = 1

// In-memory storage for demo purposes
const users: User[] = [
  {
    id: 1,
    name: "Demo User",
    email: "demo@example.com",
    // This is a hashed version of "password"
    password: "$2a$10$8OKVAPzMkPVWXiKtHN0q1e2E7Wk7nxQoFGQjkiW1nY.425Tqnn5.2",
    created_at: new Date().toISOString(),
  },
]

const detectionHistory: DetectionHistory[] = []

// Initialize IDs based on existing data
if (users.length > 0) {
  nextUserId = Math.max(...users.map((u) => u.id)) + 1
}

// Browser storage persistence
const saveToLocalStorage = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("facedetect_users", JSON.stringify(users))
      localStorage.setItem("facedetect_history", JSON.stringify(detectionHistory))
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  }
}

// Load from localStorage on init
const loadFromLocalStorage = () => {
  if (typeof window !== "undefined") {
    try {
      const storedUsers = localStorage.getItem("facedetect_users")
      const storedHistory = localStorage.getItem("facedetect_history")

      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers)
        users.length = 0 // Clear array
        users.push(...parsedUsers)
        nextUserId = Math.max(...users.map((u: any) => u.id)) + 1
      }

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory)
        detectionHistory.length = 0 // Clear array
        detectionHistory.push(...parsedHistory)
        nextHistoryId = parsedHistory.length > 0 ? Math.max(...parsedHistory.map((h: any) => h.id)) + 1 : 1
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }
}

// Initialize data from localStorage
if (typeof window !== "undefined") {
  loadFromLocalStorage()
}

export const database = {
  // User methods
  getUserByEmail: (email: string) => {
    return users.find((user) => user.email === email) || null
  },

  getUserById: (id: number) => {
    return users.find((user) => user.id === id) || null
  },

  createUser: (name: string, email: string, password: string) => {
    // Check if user already exists
    if (users.some((user) => user.email === email)) {
      throw new Error("User with this email already exists")
    }

    const newUser: User = {
      id: nextUserId++,
      name,
      email,
      password,
      created_at: new Date().toISOString(),
    }

    users.push(newUser)
    saveToLocalStorage()

    return newUser.id
  },

  // Detection history methods
  saveDetection: (userId: number, type: string, faceCount: number, preview: string) => {
    const newDetection: DetectionHistory = {
      id: nextHistoryId++,
      user_id: userId,
      type,
      face_count: faceCount,
      preview,
      timestamp: new Date().toISOString(),
    }

    detectionHistory.push(newDetection)
    saveToLocalStorage()

    return newDetection.id
  },

  getDetectionHistory: (userId: number) => {
    return detectionHistory
      .filter((item) => item.user_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  },

  deleteDetection: (id: number) => {
    const index = detectionHistory.findIndex((item) => item.id === id)
    if (index !== -1) {
      detectionHistory.splice(index, 1)
      saveToLocalStorage()
      return true
    }
    return false
  },
}

