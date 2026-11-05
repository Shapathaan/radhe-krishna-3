import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { AREA_MAX, AREA_MIN, PLOT_BY_ID, PLOTS, sectionOf } from "@/data/plan"
import { whatsAppHref } from "@/data/content"
import { useLang } from "@/lib/language"

const PlanScene = lazy(() => import("./plan-scene"))

function pad(id: number) {
  return String(id).padStart(3, "0")
}

export function MasterPlan() {
  const { lang, t } = useLang()
  const [mode, setMode] = useState<"model" | "drawing">("model")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [query, setQuery] = useState("")
  const [missing, setMissing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [webgl, setWebgl] = useState(true)

  useEffect(() => {
    setMounted(true)
    try {
      const canvas = document.createElement("canvas")
      const ok = !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")))
      setWebgl(ok)
    } catch {
      setWebgl(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId])

  const focus = selectedId ?? hoveredId
  const plot = focus != null ? PLOT_BY_ID.get(focus) : undefined
  const sectionLabel = useMemo(() => {
    if (!plot) return ""
    const section = sectionOf(plot.id)
    if (section === "west") return t.plan.sectionWest
    if (section === "east") return t.plan.sectionEast
    return t.plan.sectionCentral
  }, [plot, t])

  const showPlot = (raw: string) => {
    const id = Number(raw)
    if (!PLOT_BY_ID.has(id)) {
      setMissing(true)
      return
    }
    setMissing(false)
    setSelectedId(id)
    setMode("model")
  }

  const enquire = () => {
    const who = plot ? `Plot ${pad(plot.id)} (${plot.areaSqft.toLocaleString("en-IN")} sq.ft)` : "the layout"
    const text =
      lang === "gu"
        ? `નમસ્તે, હું રાધેકૃષ્ણ રેસિડેન્સી ફેઝ ૦૨ વિશે પૂછપરછ કરું છું. ${plot ? `પ્લોટ ${pad(plot.id)} (${plot.areaSqft} sq.ft).` : ""}`
        : `Hello, I would like to enquire about Radhe Krishna Residency Phase 02. ${who}.`
    window.open(whatsAppHref(text), "_blank", "noopener,noreferrer")
  }

  const fallback = (
    <img className="drawing-view" src="/assets/images/plan-2.png" alt={t.plan.fallback} />
  )

  return (
    <section className="plan-section" id="plan">
      <div className="section-head">
        <span className="index-no">{t.plan.index}</span>
        <p className="eyebrow">{t.plan.kicker}</p>
        <h2 className="display">{t.plan.title}</h2>
        <p className="lede" style={{ color: "var(--color-mute)" }}>
          {t.plan.lede}
        </p>
      </div>

      <div className="plan-stats">
        <div>
          <strong>{PLOTS.length}</strong>
          <span>{t.plan.plots}</span>
        </div>
        <div>
          <strong>
            {AREA_MIN.toLocaleString("en-IN")}–{AREA_MAX.toLocaleString("en-IN")}
          </strong>
          <span>{t.plan.range}</span>
        </div>
        <div>
          <strong>5,990 · 7,658</strong>
          <span>{t.plan.common}</span>
        </div>
      </div>

      <div className="plan-toolbar">
        <div className="seg" role="group">
          <button type="button" aria-pressed={mode === "model"} onClick={() => setMode("model")}>
            {t.plan.model}
          </button>
          <button type="button" aria-pressed={mode === "drawing"} onClick={() => setMode("drawing")}>
            {t.plan.drawing}
          </button>
        </div>
        <form
          className="finder"
          onSubmit={(e) => {
            e.preventDefault()
            showPlot(query)
          }}
        >
          <input
            inputMode="numeric"
            aria-label={t.plan.search}
            placeholder={t.plan.search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setMissing(false)
            }}
            list="plot-numbers"
          />
          <datalist id="plot-numbers">
            {PLOTS.map((item) => (
              <option key={item.id} value={item.id}>
                {pad(item.id)} · {item.areaSqft}
              </option>
            ))}
          </datalist>
          <button className="btn btn-line" type="submit">
            {t.plan.searchGo}
          </button>
        </form>
      </div>
      {missing ? <p className="warn">{t.plan.missing}</p> : null}

      <div className="plan-stage">
        <div className="plan-canvas">
          {mode === "drawing" || !webgl ? (
            fallback
          ) : mounted ? (
            <Suspense fallback={<div className="scene-status">{t.plan.building}</div>}>
              <PlanScene
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={(id) => setSelectedId(id < 0 ? null : id)}
                onHover={setHoveredId}
                resetSignal={resetSignal}
                fallback={fallback}
              />
            </Suspense>
          ) : (
            <div className="scene-status">{t.plan.building}</div>
          )}
        </div>

        <aside className="plot-card">
          {plot ? (
            <>
              <h3>{sectionLabel}</h3>
              <p className="plot-no display">{pad(plot.id)}</p>
              <div>
                <span className="eyebrow" style={{ color: "var(--color-clay)" }}>
                  {t.plan.area}
                </span>
                <strong style={{ display: "block", fontSize: "1.35rem" }}>
                  {plot.areaSqft.toLocaleString("en-IN")} sq.ft
                </strong>
              </div>
              <div>
                <span className="eyebrow" style={{ color: "var(--color-clay)" }}>
                  {t.plan.frontage}
                </span>
                <strong style={{ display: "block" }}>{plot.frontageFt} ft</strong>
              </div>
              <p>{t.plan.illustrative}</p>
              <button className="btn btn-ink" type="button" onClick={enquire}>
                {t.plan.enquirePlot}
              </button>
            </>
          ) : (
            <>
              <h3>{t.plan.hint}</h3>
              <p>{t.plan.illustrative}</p>
              <p className="fine">{t.plan.architect}</p>
            </>
          )}
          <button
            className="btn btn-line-dark"
            type="button"
            onClick={() => {
              setSelectedId(null)
              setHoveredId(null)
              setResetSignal((n) => n + 1)
            }}
          >
            {t.plan.reset}
          </button>
        </aside>
      </div>

      <div className="plan-legend">
        <span>{t.plan.north}</span>
        <span>{t.plan.legendRoads}</span>
      </div>
    </section>
  )
}
