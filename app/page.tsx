"use client"

import Link from "next/link"
import { ArrowRight, Camera, Cloud, Shield, History } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-context"

export default function Home() {
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 md:px-6 space-y-10 xl:space-y-16">
          <div className="grid gap-4 px-4 sm:px-6 md:px-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Advanced Face Detection in Real-Time
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Detect faces in images, videos, or live camera feeds with precision. Get instant results with bounding
                boxes, confidence scores, and expression analysis.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                {user ? (
                  <Link href="/detect">
                    <Button size="lg" className="gap-1.5">
                      Start Detection <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/detect">
                      <Button size="lg" className="gap-1.5">
                        Try Now <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="lg" variant="outline">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative h-[350px] w-full max-w-[500px] rounded-lg border bg-background p-2 shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted">
                  <img
                    src="https://developers.google.com/static/ml-kit/vision/face-detection/images/face_contours.svg"
                    alt="Face detection example"
                    className="rounded-md object-cover"
                    width={480}
                    height={320}
                  />
                </div>
                <div className="absolute left-[30%] top-[40%] h-16 w-16 rounded-lg border-2 border-primary animate-pulse" />
                <div className="absolute left-[60%] top-[30%] h-16 w-16 rounded-lg border-2 border-primary animate-pulse" />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <Camera className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Real-Time Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Process live camera feeds with minimal latency for instant face detection.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Cloud className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Cloud Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Save detection results in the cloud for easy access from any device.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Shield className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Privacy-Focused</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We prioritize your data privacy with secure processing and storage.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <History className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Detection History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Keep track of all your past detections with timestamps and results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to get started?</h2>
              <p className="mx-auto max-w-[700px] text-primary-foreground/80 md:text-xl">
                Try our face detection technology now and experience the accuracy for yourself.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/detect">
                <Button variant="secondary" size="lg">
                  {user ? "Start Detection" : "Try for Free"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

