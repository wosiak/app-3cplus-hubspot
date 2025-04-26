"use client"

import { useCallSocket } from "@/hooks/useCallSocket"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CallingExtensions from "@hubspot/calling-extensions-sdk"

export default function ClickToCallSystem() {
  const [agentToken, setAgentToken] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [campaigns, setCampaigns] = useState<{ id: number; name: string }[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: number; name: string } | null>(null)
  const [agentStatus, setAgentStatus] = useState<"disconnected" | "extension_opened" | "connected" | "logged_in" | "calling" | "finished">("disconnected")
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" | null }>({
    message: "",
    type: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`https://app.3c.plus/api/v1/groups-and-campaigns?all=true&paused=0&api_token=${agentToken}`)
      const json = await res.json()
      if (json?.data) setCampaigns(json.data.filter((c: any) => c.type === "campaign"))
    } catch (err) {
      setStatus({ message: "Erro ao buscar campanhas", type: "error" })
    }
  }

  useCallSocket({
    agentToken,
    onEvent: (event, payload) => {
      console.log("🔔 Evento do socket:", event, payload)

      if (event === "connected") {
        setAgentStatus("connected")
        setStatus({ message: "Extensão conectada! Pronto para login.", type: "success" })
        fetchCampaigns()
      }

      if (event === "agent-entered-manual") {
        setAgentStatus("logged_in")
      
        // Tentamos obter a campanha logada a partir da lista de campanhas (opcional mas seguro)
        const campaignId = payload?.campaign_id
        const campaign = campaigns.find((c) => c.id === campaignId)
      
        if (campaign) {
          setSelectedCampaign(campaign)
          setStatus({ message: `Modo Manual: Campanha ${campaign.name}`, type: "success" })
        } else if (selectedCampaign) {
          setStatus({ message: `Modo Manual: Campanha ${selectedCampaign.name}`, type: "success" })
        } else {
          setStatus({ message: "Login realizado! Pronto para discar.", type: "success" })
        }
      
        // Oculta campanhas do front ao logar
        setCampaigns([])
      }      

      if (event === "call-was-connected") {
        const callId = payload?.call?.id
        setActiveCallId(callId || null)
        setAgentStatus("calling")
        setStatus({ message: `Ligando para ${payload?.call?.phone}`, type: "success" })
      }

      if (event === "call-ended") {
        setAgentStatus("finished")
        setStatus({ message: `Ligação finalizada com ${phoneNumber}.`, type: "info" })
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
      setStatus({ message: "Agent Token é obrigatório", type: "error" })
      return
    }
    const url = `https://app.3c.plus/extension?api_token=${encodeURIComponent(agentToken)}`
    window.open(url, "_blank", "width=800,height=600")
    setAgentStatus("extension_opened")
    setStatus({ message: "Extensão aberta. Agora clique em 'Fazer login'.", type: "info" })
  }

  const login = async (id: number, name: string) => {
    setIsLoading(true)
    setSelectedCampaign({ id, name })
    setStatus({ message: "Efetuando login...", type: "info" })

    try {
      const response = await fetch(`https://app.3c.plus/api/v1/agent/login?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign: id, mode: "manual" }),
        }
      )
      if (!response.ok) throw new Error("Login failed")
      await response.text()
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
      const response = await fetch(`https://app.3c.plus/api/v1/agent/manual_call/dial?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber }),
        }
      )
      if (!response.ok) throw new Error("Erro ao discar")
      await response.json()
      setStatus({ message: `Ligação iniciada com sucesso para ${phoneNumber}`, type: "success" })
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
          {agentStatus === "extension_opened" && "Clique em 'Fazer login' para continuar"}
          {agentStatus === "connected" && "Login para acessar campanha manual"}
          {agentStatus === "logged_in" && selectedCampaign && `Modo Manual: Campanha ${selectedCampaign.name}`}
          {agentStatus === "calling" && "Ligando..."}
          {agentStatus === "finished" && "Ligação encerrada."}
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

        {(agentStatus === "disconnected" || agentStatus === "extension_opened") && (
          <>
            <Label>Agent Token</Label>
            <Input value={agentToken} onChange={(e) => setAgentToken(e.target.value)} />
          </>
        )}

        {agentStatus === "connected" && campaigns.length > 0 && (
          <>
            <Label>Escolha a campanha</Label>
            <div className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <Button key={c.id} variant="outline" onClick={() => login(c.id, c.name)} disabled={isLoading}>
                  {c.name}
                </Button>
              ))}
            </div>
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