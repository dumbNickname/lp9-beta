// Product name shown in the UI. Builds set VITE_APP_NAME ("Endeary",
// "Endeary beta"; DESIGN.md §14a, PRD-57); the fallback is the beta's
// working title.
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || "lp9";
