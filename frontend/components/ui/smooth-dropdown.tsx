"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

export type SmoothDropdownOption = {
  label: string
  value: string
}

type SmoothDropdownProps = {
  value: string
  options: SmoothDropdownOption[]
  onChange: (value: string) => void
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  maxVisibleItems?: number
}

export default function SmoothDropdown({
  value,
  options,
  onChange,
  className,
  searchable = false,
  searchPlaceholder = "Search...",
  maxVisibleItems = 20,
}: SmoothDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const menuRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ""

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    )
  }, [options, search])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus()
    }
  }, [isOpen, searchable])

  return (
    <div ref={menuRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const nextOpen = !prev
            if (!nextOpen) {
              setSearch("")
            }

            return nextOpen
          })
        }}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        className={`absolute z-20 mt-2 w-full origin-top rounded-md border bg-background p-1 shadow ${
          isOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      >
        {searchable && (
          <div className="px-1 pb-1">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        )}

        <div
          className="overflow-y-auto"
          style={{ maxHeight: `${Math.max(1, maxVisibleItems) * 32}px` }}
        >
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches found</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                  setSearch("")
                }}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                  option.value === value ? "bg-muted" : ""
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
