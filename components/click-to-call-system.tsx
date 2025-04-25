"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CallingExtensions from '@hubspot/calling-extensions-sdk';


enum Stage {
  INITIAL = 0,
  EXTENSION_REGISTERED = 1,
  LOGGED_IN = 2,
}

export default function ClickToCallSystem() {
  const [agentToken, setAgentToken] = useState("")
  const [campaignId, setCampaignId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [stage, setStage] = useState<Stage>(Stage.INITIAL)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" | null }>({
    message: "",
    type: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const registerExtension = () => {
    if (!agentToken) {
      setStatus({ message: "Agent Token is required", type: "error" })
      return
    }

    // Open the extension registration URL in a new window
    const url = `https://app.3c.plus/extension?api_token=${encodeURIComponent(agentToken)}`
    window.open(url, "_blank", "width=800,height=600")

    setStatus({ message: "Extension registration window opened. Complete registration and return here.", type: "info" })

    // In a real app, you might want to verify the extension was registered
    // For this demo, we'll just provide a button to confirm and move to the next stage
  }

  const confirmRegistration = () => {
    setStage(Stage.EXTENSION_REGISTERED)
    setStatus({ message: "Extension registered successfully", type: "success" })
  }

  const login = async () => {
    if (!agentToken || !campaignId) {
      setStatus({ message: "Agent Token and Campaign ID are required", type: "error" })
      return
    }

    setIsLoading(true)
    setStatus({ message: "Logging in...", type: "info" })

    try {
      const response = await fetch(
        `https://app.3c.plus/api/v1/agent/login?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "campaign": campaignId,
            "mode": "manual",
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`)
      }

      await response.text();
      setStage(Stage.LOGGED_IN)
      setStatus({ message: "Login successful", type: "success" })
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Login failed", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const makeCall = async () => {
    if (!phoneNumber) {
      setStatus({ message: "Phone number is required", type: "error" })
      return
    }

    setIsLoading(true)
    setStatus({ message: "Calling...", type: "info" })

    try {
      const response = await fetch(
        `https://app.3c.plus/api/v1/agent/manual_call/dial?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: phoneNumber,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Call failed: ${response.statusText}`)
      }

      const data = await response.json()
      setStatus({ message: "Call initiated successfully", type: "success" })
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Call failed", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {stage === Stage.INITIAL && "Register Extension"}
          {stage === Stage.EXTENSION_REGISTERED && "Agent Login"}
          {stage === Stage.LOGGED_IN && "Make a Call"}
        </CardTitle>
        <CardDescription>
          {stage === Stage.INITIAL && "Enter your credentials to register the extension"}
          {stage === Stage.EXTENSION_REGISTERED && "Login to your agent account"}
          {stage === Stage.LOGGED_IN && "Enter customer phone number to make a call"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.message && (
          <Alert variant={status.type === "error" ? "destructive" : "default"} className="mb-4">
            {status.type === "success" && <CheckCircle className="h-4 w-4" />}
            {status.type === "error" && <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {stage === Stage.INITIAL && (
          <>
            <div className="space-y-2">
              <Label htmlFor="agentToken">Agent Token</Label>
              <Input
                id="agentToken"
                value={agentToken}
                onChange={(e) => setAgentToken(e.target.value)}
                placeholder="Enter your agent token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaignId">Campaign ID</Label>
              <Input
                id="campaignId"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="Enter campaign ID"
              />
            </div>
          </>
        )}

        {stage === Stage.LOGGED_IN && (
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Customer Phone Number</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter customer phone number"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {stage === Stage.INITIAL && (
          <>
            <Button className="w-full" onClick={registerExtension} disabled={!agentToken}>
              Register Extension
            </Button>
            <Button variant="outline" className="w-full" onClick={confirmRegistration}>
              I've Completed Registration
            </Button>
          </>
        )}

        {stage === Stage.EXTENSION_REGISTERED && (
          <Button className="w-full" onClick={login} disabled={isLoading || !agentToken || !campaignId}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        )}

        {stage === Stage.LOGGED_IN && (
          <Button className="w-full" onClick={makeCall} disabled={isLoading || !phoneNumber}>
            <Phone className="mr-2 h-4 w-4" />
            {isLoading ? "Calling..." : "Call"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
