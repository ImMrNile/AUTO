import React from "react";
import styles from "./ThemeToggle.module.css";

/** Кнопка-переключатель темы. Меняет data-theme на <html> */
export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<"system"|"light"|"dark">("system");

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved);
      apply(saved);
    }
  }, []);

  const apply = (mode: "system"|"light"|"dark") => {
    const html = document.documentElement;
    if (mode === "system") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", mode);
    }
  };

  const cycle = () => {
    const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("theme", next);
    apply(next);
  };

  const label = theme === "system" ? "Системная" : theme === "light" ? "Светлая" : "Тёмная";

  return (
    <button className={styles.toggle} onClick={cycle} aria-label="Переключить тему">
      <span className={styles.icon} aria-hidden>
        {/* иконка-луна/солнышко/системная */}
        {theme === "light" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
        {theme === "dark" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        )}
        {theme === "system" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
