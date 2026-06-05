import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        barlow: ["var(--font-barlow)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#17202a",
        paper: "#f7f8fa",
        line: "#d9dee7",
        // Würth Professional Solutions brand red
        brand: {
          50:  "#fff0f0",
          100: "#ffd6d6",
          600: "#CC0000",  // Würth red
          700: "#A30000"   // Darker Würth red
        },
        success: "#168a53",
        warning: "#b25e09",
        danger:  "#c2413a"
      },
      boxShadow: {
        soft: "0 4px 24px rgba(23, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
