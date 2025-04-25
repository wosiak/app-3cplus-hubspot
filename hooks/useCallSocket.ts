"use client"

import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"

interface Props {
  agentToken: string
  onEvent: (event: string, payload?: any) => void
}

export function useCallSocket({ agentToken, onEvent }: Props) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!agentToken || socketRef.current) return

    console.log("🔌 Conectando ao socket.3c.plus com token:", agentToken)

    socketRef.current = io("https://socket.3c.plus", {
      transports: ["websocket"],
      query: { token: agentToken }, // <-- Aqui está a diferença!
    })

    socketRef.current.on("connect", () => {
      onEvent("connected")
    })

    socketRef.current.on("call-was-connected", (data) => {
      onEvent("call-was-connected", data)
    })

    socketRef.current.on("call-ended", (data) => {
      onEvent("call-ended", data)
    })

    socketRef.current.on("disconnect", () => {
      onEvent("disconnected")
    })

    socketRef.current.onAny((event, ...args) => {
      console.log("🧪 Evento recebido:", event)
      console.log("📦 Dados:", args)
    })

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Erro de conexão:", err)
    })

    socketRef.current.on("error", (err) => {
      console.error("❌ Erro no socket:", err)
    })

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [agentToken])
}
