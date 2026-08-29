"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div
      role="group"
      aria-label="Toggle theme"
      className="flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 p-0.5 gap-0.5"
    >
      <button
        onClick={() => setTheme("dark")}
        aria-pressed={isDark}
        aria-label="Dark mode"
        className={[
          "flex items-center justify-center h-6 w-6 rounded-full transition-all duration-200",
          isDark
            ? "bg-primary-foreground text-primary shadow-sm"
            : "text-primary-foreground/60 hover:text-primary-foreground",
        ].join(" ")}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setTheme("light")}
        aria-pressed={!isDark}
        aria-label="Light mode"
        className={[
          "flex items-center justify-center h-6 w-6 rounded-full transition-all duration-200",
          !isDark
            ? "bg-primary-foreground text-primary shadow-sm"
            : "text-primary-foreground/60 hover:text-primary-foreground",
        ].join(" ")}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
