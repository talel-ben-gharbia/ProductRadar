"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Sparkles, ChevronDown } from "lucide-react"
import { useB2B } from "@/components/B2B/b2b-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Message = {
  role: "user" | "assistant"
  content: string
}

export default function B2BAIAssistant() {
  const { firebaseUid, isGold, summary } = useB2B()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. Ask me anything about your products, competitors, stock, or trends.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: msg }])
    setLoading(true)

    try {
      const conv = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch("/api/b2b/workspace?endpoint=ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversation: conv }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(errData.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const brandName = summary?.user?.company_name ?? "your brand"

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.6)] transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[380px] flex-col rounded-2xl border border-border/50 bg-background shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/50 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">AI Assistant</div>
              <div className="text-xs text-muted-foreground truncate">Analyzing data for {brandName}</div>
            </div>
            {!isGold && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Gold
              </span>
            )}
          </div>

          {!isGold ? (
            /* Gold upgrade prompt */
            <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Gold Plan Required</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upgrade to Gold to unlock the AI Assistant and get instant answers about your data.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                onClick={() => window.location.href = "/B2B/dashboard/settings"}
              >
                Upgrade to Gold
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 px-5 py-4 max-h-[400px] min-h-[250px]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-muted/60 text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border/50 p-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your data..."
                    className="flex-1 rounded-xl border-border/50 bg-muted/30 text-sm"
                  />
                  <Button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
