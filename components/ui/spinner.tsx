import type React from "react"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return <div className={cn("animate-spin rounded-full h-6 w-6 border-b-2 border-primary", className)} {...props} />
}

