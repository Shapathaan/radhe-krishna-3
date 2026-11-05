import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { copy, type Lang } from "@/data/content"

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (typeof copy)["en"] | (typeof copy)["gu"]
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en")

  useEffect(() => {
    const saved = window.localStorage.getItem("rk-lang")
    if (saved === "gu" || saved === "en") setLangState(saved)
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    window.localStorage.setItem("rk-lang", next)
  }

  useEffect(() => {
    document.documentElement.lang = lang === "gu" ? "gu" : "en"
    document.documentElement.dataset.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: copy[lang] }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("LanguageProvider missing")
  return ctx
}
