"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { signIn, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthTestPage() {
  const { data: session, status } = useSession()

  return (
    <div className="container py-8 flex flex-col items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <p>
              <strong>Status:</strong> {status}
            </p>
            <pre className="mt-2 text-xs overflow-auto max-h-40">{JSON.stringify(session, null, 2)}</pre>
          </div>

          <div className="flex gap-2">
            {status === "authenticated" ? (
              <Button onClick={() => signOut({ redirect: true, callbackUrl: "/" })}>Sign Out</Button>
            ) : (
              <Button onClick={() => signIn()}>Sign In</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

