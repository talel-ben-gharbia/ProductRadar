"use client"

import { Component, createElement } from "react"
import { Button } from "@/components/ui/button"

type ErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    if (error.message?.includes?.("removeChild")) {
      this.setState({ hasError: false, error: null })
      return
    }
    console.error("Caught by ErrorBoundary:", error.message)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return createElement(
        "div",
        { className: "flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center" },
        createElement("div", { className: "text-5xl" }, "⚠️"),
        createElement("p", { className: "text-muted-foreground max-w-md" },
          "A page conflict occurred. Try refreshing."
        ),
        createElement(
          "div",
          { className: "flex gap-3" },
          createElement(Button, {
            onClick: () => this.setState({ hasError: false, error: null })
          }, "Try again"),
          createElement(Button, {
            variant: "outline",
            onClick: () => window.location.reload()
          }, "Reload")
        )
      )
    }
    return this.props.children
  }
}
