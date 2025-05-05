"use client"

import { useCallSocket } from "@/hooks/useCallSocket"
import { useState, useRef } from "react"
import clsx from "clsx"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ClickToCallSystem() {
  const [agentToken, setAgentToken] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [campaigns, setCampaigns] = useState<{ id: number; name: string }[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: number; name: string } | null>(null)
  const [agentStatus, setAgentStatus] = useState<"disconnected" | "extension_opened" | "connected" | "logged_in" | "dialing" | "in_call" | "finished">("disconnected")
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [telephonyId, setTelephonyId] = useState<string | null>(null)
  const [qualifications, setQualifications] = useState<{ id: number; name: string }[]>([])
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "info" | null }>({ message: "", type: null })
  const [isLoading, setIsLoading] = useState(false)
  const [qualified, setQualified] = useState<{ id: number; name: string } | null>(null)  
  const pendingQualificationsRef = useRef<{ id: number; name: string }[]>([])
  const [callInProgress, setCallInProgress] = useState(false)
  const [callAnswered, setCallAnswered] = useState(false)
  console.log("🧩 agentStatus:", agentStatus)
  console.log("🧩 qualifications:", qualifications)
  console.log("🧩 qualified:", qualified)
  console.log("🛑 call-ended", new Date().toISOString())
  console.log("✅ manual-call-was-answered", new Date().toISOString())


  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`https://app.3c.plus/api/v1/groups-and-campaigns?all=true&paused=0&api_token=${agentToken}`)
      const json = await res.json()
      if (json?.data) setCampaigns(json.data.filter((c: any) => c.type === "campaign"))
    } catch (err) {
      setStatus({ message: "Erro ao buscar campanhas", type: "error" })
    }
  }

  const qualifyCall = async (qualificationId: number) => {
    if (!activeCallId || !agentToken) {
      setStatus({ message: "Não há ligação ativa para qualificar.", type: "error" })
      return
    }

    try {
      const response = await fetch(
        `https://app.3c.plus/api/v1/agent/manual_call/${telephonyId}/qualify?api_token=${encodeURIComponent(agentToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ qualification_id: String(qualificationId)
           }),
        }
      )

      if (!response.ok) throw new Error("Erro ao qualificar chamada.")
      
      setQualified({ id: qualificationId, name: qualifications.find(q => q.id === qualificationId)?.name || "Qualificado" })
      setStatus({ message: "Ligação qualificada com sucesso!", type: "success" })
    } catch (err) {
      setStatus({ message: "Erro ao qualificar chamada.", type: "error" })
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
      
      if (event === "manual-call-was-answered") {
        setTimeout(() => {
          if (!callInProgress) {
            console.warn("⚠️ Call já foi encerrada. Ignorando setQualifications.")
            return
          }
      
          setCallAnswered(true) // 💥 Aqui!
          console.log("📦 Qualificações exibidas com delay:", pendingQualificationsRef.current)
          setQualifications(pendingQualificationsRef.current)
        }, 0)
      
        setStatus({ message: "Ligação atendida! Pode qualificar quando quiser.", type: "info" })
      }
                    
      
      if (event === "agent-entered-manual") {
        setAgentStatus("logged_in")
        const campaignId = payload?.campaign_id
        const campaign = campaigns.find((c) => c.id === campaignId)

        if (campaign) {
          setSelectedCampaign(campaign)
          setStatus({ message: `Modo Manual: Campanha ${campaign.name}`, type: "success" })
        } else {
          setStatus({ message: "Login realizado! Pronto para discar.", type: "success" })
        }

        setCampaigns([])
      }

      if (event === "call-was-connected") {
        const callId = payload?.call?.id
        const phone = payload?.call?.phone
        const telephony = payload?.call?.telephony_id
      
        setTelephonyId(telephony || null)
        setActiveCallId(callId || null)
        setAgentStatus("in_call")
        setCallInProgress(true)
      
        if (phone) {
          setPhoneNumber(phone)
          setStatus({ message: `Ligação conectada com o número: ${phone}!`, type: "success" })
        } else {
          setStatus({ message: "Ligação conectada!", type: "success" })
        }
      
        const qualificationsList =  payload?.call?.campaign?.dialer?.qualification_list?.qualifications || payload?.campaign?.dialer?.qualification_list?.qualifications

        if (qualificationsList && Array.isArray(qualificationsList)) {
          pendingQualificationsRef.current = qualificationsList.map((q: any) => ({
            id: q.id,
            name: q.name,
          }))
          console.log("✅ Qualificações salvas no ref:", pendingQualificationsRef.current)
        }
      }
      
      if (event === "manual-call-was-answered") {
        setTimeout(() => {
          if (!callInProgress) {
            console.warn("⚠️ Call já foi encerrada. Ignorando setQualifications.")
            return
          }
        
          console.log("📦 Qualificações exibidas com delay:", pendingQualificationsRef.current)
          setQualifications(pendingQualificationsRef.current)
        }, 0)
        setStatus({ message: "Ligação atendida! Pode qualificar quando quiser.", type: "info" })        
      }     
           
      if (event === "call-ended") {
        setAgentStatus("finished")
        setStatus({ message: `Ligação finalizada com ${phoneNumber}.`, type: "info" })
        setActiveCallId(null)
        setPhoneNumber("")
        setCallInProgress(false)
      
        // 🧼 Adia o reset para garantir que o manual-call-was-answered finalize antes
        setTimeout(() => {
          setQualifications([])
          setQualified(null)
          pendingQualificationsRef.current = []
          setCallAnswered(false) // 💥 IMPORTANTE: garante que botões não reapareçam depois
          console.log("🧹 Estado de qualificação e ref resetados após delay")
        }, 1000)
      }    

      if (event === "disconnected") {
        setAgentStatus("disconnected")
        setStatus({ message: "Desconectado do servidor.", type: "error" })
      }
    },
  })

  const registerExtension = () => {
    if (!agentToken) {
      alert("Por favor, preencha o Agent Token primeiro!")
      return
    }
    const url = `https://app.3c.plus/extension?api_token=${encodeURIComponent(agentToken)}`
    const popup = window.open(url, "_blank", "width=800,height=600")
    if (!popup) {
      alert("Pop-up bloqueado! Libere o pop-up para o site.")
      return
    }
    popup.focus()
    setAgentStatus("extension_opened")
    setStatus({ message: "Extensão aberta. Agora clique em 'Fazer login'.", type: "info" })
  }

  const login = async (id: number, name: string) => {
    setIsLoading(true)
    setStatus({ message: "Efetuando login...", type: "info" })
    try {
      const response = await fetch(`https://app.3c.plus/api/v1/agent/login?api_token=${encodeURIComponent(agentToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: id, mode: "manual" })
      })
      if (!response.ok) throw new Error("Login failed")
      await response.text()
      setSelectedCampaign({ id, name })
      setStatus({ message: "Login realizado com sucesso!", type: "success" })
      setAgentStatus("logged_in")
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
      const response = await fetch(`https://app.3c.plus/api/v1/agent/manual_call/dial?api_token=${encodeURIComponent(agentToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber })
      })
      if (!response.ok) throw new Error("Erro ao discar")
      await response.json()
      setStatus({ message: `Ligação iniciada com sucesso para ${phoneNumber}`, type: "success" })
      setAgentStatus("dialing")
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
    <Card className="transition-all">
      <CardHeader>
        <CardTitle>3C Plus Click-to-Call</CardTitle>
        <CardDescription>
          {agentStatus === "disconnected" && "Conecte sua extensão para começar"}
          {agentStatus === "extension_opened" && "Clique em 'Fazer login' para continuar"}
          {agentStatus === "connected" && "Login para acessar campanha manual"}
          {agentStatus === "logged_in" && selectedCampaign && `Modo Manual: Campanha ${selectedCampaign.name}`}
          {agentStatus === "dialing" && "Ligando..."}
          {agentStatus === "in_call" && "Ligação conectada!"}
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
                <Button
                  key={c.id}
                  variant="outline"
                  className="text-black bg-white hover:bg-gray-200"
                  onClick={() => login(c.id, c.name)}
                >
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

        {callAnswered && qualifications.length > 0 && !qualified && (
          <div key="qualificacao">
            <Label>Qualifique a ligação:</Label>
            <div className="flex flex-wrap gap-2">
              {qualifications.map((q) => (
                <Button
                  key={q.id}
                  variant="outline"
                  className="text-black bg-white hover:bg-gray-200"
                  onClick={() => qualifyCall(q.id)}
                >
                  {q.name}
                </Button>
              ))}
            </div>
          </div>
          )}

      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {agentStatus === "disconnected" && (
          <Button onClick={registerExtension} disabled={!agentToken}>
            Registrar Extensão
          </Button>
        )}

        {agentStatus === "logged_in" && (
          <Button onClick={makeCall} disabled={isLoading || !phoneNumber}>
            <Phone className="mr-2 h-4 w-4" />
            {isLoading ? "Ligando..." : "Discar"}
          </Button>
        )}

        {agentStatus === "in_call" && activeCallId && (
          <Button className="bg-red-600 hover:bg-red-700" onClick={hangupCall}>
            Encerrar Ligação
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
