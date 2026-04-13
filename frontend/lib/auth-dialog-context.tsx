"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type AuthDialogContextType = {
  openAuthDialog: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined)

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openAuthDialog = () => {
    setIsOpen(true)
  }

  return (
    <AuthDialogContext.Provider value={{ isOpen, setIsOpen, openAuthDialog }}>
      {children}
    </AuthDialogContext.Provider>
  )
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext)
  if (context === undefined) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider")
  }
  return context
}
