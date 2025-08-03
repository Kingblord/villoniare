"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorAlertProps {
  message: string
  type?: "error" | "success"
  onClose?: () => void
}

export function ErrorAlert({ message, type = "error", onClose }: ErrorAlertProps) {
  return (
    <Alert variant={type === "error" ? "destructive" : "success"} className="mb-4">
      {type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
      <div className="flex items-center justify-between">
        <AlertDescription className="flex-1">{message}</AlertDescription>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 ml-2">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Alert>
  )
}
