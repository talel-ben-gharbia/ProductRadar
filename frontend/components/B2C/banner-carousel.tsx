"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon } from "lucide-react"

import { BACKEND_URL } from "@/utils/admin/constants"

import type { B2BBannerCampaign } from "@/types/b2b"

type Props = {
  banners: B2BBannerCampaign[]
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback(
    (index: number) => {
      setCurrent(((index % banners.length) + banners.length) % banners.length)
    },
    [banners.length],
  )

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  useEffect(() => {
    if (paused || banners.length <= 1) return
    timerRef.current = setInterval(next, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, banners.length, next])

  if (banners.length === 0) return null

  const banner = banners[current]

  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl bg-muted/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <a
        href={banner.link_url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/1] w-full overflow-hidden sm:aspect-[6/1]"
      >
        {banner.image_url ? (
          <img
            src={`${BACKEND_URL}${banner.image_url}`}
            alt={banner.company_name ?? "Sponsored banner"}
            className="h-full w-full object-contain transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <ImageIcon className="size-12 text-muted-foreground/30" />
          </div>
        )}
        {banner.company_name && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {banner.company_name}
            <ExternalLink className="ml-1 inline-block size-3" />
          </span>
        )}
      </a>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover:opacity-100"
            aria-label="Previous banner"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover:opacity-100"
            aria-label="Next banner"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`size-2 rounded-full transition-all ${
                  i === current
                    ? "w-5 bg-white shadow-sm"
                    : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}