"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Video, Camera, X, ImageIcon, Download, Check, Play, Pause, Film, AlertCircle, Bug } from "lucide-react"
import { useDropzone } from "react-dropzone"
import * as faceapi from "face-api.js"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"
import { dbService } from "@/lib/db-service"

export default function DetectPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("upload")
  const [isLoading, setIsLoading] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [detectionResults, setDetectionResults] = useState<any[] | null>(null)
  const [expressions, setExpressions] = useState<any[] | null>(null)
  const [ageGenderResults, setAgeGenderResults] = useState<any[] | null>(null)
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDetectionActive, setVideoDetectionActive] = useState(false)
  const [videoFacesDetected, setVideoFacesDetected] = useState(0)
  const [debugMode, setDebugMode] = useState(true) // Set to true by default for troubleshooting
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [detectionMinConfidence, setDetectionMinConfidence] = useState(0.3) // Lower default for better detection
  const [detectionFrequency, setDetectionFrequency] = useState(3) // Process every X frames

  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const uploadedVideoRef = useRef<HTMLVideoElement>(null)
  const uploadedVideoCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoCanvasRef = useRef<HTMLCanvasElement>(null)
  const modelsLoadedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const frameCounterRef = useRef(0)
  const videoFrameCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load face-api models
  useEffect(() => {
    let isMounted = true

    const loadModels = async () => {
      try {
        if (!isMounted) return

        setIsModelLoading(true)
        setModelLoadingError(null)
        console.log("Starting to load face-api.js models...")

        // Use a different CDN for the models
        const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

        // Load models in parallel for faster loading
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).then(() => console.log("SsdMobilenetv1 model loaded")),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL).then(() => console.log("FaceLandmark68 model loaded")),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL).then(() => console.log("FaceExpression model loaded")),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL).then(() => console.log("AgeGender model loaded")),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).then(() => console.log("TinyFaceDetector model loaded")),
        ])

        // Add a delay to ensure everything is initialized
        console.log("Waiting for models to initialize...")
        await new Promise((resolve) => setTimeout(resolve, 1000))

        if (!isMounted) return

        console.log("All models loaded successfully")
        modelsLoadedRef.current = true
        setIsModelLoading(false)
      } catch (error) {
        console.error("Error loading models:", error)
        if (!isMounted) return

        setModelLoadingError(error instanceof Error ? error.message : "Unknown error loading models")
        toast({
          title: "Error",
          description: "Failed to load face detection models. Please refresh and try again.",
          variant: "destructive",
        })
        setIsModelLoading(false)
      }
    }

    loadModels()

    // Create a hidden canvas for video frame extraction
    videoFrameCanvasRef.current = document.createElement("canvas")
    videoFrameCanvasRef.current.width = 640
    videoFrameCanvasRef.current.height = 480

    // Cleanup function
    return () => {
      isMounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Image file upload handling
  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const imageUrl = URL.createObjectURL(file)
        setUploadedImage(imageUrl)
        setDetectionResults(null)
        setExpressions(null)
        setAgeGenderResults(null)
      }
    },
    maxFiles: 1,
    multiple: false,
  })

  // Video file upload handling
  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    accept: {
      "video/*": [".mp4", ".webm", ".mov"],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const videoUrl = URL.createObjectURL(file)
        setUploadedVideo(videoUrl)
        setVideoDetectionActive(false)
        setVideoProgress(0)
        setVideoFacesDetected(0)
        setDebugInfo("")

        // Reset the canvas
        if (uploadedVideoCanvasRef.current) {
          const ctx = uploadedVideoCanvasRef.current.getContext("2d")
          if (ctx) {
            ctx.clearRect(0, 0, uploadedVideoCanvasRef.current.width, uploadedVideoCanvasRef.current.height)
          }
        }

        toast({
          title: "Video uploaded",
          description: "Video has been uploaded successfully. Click play to start detection.",
        })
      }
    },
    maxFiles: 1,
    multiple: false,
  })

  // Process image detection with age and gender
  const handleImageDetection = async () => {
    if (!imageRef.current || !uploadedImage) {
      return
    }

    if (!modelsLoadedRef.current) {
      toast({
        title: "Models not loaded",
        description: "Please wait for the face detection models to load completely.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      console.log("Starting face detection...")

      // Make sure the canvas matches the image dimensions
      if (canvasRef.current && imageRef.current) {
        const displaySize = {
          width: imageRef.current.width,
          height: imageRef.current.height,
        }

        console.log("Setting up canvas with dimensions:", displaySize)
        faceapi.matchDimensions(canvasRef.current, displaySize)

        // Wait for image to be fully loaded
        if (!imageRef.current.complete) {
          console.log("Waiting for image to load...")
          await new Promise((resolve) => {
            imageRef.current!.onload = () => resolve(true)
          })
        }

        console.log("Image loaded, proceeding with detection")

        // Create a temporary canvas to avoid CORS issues
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = imageRef.current.width
        tempCanvas.height = imageRef.current.height

        const ctx = tempCanvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(imageRef.current, 0, 0, tempCanvas.width, tempCanvas.height)
        }

        console.log("Detecting faces...")
        // Use SsdMobilenetv1 with age and gender detection
        const detections = await faceapi
          .detectAllFaces(tempCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: detectionMinConfidence }))
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender() // Add age and gender detection

        console.log("Detection complete, found", detections.length, "faces")

        // Resize detections to match display size
        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        // Clear previous drawings
        const canvasCtx = canvasRef.current.getContext("2d")
        if (canvasCtx) canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        // Draw boxes and landmarks
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections)

        // Draw age and gender
        resizedDetections.forEach((detection) => {
          const { age, gender, genderProbability } = detection
          const box = detection.detection.box
          const text = [`${Math.round(age)} years`, `${gender} (${Math.round(genderProbability * 100)}%)`]
          const anchor = box.bottomLeft
          const drawOptions = {
            anchorPosition: "BOTTOM_LEFT",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            fontColor: "white",
            fontSize: 16,
            padding: 5,
          }
          const drawBox = new faceapi.draw.DrawTextField(text, anchor, drawOptions)
          drawBox.draw(canvasRef.current)
        })

        // Save detection results
        setDetectionResults(resizedDetections.map((d) => d.detection))
        setExpressions(resizedDetections.map((d) => d.expressions))
        setAgeGenderResults(
          resizedDetections.map((d) => ({
            age: d.age,
            gender: d.gender,
            genderProbability: d.genderProbability,
          })),
        )

        // Save to history if user is logged in
        if (user) {
          saveToHistory({
            type: "image",
            faceCount: resizedDetections.length,
            preview: uploadedImage,
          })
        }
      }
    } catch (error) {
      console.error("Error during face detection:", error)
      toast({
        title: "Detection failed",
        description: "An error occurred while processing the image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Start webcam
  const startWebcam = async () => {
    if (!modelsLoadedRef.current) {
      toast({
        title: "Models not loaded",
        description: "Please wait for the face detection models to load completely.",
        variant: "destructive",
      })
      return
    }

    try {
      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Get webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve(true)
            }
          }
        })
      }

      // Reset detection results
      setDetectionResults(null)
      setExpressions(null)
      setAgeGenderResults(null)

      // Start real-time detection once video is playing
      if (videoRef.current) {
        videoRef.current.addEventListener("play", startRealTimeDetection)
      }
    } catch (error) {
      console.error("Error accessing webcam:", error)
      toast({
        title: "Camera access failed",
        description: "Unable to access your camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  // Real-time face detection
  const startRealTimeDetection = async () => {
    if (!videoRef.current || !videoCanvasRef.current || !modelsLoadedRef.current) return

    const displaySize = {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight,
    }

    faceapi.matchDimensions(videoCanvasRef.current, displaySize)

    // Detection loop
    const detectFaces = async () => {
      if (!videoRef.current || !videoCanvasRef.current || !streamRef.current || !modelsLoadedRef.current) return

      try {
        // Use SsdMobilenetv1 with age and gender detection
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.SsdMobilenetv1Options({ minConfidence: detectionMinConfidence }),
          )
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender() // Add age and gender detection

        // Resize detections to match display size
        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        // Clear previous drawings
        const ctx = videoCanvasRef.current.getContext("2d")
        if (ctx) ctx.clearRect(0, 0, videoCanvasRef.current.width, videoCanvasRef.current.height)

        // Draw boxes and landmarks
        faceapi.draw.drawDetections(videoCanvasRef.current, resizedDetections)
        faceapi.draw.drawFaceLandmarks(videoCanvasRef.current, resizedDetections)

        // Draw expressions, age and gender
        resizedDetections.forEach((detection, i) => {
          const box = detection.detection.box

          // Get top expression
          const topExpression = getTopExpression(detection.expressions)

          // Format age and gender
          const { age, gender, genderProbability } = detection
          const ageGenderText = `${Math.round(age)} years, ${gender} (${Math.round(genderProbability * 100)}%)`

          // Draw combined text
          const text = [`${topExpression}`, ageGenderText]
          const anchor = box.bottomLeft
          const drawOptions = {
            anchorPosition: "BOTTOM_LEFT",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            fontColor: "white",
            fontSize: 14,
            padding: 5,
          }
          const drawBox = new faceapi.draw.DrawTextField(text, anchor, drawOptions)
          drawBox.draw(videoCanvasRef.current)
        })

        // Continue detection loop if stream is active
        if (streamRef.current?.active) {
          animationFrameRef.current = requestAnimationFrame(detectFaces)
        }
      } catch (error) {
        console.error("Error in real-time detection:", error)
      }
    }

    detectFaces()
  }

  // Handle uploaded video playback and detection - COMPLETELY REWRITTEN FOR RELIABILITY
  const toggleVideoPlayback = () => {
    if (!uploadedVideoRef.current || !uploadedVideo) return

    if (isVideoPlaying) {
      // Pause video
      uploadedVideoRef.current.pause()
      setIsVideoPlaying(false)

      // Stop detection
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
        videoDetectionIntervalRef.current = null
      }
      setVideoDetectionActive(false)
    } else {
      // Play video
      uploadedVideoRef.current.play().catch((error) => {
        console.error("Error playing video:", error)
        setDebugInfo(`Error playing video: ${error.message}`)
      })
      setIsVideoPlaying(true)

      // Start detection if not already active
      if (!videoDetectionActive) {
        startVideoDetection()
      }
    }
  }

  // SIMPLIFIED VIDEO DETECTION - completely rewritten for maximum reliability
  const startVideoDetection = () => {
    if (!uploadedVideoRef.current || !uploadedVideoCanvasRef.current || !modelsLoadedRef.current) {
      setDebugInfo("Missing required references for video detection")
      return
    }

    setVideoDetectionActive(true)
    setDebugInfo("Starting video detection...")

    const videoElement = uploadedVideoRef.current
    const canvasElement = uploadedVideoCanvasRef.current

    // Ensure video is playing
    if (videoElement.paused) {
      videoElement.play().catch((error) => {
        setDebugInfo(`Error playing video: ${error.message}`)
        return
      })
      setIsVideoPlaying(true)
    }

    // Set up canvas dimensions once video metadata is loaded
    const setupCanvas = () => {
      // Get video dimensions
      const videoWidth = videoElement.videoWidth || 640
      const videoHeight = videoElement.videoHeight || 480

      // Set canvas dimensions to match video
      canvasElement.width = videoWidth
      canvasElement.height = videoHeight

      // Set up the frame extraction canvas
      if (videoFrameCanvasRef.current) {
        videoFrameCanvasRef.current.width = videoWidth
        videoFrameCanvasRef.current.height = videoHeight
      }

      setDebugInfo(`Video dimensions: ${videoWidth}x${videoHeight}, canvas ready`)
    }

    // If video metadata is not loaded yet, wait for it
    if (videoElement.readyState < 2) {
      // HAVE_CURRENT_DATA or higher
      setDebugInfo("Waiting for video metadata to load...")
      videoElement.addEventListener("loadeddata", setupCanvas, { once: true })
    } else {
      setupCanvas()
    }

    // Clear any existing detection interval
    if (videoDetectionIntervalRef.current) {
      clearInterval(videoDetectionIntervalRef.current)
    }

    // Set up detection interval - using setInterval for more reliable timing
    videoDetectionIntervalRef.current = setInterval(async () => {
      if (!videoElement || !canvasElement || !modelsLoadedRef.current || videoElement.paused) {
        return
      }

      try {
        // Update progress
        const progress = (videoElement.currentTime / videoElement.duration) * 100
        setVideoProgress(progress)

        // Only process every Nth frame for better performance
        frameCounterRef.current++
        if (frameCounterRef.current % detectionFrequency !== 0) {
          return
        }

        setDebugInfo(`Processing frame at ${videoElement.currentTime.toFixed(2)}s...`)

        // Extract current frame to canvas
        if (!videoFrameCanvasRef.current) return

        const ctx = videoFrameCanvasRef.current.getContext("2d")
        if (!ctx) return

        // Draw current video frame to the hidden canvas
        ctx.drawImage(videoElement, 0, 0, videoFrameCanvasRef.current.width, videoFrameCanvasRef.current.height)

        // Detect faces in the current frame
        let detections
        try {
          // Try with SsdMobilenetv1 first
          detections = await faceapi
            .detectAllFaces(
              videoFrameCanvasRef.current,
              new faceapi.SsdMobilenetv1Options({ minConfidence: detectionMinConfidence }),
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()

          setDebugInfo(`SsdMobilenetv1 found ${detections.length} faces`)
        } catch (error) {
          // Fallback to TinyFaceDetector if SsdMobilenetv1 fails
          setDebugInfo(`SsdMobilenetv1 failed, trying TinyFaceDetector...`)

          detections = await faceapi
            .detectAllFaces(
              videoFrameCanvasRef.current,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: detectionMinConfidence,
              }),
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()

          setDebugInfo(`TinyFaceDetector found ${detections.length} faces`)
        }

        setVideoFacesDetected(detections.length)

        // Add this to the startVideoDetection function in the detect page
        // Add this after the line that sets videoFacesDetected
        if (user && detections.length > 0 && frameCounterRef.current % 30 === 0) {
          // Save a frame every ~10 seconds (assuming 30fps)
          try {
            // Create a snapshot from the current video frame
            const snapshot = videoFrameCanvasRef.current.toDataURL("image/jpeg")

            // Save to history
            saveToHistory({
              type: "video",
              faceCount: detections.length,
              preview: snapshot,
            })

            setDebugInfo(`Saved video frame with ${detections.length} faces to history`)
          } catch (error) {
            console.error("Error saving video frame:", error)
          }
        }

        // Draw results on canvas
        const canvasCtx = canvasElement.getContext("2d")
        if (!canvasCtx) return

        // Clear previous drawings
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

        // Resize detections to match canvas size
        const displaySize = {
          width: canvasElement.width,
          height: canvasElement.height,
        }

        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        // Draw boxes and landmarks
        faceapi.draw.drawDetections(canvasElement, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvasElement, resizedDetections)

        // Draw expressions, age and gender
        resizedDetections.forEach((detection) => {
          const box = detection.detection.box

          // Get top expression
          const topExpression = getTopExpression(detection.expressions)

          // Format age and gender
          const { age, gender, genderProbability } = detection
          const ageGenderText = `${Math.round(age)} years, ${gender} (${Math.round(genderProbability * 100)}%)`

          // Draw combined text
          const text = [`${topExpression}`, ageGenderText]
          const anchor = box.bottomLeft
          const drawOptions = {
            anchorPosition: "BOTTOM_LEFT",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            fontColor: "white",
            fontSize: 14,
            padding: 5,
          }
          const drawBox = new faceapi.draw.DrawTextField(text, anchor, drawOptions)
          drawBox.draw(canvasElement)
        })
      } catch (error) {
        console.error("Error processing video frame:", error)
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }, 200) // Process every 200ms

    // Add event listener for video ended
    videoElement.addEventListener("ended", () => {
      setIsVideoPlaying(false)
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
      }
    })
  }

  // Capture frame from webcam
  const captureFrame = async () => {
    if (!videoRef.current || !videoCanvasRef.current || !streamRef.current || !modelsLoadedRef.current) return

    try {
      setIsLoading(true)

      // Create temporary canvas to capture the frame
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      // Draw current video frame to canvas
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      }

      // Convert to image
      const imageUrl = canvas.toDataURL("image/png")
      setUploadedImage(imageUrl)

      // Switch to upload tab to show the captured image
      setActiveTab("upload")

      // Stop webcam
      stopWebcam()

      // Save to history if user is logged in
      if (user) {
        saveToHistory({
          type: "capture",
          faceCount: detectionResults?.length || 0,
          preview: imageUrl,
        })
      }

      toast({
        title: "Frame captured",
        description: "Webcam frame has been captured and is ready for processing",
      })
    } catch (error) {
      console.error("Error capturing frame:", error)
      toast({
        title: "Capture failed",
        description: "Failed to capture frame from webcam",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get top expression from face
  const getTopExpression = (expressions: any) => {
    let topExpression = "neutral"
    let maxScore = 0

    Object.entries(expressions).forEach(([expression, score]: [string, any]) => {
      if (score > maxScore) {
        maxScore = score
        topExpression = expression
      }
    })

    return `${topExpression} (${Math.round(maxScore * 100)}%)`
  }

  // Save detection to history using Firebase
  const saveToHistory = async (data: { type: string; faceCount: number; preview: string }) => {
    if (!user) return null

    try {
      // Save to Firestore
      await dbService.saveDetection({
        userId: user.uid,
        type: data.type,
        faceCount: data.faceCount,
        preview: data.preview,
      })

      console.log("Saved to history:", data)
    } catch (error) {
      console.error("Error saving to history:", error)
    }
  }

  // Download detection results
  const downloadResults = () => {
    if (!detectionResults) return

    const dataStr = JSON.stringify(
      {
        detections: detectionResults.map((d) => ({
          x: d.box.x,
          y: d.box.y,
          width: d.box.width,
          height: d.box.height,
          score: d.score,
        })),
        expressions: expressions || [],
        ageGender: ageGenderResults || [],
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    )

    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const link = document.createElement("a")
    link.setAttribute("href", dataUri)
    link.setAttribute("download", `face-detection-${Date.now()}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle tab change
  useEffect(() => {
    if (activeTab === "webcam" && modelsLoadedRef.current) {
      startWebcam()
    } else {
      stopWebcam()
    }

    // Stop video playback when switching tabs
    if (activeTab !== "video" && isVideoPlaying) {
      if (uploadedVideoRef.current) {
        uploadedVideoRef.current.pause()
      }
      setIsVideoPlaying(false)
      if (videoDetectionIntervalRef.current) {
        clearInterval(videoDetectionIntervalRef.current)
      }
    }
  }, [activeTab])

  // Set up video element when video is uploaded
  useEffect(() => {
    if (uploadedVideo && uploadedVideoRef.current) {
      // Set up video element when it's loaded
      const handleVideoLoaded = () => {
        if (uploadedVideoRef.current && uploadedVideoCanvasRef.current) {
          // Ensure canvas is properly sized
          uploadedVideoCanvasRef.current.width = uploadedVideoRef.current.videoWidth
          uploadedVideoCanvasRef.current.height = uploadedVideoRef.current.videoHeight
          console.log("Video loaded, dimensions:", {
            width: uploadedVideoRef.current.videoWidth,
            height: uploadedVideoRef.current.videoHeight,
          })
        }
      }

      uploadedVideoRef.current.addEventListener("loadedmetadata", handleVideoLoaded)

      return () => {
        if (uploadedVideoRef.current) {
          uploadedVideoRef.current.removeEventListener("loadedmetadata", handleVideoLoaded)
        }
      }
    }
  }, [uploadedVideo])

  // Adjust detection confidence
  const decreaseConfidence = () => {
    setDetectionMinConfidence(Math.max(0.1, detectionMinConfidence - 0.1))
  }

  const increaseConfidence = () => {
    setDetectionMinConfidence(Math.min(0.9, detectionMinConfidence + 0.1))
  }

  // Adjust detection frequency
  const decreaseFrequency = () => {
    setDetectionFrequency(Math.max(1, detectionFrequency - 1))
  }

  const increaseFrequency = () => {
    setDetectionFrequency(Math.min(10, detectionFrequency + 1))
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Face Detection</h1>

      {isModelLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[400px]">
            <Spinner className="mb-4" />
            <h3 className="text-lg font-medium">Loading face detection models</h3>
            <p className="text-muted-foreground">This may take a moment...</p>
          </CardContent>
        </Card>
      ) : modelLoadingError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[400px]">
            <div className="text-destructive mb-4">
              <X className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium">Failed to load models</h3>
            <p className="text-muted-foreground text-center max-w-md mt-2">{modelLoadingError}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload" disabled={isLoading}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="video" disabled={isLoading}>
              <Film className="h-4 w-4 mr-2" />
              Upload Video
            </TabsTrigger>
            <TabsTrigger value="webcam" disabled={isLoading}>
              <Camera className="h-4 w-4 mr-2" />
              Webcam
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload and Preview */}
              <Card>
                <CardContent className="p-6">
                  {!uploadedImage ? (
                    <div
                      {...getImageRootProps()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[300px] flex flex-col items-center justify-center"
                    >
                      <input {...getImageInputProps()} />
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-1">Upload an image</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag & drop an image here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground">Supports: JPG, PNG</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <img
                          ref={imageRef}
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Uploaded image"
                          className="rounded-lg max-h-[400px] w-auto mx-auto"
                          crossOrigin="anonymous"
                        />
                        <canvas ref={canvasRef} className="absolute top-0 left-0 z-10" />
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 z-20"
                        onClick={() => {
                          setUploadedImage(null)
                          setDetectionResults(null)
                          setExpressions(null)
                          setAgeGenderResults(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detection Controls and Results */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-medium">Face Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload an image to detect faces, expressions, age, and gender
                      </p>
                    </div>

                    <Button
                      onClick={handleImageDetection}
                      disabled={!uploadedImage || isLoading || !modelsLoadedRef.current}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>Detect Faces</>
                      )}
                    </Button>

                    {!modelsLoadedRef.current && (
                      <Alert>
                        <AlertDescription>
                          Face detection models are still loading. Please wait a moment.
                        </AlertDescription>
                      </Alert>
                    )}

                    {detectionResults && (
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Results</h4>
                          <Button size="sm" variant="outline" onClick={downloadResults}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>

                        {detectionResults.length === 0 ? (
                          <Alert>
                            <AlertDescription>No faces detected in the image.</AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">
                                {detectionResults.length} {detectionResults.length === 1 ? "face" : "faces"} detected
                              </Badge>
                            </div>

                            {expressions &&
                              ageGenderResults &&
                              expressions.map((expr, i) => (
                                <div key={i} className="p-3 bg-muted rounded-md">
                                  <h5 className="font-medium mb-2">Face {i + 1}</h5>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="col-span-2 mb-1">
                                      <span className="font-medium">Age:</span> {Math.round(ageGenderResults[i].age)}{" "}
                                      years
                                    </div>
                                    <div className="col-span-2 mb-2">
                                      <span className="font-medium">Gender:</span> {ageGenderResults[i].gender} (
                                      {Math.round(ageGenderResults[i].genderProbability * 100)}%)
                                    </div>
                                    <div className="col-span-2 font-medium mb-1">Expressions:</div>
                                    {Object.entries(expr).map(([emotion, score]: [string, any]) => (
                                      <div key={emotion} className="flex justify-between">
                                        <span className="capitalize">{emotion}:</span>
                                        <span className="font-mono">{Math.round(score * 100)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Upload and Preview */}
              <Card>
                <CardContent className="p-6">
                  {!uploadedVideo ? (
                    <div
                      {...getVideoRootProps()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[300px] flex flex-col items-center justify-center"
                    >
                      <input {...getVideoInputProps()} />
                      <Film className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-1">Upload a video</h3>
                      <p className="text-sm text-muted-foreground mb-2">Drag & drop a video here, or click to select</p>
                      <p className="text-xs text-muted-foreground">Supports: MP4, WebM, MOV</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={uploadedVideoRef}
                          src={uploadedVideo}
                          className="max-h-[400px] w-auto mx-auto"
                          playsInline
                          onEnded={() => setIsVideoPlaying(false)}
                          crossOrigin="anonymous"
                        />
                        <canvas ref={uploadedVideoCanvasRef} className="absolute top-0 left-0 z-10" />
                      </div>
                      <div className="absolute top-2 right-2 z-20 flex gap-2">
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => {
                            setUploadedVideo(null)
                            if (videoDetectionIntervalRef.current) {
                              clearInterval(videoDetectionIntervalRef.current)
                            }
                            setIsVideoPlaying(false)
                            setVideoDetectionActive(false)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-medium">Video Face Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a video to detect faces, expressions, age, and gender in real-time
                      </p>
                    </div>

                    {!modelsLoadedRef.current && (
                      <Alert>
                        <AlertDescription>
                          Face detection models are still loading. Please wait a moment.
                        </AlertDescription>
                      </Alert>
                    )}

                    {uploadedVideo && (
                      <>
                        <div className="flex gap-2">
                          <Button onClick={toggleVideoPlayback} className="flex-1" disabled={!modelsLoadedRef.current}>
                            {isVideoPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Play with Detection
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round(videoProgress)}%</span>
                          </div>
                          <Progress value={videoProgress} className="h-2" />
                        </div>

                        <div className="p-3 bg-muted rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Current detection:</span>
                            <Badge variant="outline">
                              {videoFacesDetected} {videoFacesDetected === 1 ? "face" : "faces"} detected
                            </Badge>
                          </div>
                        </div>

                        {videoDetectionActive && videoFacesDetected === 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <AlertDescription>
                              No faces detected. Try adjusting the detection settings below.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="p-3 border rounded-md space-y-4">
                          <h4 className="font-medium">Detection Settings</h4>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Confidence Threshold: {(detectionMinConfidence * 100).toFixed(0)}%
                              </span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={decreaseConfidence}>
                                  -
                                </Button>
                                <Button size="sm" variant="outline" onClick={increaseConfidence}>
                                  +
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Lower percentage = more sensitive detection (may detect more faces but with lower
                              accuracy)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                Processing Frequency: Every {detectionFrequency} frame
                                {detectionFrequency > 1 ? "s" : ""}
                              </span>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={decreaseFrequency}>
                                  -
                                </Button>
                                <Button size="sm" variant="outline" onClick={increaseFrequency}>
                                  +
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Lower value = more frequent detection (better tracking but may be slower)
                            </p>
                          </div>
                        </div>

                        {debugMode && (
                          <div className="p-3 bg-black text-green-400 rounded-md font-mono text-xs overflow-auto max-h-32">
                            <div className="flex items-center mb-1">
                              <Bug className="h-3 w-3 mr-1" />
                              <span className="font-bold">Debug Info:</span>
                            </div>
                            {debugInfo || "No debug information available"}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDebugMode(!debugMode)}
                            className="text-xs"
                          >
                            {debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                          </Button>
                        </div>

                        <div className="rounded-lg border p-4">
                          <h4 className="font-medium mb-2">Instructions</h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                              Upload a video with visible faces
                            </li>
                            <li className="flex items-start">
                              <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                              Click "Play with Detection" to start processing
                            </li>
                            <li className="flex items-start">
                              <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                              Adjust settings if faces aren't being detected
                            </li>
                          </ul>
                        </div>
                      </>
                    )}

                    {user ? (
                      <p className="text-xs text-muted-foreground">
                        Video detection results will be saved to your history
                      </p>
                    ) : (
                      <Alert>
                        <AlertDescription className="text-xs">
                          <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                          </Link>{" "}
                          to save your detection history
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webcam" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Webcam Feed */}
              <Card>
                <CardContent className="p-6">
                  <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
                    <video ref={videoRef} autoPlay muted playsInline className="max-h-[400px] w-auto mx-auto" />
                    <canvas ref={videoCanvasRef} className="absolute top-0 left-0 z-10" />
                    {!streamRef.current && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-center p-4">
                        <div>
                          <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p>Camera is not active</p>
                          <p className="text-sm text-muted-foreground mt-1">Click the button below to start</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Webcam Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-medium">Live Face Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Use your webcam for real-time face detection with age and gender analysis
                      </p>
                    </div>

                    {!modelsLoadedRef.current && (
                      <Alert>
                        <AlertDescription>
                          Face detection models are still loading. Please wait a moment.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      {!streamRef.current ? (
                        <Button onClick={startWebcam} className="flex-1" disabled={!modelsLoadedRef.current}>
                          <Video className="h-4 w-4 mr-2" />
                          Start Camera
                        </Button>
                      ) : (
                        <>
                          <Button onClick={stopWebcam} variant="outline" className="flex-1">
                            <X className="h-4 w-4 mr-2" />
                            Stop Camera
                          </Button>

                          <Button
                            onClick={captureFrame}
                            variant="secondary"
                            className="flex-1"
                            disabled={isLoading || !modelsLoadedRef.current}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture Frame
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium mb-2">Instructions</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                          Position your face in the camera view
                        </li>
                        <li className="flex items-start">
                          <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                          Make sure there's good lighting
                        </li>
                        <li className="flex items-start">
                          <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                          Click "Capture Frame" to analyze a specific moment
                        </li>
                      </ul>
                    </div>

                    {user ? (
                      <p className="text-xs text-muted-foreground">Captured frames will be saved to your history</p>
                    ) : (
                      <Alert>
                        <AlertDescription className="text-xs">
                          <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                          </Link>{" "}
                          to save your detection history
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

