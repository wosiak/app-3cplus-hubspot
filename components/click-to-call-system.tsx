"use client"

import { useCallSocket } from "@/hooks/useCallSocket"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CallingExtensions from '@hubspot/calling-extensions-sdk';

export default function ClickToCallSystem() {
  const [agentToken, setAgentToken] = useState("")
  const [campaignId, setCampaignId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [agentStatus, setAgentStatus] = useState<"disconnected" | "connected" | "logged_in" | "calling" | "finished">("disconnected")
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" | null }>({
    message: "",
    type: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  useCallSocket({
    agentToken,
    onEvent: (event, payload) => {
      console.log("🔔 Evento do socket:", event, payload)

      if (event === "agent-is-connected") {
        setAgentStatus("connected")
        setStatus({ message: "Extensão conectada! Pronto para login.", type: "success" })
      }

      if (event === "agent-entered-manual") {
        setAgentStatus("logged_in")
        setStatus({ message: "Login na campanha feito! Pronto para discar.", type: "success" })
      }

      if (event === "call-was-connected") {
        const callId = payload?.call?.id
        setActiveCallId(callId || null)
        setAgentStatus("calling")
        setStatus({ message: `Ligando para ${payload?.call?.phone}`, type: "success" })
      }

      if (event === "call-ended") {
        setAgentStatus("finished")
        setStatus({ message: "Ligacão finalizada.", type: "info" })
        setActiveCallId(null)
      }

      if (event === "disconnected") {
        setAgentStatus("disconnected")
        setStatus({ message: "Desconectado do servidor.", type: "error" })
      }
    },
  })

  const registerExtension = () => {
    if (!agentToken) {
      setStatus({ message: "Agent Token is required", type: "error" })
      return
    }

    const url = `https://app.3c.plus/extension?api_token=${encodeURIComponent(agentToken)}`
    window.open(url, "_blank", "width=800,height=600")

    setStatus({ message: "Janela de extensão aberta. Complete e volte aqui.", type: "info" })
  }

  const login = async () => {
    if (!agentToken || !campaignId) {
      setStatus({ message: "Agent Token e Campaign ID obrigatórios", type: "error" })
      return
    }

    setIsLoading(true)
    setStatus({ message: "Efetuando login...", type: "info" })

    try {
      const response = await fetch(
        `https://app.3c.plus/api/v1/agent/login?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign: campaignId, mode: "manual" }),
        }
      )

      if (!response.ok) throw new Error("Login failed")

      await response.text()
      setStatus({ message: "Login realizado com sucesso!", type: "success" })
    } catch (err) {
      setStatus({ message: "Erro ao logar na campanha.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const makeCall = async () => {
    if (!phoneNumber) {
      setStatus({ message: "Telefone é obrigatório", type: "error" })
      return
    }

    setIsLoading(true)
    setStatus({ message: "Iniciando chamada...", type: "info" })

    try {
      const response = await fetch(
        `https://app.3c.plus/api/v1/agent/manual_call/dial?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber }),
        }
      )

      if (!response.ok) throw new Error("Erro ao discar")

      const data = await response.json()
      setStatus({ message: "Ligacão iniciada com sucesso", type: "success" })
    } catch (err) {
      setStatus({ message: "Erro ao iniciar ligação.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const hangupCall = async () => {
    if (!activeCallId) return

    setIsLoading(true)
    setStatus({ message: "Desligando chamada...", type: "info" })

    try {
      const res = await fetch(`https://app.3c.plus/api/v1/agent/call/${activeCallId}/hangup?api_token=${agentToken}`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Erro ao encerrar")

      setStatus({ message: "Chamada encerrada com sucesso.", type: "success" })
      setAgentStatus("finished")
      setActiveCallId(null)
      setPhoneNumber("")
    } catch (err) {
      setStatus({ message: "Erro ao encerrar chamada.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3C Plus Click-to-Call</CardTitle>
        <CardDescription>
          {agentStatus === "disconnected" && "Conecte sua extensão para começar"}
          {agentStatus === "connected" && "Login para acessar campanha manual"}
          {agentStatus === "logged_in" && "Pronto para discar"}
          {agentStatus === "calling" && "Ligando..."}
          {agentStatus === "finished" && "Ligacão encerrada."}
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

        {(agentStatus === "disconnected" || agentStatus === "connected") && (
          <>
            <Label>Agent Token</Label>
            <Input value={agentToken} onChange={(e) => setAgentToken(e.target.value)} />

            <Label>Campaign ID</Label>
            <Input value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          </>
        )}

        {agentStatus === "logged_in" && (
          <>
            <Label>Número do cliente</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {agentStatus === "disconnected" && (
          <Button onClick={registerExtension} disabled={!agentToken}>Registrar Extensão</Button>
        )}

        {agentStatus === "connected" && (
          <Button onClick={login} disabled={isLoading || !agentToken || !campaignId}>
            {isLoading ? "Conectando..." : "Fazer Login"}
          </Button>
        )}

        {agentStatus === "logged_in" && (
          <Button onClick={makeCall} disabled={isLoading || !phoneNumber}>
            <Phone className="mr-2 h-4 w-4" />
            {isLoading ? "Ligando..." : "Discar"}
          </Button>
        )}

        {agentStatus === "calling" && activeCallId && (
          <Button variant="destructive" onClick={hangupCall}>
            Encerrar Ligação
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
