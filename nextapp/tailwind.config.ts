import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#64A1EE",
        "primary-dark": "#1E6FD9",
        secondary: "#424242",
        background: "#F7FAFD",
        surface: "#FFFFFF",
        "on-surface": "#191c20",
        "on-surface-variant": "#414751",
        outline: "#727782",
        "outline-variant": "#c1c7d2",
        error: "#ba1a1a",
        success: "#2e7d32",
        warning: "#f57c00",
        urgent: "#c62828",
        brand: {
          blue: "#64A1EE",
          "blue-dark": "#1E6FD9",
          gray: "#424242",
          bg: "#F7FAFD",
        },
        status: {
          baixa: "#64A1EE",
          media: "#f57c00",
          alta: "#e53935",
          urgente: "#c62828",
        },
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      fontWeight: {
        extrabold: "800",
        light: "300",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0px 4px 20px rgba(0, 0, 0, 0.05)",
        "card-hover": "0px 8px 30px rgba(0, 0, 0, 0.10)",
        button: "0px 2px 8px rgba(30, 111, 217, 0.25)",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;
