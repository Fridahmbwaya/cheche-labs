import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aligned with chechelabs.org design tokens
        bg: "hsl(240 100% 99%)",
        ink: "hsl(248 75% 4%)",
        card: "#ffffff",
        primary: "hsl(248 100% 34%)",
        primaryFg: "#ffffff",
        accent: "hsl(26 100% 57%)",
        accentFg: "#ffffff",
        muted: "hsl(240 100% 95%)",
        mutedFg: "hsl(248 18% 42%)",
        border: "hsl(249 45% 93%)",
        success: "hsl(160 100% 39%)",
        warning: "hsl(47 100% 56%)",
        teal: "hsl(160 100% 39%)",
        sidebar: "hsl(248 65% 11%)",
        sidebarFg: "hsl(250 30% 72%)",
        sidebarAcc: "hsl(250 45% 18%)",
        lavender: "hsl(240 100% 95%)",
        lightPurple: "hsl(234 100% 90%)",
        midPurple: "hsl(230 87% 76%)",
        darkPurple: "hsl(261 64% 33%)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "0.75rem",
      },
      letterSpacing: {
        display: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
