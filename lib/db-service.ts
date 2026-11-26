import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
  getDoc,
} from "firebase/firestore"
import { db } from "./firebase"

// Detection history type
export interface DetectionHistory {
  id?: string
  userId: string
  type: string
  faceCount: number
  preview: string
  timestamp: Timestamp | Date
}

export const dbService = {
  // Save detection to history
  saveDetection: async (data: Omit<DetectionHistory, "id" | "timestamp">) => {
    try {
      const docRef = await addDoc(collection(db, "detectionHistory"), {
        ...data,
        timestamp: Timestamp.now(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error saving detection:", error)
      throw error
    }
  },

  // Get detection history for a user
  getDetectionHistory: async (userId: string) => {
    try {
      const q = query(collection(db, "detectionHistory"), where("userId", "==", userId), orderBy("timestamp", "desc"))

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DetectionHistory[]
    } catch (error) {
      console.error("Error getting detection history:", error)
      throw error
    }
  },

  // Get a single detection by ID
  getDetection: async (id: string) => {
    try {
      const docRef = doc(db, "detectionHistory", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as DetectionHistory
      } else {
        throw new Error("Detection not found")
      }
    } catch (error) {
      console.error("Error getting detection:", error)
      throw error
    }
  },

  // Delete a detection
  deleteDetection: async (id: string) => {
    try {
      await deleteDoc(doc(db, "detectionHistory", id))
      return true
    } catch (error) {
      console.error("Error deleting detection:", error)
      throw error
    }
  },
}

