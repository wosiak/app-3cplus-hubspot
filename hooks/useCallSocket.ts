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

    console.log("🎯 Iniciando conexão socket para:", agentToken)

    socketRef.current = io("https://app.3c.plus", {
      path: "/socket.io",
      auth: {
        token: agentToken,
      },
      transports: ["websocket"],
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
      console.log("🧪 Evento socket:", event, args)
    })

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [agentToken])
}
