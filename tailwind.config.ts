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
 