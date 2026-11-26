"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, ImageIcon, Trash2, ChevronLeft, ChevronRight, Camera, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/components/auth-context"
import { dbService, type DetectionHistory } from "@/lib/db-service"

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [history, setHistory] = useState<DetectionHistory[]>([])
  const [selectedType, setSelectedType] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  // Load history data
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return

      setIsHistoryLoading(true)

      try {
        // Get history from Firestore
        const historyData = await dbService.getDetectionHistory(user.uid)
        setHistory(historyData || [])
      } catch (error) {
        console.error("Error loading history:", error)
        toast({
          title: "Error",
          description: "Failed to load detection history",
          variant: "destructive",
        })
      } finally {
        setIsHistoryLoading(false)
      }
    }

    if (user) {
      loadHistory()
    }
  }, [user])

  // Filter history based on selected type
  const filteredHistory = history.filter((item) => {
    if (selectedType === "all") return true
    return item.type === selectedType
  })

  // Paginate history
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Delete history item
  const deleteHistoryItem = async (id: string) => {
    try {
      await dbService.deleteDetection(id)
      setHistory(history.filter((item) => item.id !== id))

      toast({
        title: "Item deleted",
        description: "Detection history item has been removed",
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast({
        title: "Error",
        description: "Failed to delete history item",
        variant: "destructive",
      })
    }
  }

  // Format date
  const formatDate = (dateString: Date | any) => {
    const date = dateString instanceof Date ? dateString : dateString.toDate()
    return date.toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Detection History</h1>
          <p className="text-muted-foreground">View and manage your past face detection results</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Uploaded images</SelectItem>
              <SelectItem value="capture">Camera captures</SelectItem>
              <SelectItem value="video">Video frames</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isHistoryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(null)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-0">
                  <Skeleton className="h-[150px] w-full rounded-t-lg" />
                </CardHeader>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No detection history found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {selectedType === "all"
                ? "You haven't performed any face detections yet. Try detecting faces in an image or using your webcam."
                : `No ${selectedType === "image" ? "uploaded images" : selectedType === "capture" ? "camera captures" : "video frames"} found in your history.`}
            </p>
            <Button asChild>
              <a href="/detect">Try face detection</a>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedHistory.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative bg-muted">
                  <img
                    src={item.preview || "/placeholder.svg?height=150&width=200"}
                    alt={`Detection from ${formatDate(item.timestamp)}`}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={item.type === "image" ? "default" : item.type === "video" ? "outline" : "secondary"}
                    >
                      {item.type === "image" ? (
                        <>
                          <ImageIcon className="h-3 w-3 mr-1" /> Uploaded
                        </>
                      ) : item.type === "video" ? (
                        <>
                          <Clock className="h-3 w-3 mr-1" /> Video
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3 mr-1" /> Captured
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Detection Result</h3>
                      <p className="text-sm text-muted-foreground">{formatDate(item.timestamp)}</p>
                    </div>
                    <Badge variant={item.faceCount > 0 ? "outline" : "destructive"}>
                      {item.faceCount} {item.faceCount === 1 ? "face" : "faces"}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/detect/details/${item.id}`)}
                  >
                    View Details
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteHistoryItem(item.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm">
                  Page {currentPage} of {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

