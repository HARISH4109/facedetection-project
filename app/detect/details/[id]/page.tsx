"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, ImageIcon, Camera, Clock, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/components/auth-context"
import { dbService, type DetectionHistory } from "@/lib/db-service"
import { toast } from "@/hooks/use-toast"

export default function DetectionDetailsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [detectionItem, setDetectionItem] = useState<DetectionHistory | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // Load detection details
  useEffect(() => {
    const loadDetectionDetails = async () => {
      if (!user || !params.id) return

      setIsLoading(true)

      try {
        // Get the specific detection
        const item = await dbService.getDetection(params.id as string)

        // Verify this detection belongs to the current user
        if (item.userId !== user.uid) {
          toast({
            title: "Access denied",
            description: "You don't have permission to view this detection",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        setDetectionItem(item)
      } catch (error) {
        console.error("Error loading detection details:", error)
        toast({
          title: "Error",
          description: "Failed to load detection details",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    if (user && params.id) {
      loadDetectionDetails()
    }
  }, [user, params.id, router])

  // Format date
  const formatDate = (dateString: Date | any) => {
    if (!dateString) return ""
    const date = dateString instanceof Date ? dateString : dateString.toDate()
    return date.toLocaleString()
  }

  if (authLoading || isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    )
  }

  if (!user || !detectionItem) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold">Detection Details</h1>
        <p className="text-muted-foreground">
          Viewing detailed information for detection from {formatDate(detectionItem.timestamp)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 border-b">
            <CardTitle>Detection Image</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative bg-black flex items-center justify-center">
              <img
                src={detectionItem.preview || "/placeholder.svg"}
                alt={`Detection from ${formatDate(detectionItem.timestamp)}`}
                className="max-h-[600px] w-auto mx-auto"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle>Detection Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Type:</span>
                <Badge
                  variant={
                    detectionItem.type === "image"
                      ? "default"
                      : detectionItem.type === "video"
                        ? "outline"
                        : "secondary"
                  }
                >
                  {detectionItem.type === "image" ? (
                    <>
                      <ImageIcon className="h-3 w-3 mr-1" /> Uploaded Image
                    </>
                  ) : detectionItem.type === "video" ? (
                    <>
                      <Clock className="h-3 w-3 mr-1" /> Video Frame
                    </>
                  ) : (
                    <>
                      <Camera className="h-3 w-3 mr-1" /> Camera Capture
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Faces Detected:</span>
                <Badge variant={detectionItem.faceCount > 0 ? "outline" : "destructive"}>
                  {detectionItem.faceCount} {detectionItem.faceCount === 1 ? "face" : "faces"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Date & Time:</span>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(detectionItem.timestamp)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Button className="w-full" onClick={() => window.open(detectionItem.preview, "_blank")}>
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>

              <Button variant="outline" className="w-full" onClick={() => router.push("/detect")}>
                <Camera className="h-4 w-4 mr-2" />
                New Detection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

