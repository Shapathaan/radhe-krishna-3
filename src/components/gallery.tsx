import { useEffect, useRef, useState } from "react"
import { PHOTOS } from "@/data/content"
import { useLang } from "@/lib/language"

export function Gallery() {
  const { lang, t } = useLang()
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef({ on: false, x: 0, left: 0 })
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [open, setOpen] = useState<number | null>(null)

  const sync = () => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max <= 0 ? 1 : el.scrollLeft / max)
    const slides = [...el.querySelectorAll<HTMLElement>("[data-slide]")]
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    slides.forEach((slide, i) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2
      const dist = Math.abs(center - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setIndex(best)
  }

  useEffect(() => {
    sync()
  }, [])

  const go = (dir: number) => {
    const next = Math.min(PHOTOS.length - 1, Math.max(0, index + dir))
    const el = track.current
    const slide = el?.querySelectorAll<HTMLElement>("[data-slide]")[next]
    slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
      if (e.key === "ArrowRight") setOpen((n) => (n == null ? n : Math.min(PHOTOS.length - 1, n + 1)))
      if (e.key === "ArrowLeft") setOpen((n) => (n == null ? n : Math.max(0, n - 1)))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <section className="gallery-wrap" id="photos">
      <div className="section-head">
        <span className="index-no">{t.gallery.index}</span>
        <p className="eyebrow">{t.gallery.kicker}</p>
        <h2 className="display">{t.gallery.title}</h2>
      </div>
      <p className="gallery-note fine">{t.gallery.note}</p>
      <div
        className="gallery-track"
        ref={track}
        onScroll={sync}
        onPointerDown={(e) => {
          if (!track.current) return
          drag.current = { on: true, x: e.clientX, left: track.current.scrollLeft }
          track.current.classList.add("is-drag")
          track.current.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current.on || !track.current) return
          track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
        }}
        onPointerUp={(e) => {
          drag.current.on = false
          track.current?.classList.remove("is-drag")
          track.current?.releasePointerCapture(e.pointerId)
        }}
        onPointerCancel={() => {
          drag.current.on = false
          track.current?.classList.remove("is-drag")
        }}
      >
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className={photo.fit === "contain" ? "slide contain" : "slide"}
            data-slide
            onClick={() => {
              if (drag.current.on) return
              setOpen(i)
            }}
          >
            <img src={photo.src} alt={lang === "gu" ? photo.gu : photo.en} draggable={false} />
            <span>
              <em style={{ fontStyle: "normal" }}>{String(i + 1).padStart(2, "0")}</em>
              {lang === "gu" ? photo.gu : photo.en}
            </span>
          </button>
        ))}
      </div>
      <div className="gallery-ui">
        <button className="ghost" type="button" onClick={() => go(-1)}>
          {t.gallery.prev}
        </button>
        <div className="progress" aria-hidden="true">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="counter">
          {String(index + 1).padStart(2, "0")} — {String(PHOTOS.length).padStart(2, "0")}
        </div>
        <button className="ghost" type="button" onClick={() => go(1)}>
          {t.gallery.next}
        </button>
      </div>

      {open != null ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={lang === "gu" ? PHOTOS[open].gu : PHOTOS[open].en}>
          <header>
            <span>
              {String(open + 1).padStart(2, "0")} — {lang === "gu" ? PHOTOS[open].gu : PHOTOS[open].en}
            </span>
            <button className="ghost" type="button" onClick={() => setOpen(null)}>
              {t.gallery.close}
            </button>
          </header>
          <img src={PHOTOS[open].src} alt={lang === "gu" ? PHOTOS[open].gu : PHOTOS[open].en} />
          <footer>
            <button className="ghost" type="button" onClick={() => setOpen((n) => (n == null ? 0 : Math.max(0, n - 1)))}>
              {t.gallery.prev}
            </button>
            <button className="ghost" type="button" onClick={() => setOpen((n) => (n == null ? 0 : Math.min(PHOTOS.length - 1, n + 1)))}>
              {t.gallery.next}
            </button>
          </footer>
        </div>
      ) : null}
    </section>
  )
}
