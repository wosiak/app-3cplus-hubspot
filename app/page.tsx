"use client"

import dynamic from "next/dynamic"

const ClickToCallSystem = dynamic(() => import("@/components/click-to-call-system"), {
  ssr: false,
})

export default function Home() {
  return <ClickToCallSystem />
}
