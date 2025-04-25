"use client"

import { useEffect } from "react"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

interface Props {
  agentToken: string
  onEvent: (event: string, payload?: any) => void
}

export function useCallSocket({ agentToken, onEvent }: Props) {
  useEffect(() => {
    if (!agentToken) return

    socket = io("https://app.3c.plus", {
      path: "/socket.io",
      auth: {
        token: agentToken, // autenticação via token do operador
      },
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      onEvent("connected")
    })

    socket.on("call-was-connected", (data) => {
      onEvent("call-was-connected", data)
    })

    socket.on("call-ended", (data) => {
      onEvent("call-ended", data)
    })

    socket.on("disconnect", () => {
      onEvent("disconnected")
    })

    socket.onAny((event, ...args) => {
      console.log("🧪 Qualquer evento recebido:", event, args)
    })    

    return () => {
      socket?.disconnect()
    }
  }, [agentToken])
}
