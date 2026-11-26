"use client"

import { useEffect, useState } from "react"
import * as faceapi from "face-api.js"

export function FaceApiPreloader() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const preloadModels = async () => {
      try {
        console.log("Preloading face-api.js models in background...")
        const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

        // Load models in parallel for faster loading
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).then(() => console.log("SsdMobilenetv1 model loaded")),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL).then(() => console.log("FaceLandmark68 model loaded")),
          faceapi.nets.faceRecognitionNet
            .loadFromUri(MODEL_URL)
            .then(() => console.log("FaceRecognition model loaded")),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL).then(() => console.log("FaceExpression model loaded")),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL).then(() => console.log("AgeGender model loaded")),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).then(() => console.log("TinyFaceDetector model loaded")),
        ])

        console.log("All models preloaded successfully!")
        setIsLoading(false)
      } catch (error) {
        console.error("Error preloading models:", error)
        setError(error instanceof Error ? error.message : "Unknown error loading models")
        setIsLoading(false)
      }
    }

    preloadModels()
  }, [])

  return null
}

