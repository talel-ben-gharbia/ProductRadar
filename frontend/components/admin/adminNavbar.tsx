"use client"

import React, { useEffect, useRef, useState } from "react"
import { LogOut, Radar, User, ChevronDown, ShieldCheck } from "lucide-react"

import { useAdmin } from "./admin-context"
import { SidebarTrigger } from "../ui/sidebar"
import { Separator } from "../ui/separator"

function AdminNavbar() {
  const { admin, loading, logout, displayRole } = useAdmin()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  // Close on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [menuOpen])

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden !h-5 sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <Radar className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            Product Radar
          </span>
        </div>
      </div>

      {/* Admin profile menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted data-[state=open]:bg-muted"
          data-state={menuOpen ? "open" : "closed"}
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {loading ? (
              <div className="size-4 animate-pulse rounded-full bg-primary/30" />
            ) : (
              <User className="size-4" />
            )}
          </div>
          {admin && (
            <div className="hidden text-left sm:block">
              <p className="max-w-[160px] truncate text-sm font-medium leading-none">
                {admin.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {displayRole}
              </p>
            </div>
          )}
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-64 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 rounded-xl border bg-card p-1 shadow-xl"
            role="menu"
          >
            {admin && (
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{admin.email}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldCheck className="size-3" />
                      {displayRole}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Separator className="my-1" />
            <button
              onClick={logout}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default AdminNavbar
