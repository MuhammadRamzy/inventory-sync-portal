import type { Config } from "tailwindcss";

// Generic default brand scale (safe to publish). To reproduce a specific
// deployment's real brand color exactly, set the matching BRAND_<shade> env
// vars in `.env` (see .env.example) — each shade can be overridden
// independently, so production can keep its exact palette while the
// published defaults stay generic.
const defaultBrandScale: Record<string, string> = {
  50: "#f4f7fb",
  100: "#e7edf5",
  200: "#cbd8e8",
  300: "#9db3d0",
  400: "#6b89b3",
  500: "#486693",
  600: "#385278",
  700: "#2e4361",
  800: "#263650",
  900: "#1f2c40",
  950: "#141c2a",
};

const brand = Object.fromEntries(
  Object.entries(defaultBrandScale).map(([shade, fallback]) => [
    shade,
    process.env[`BRAND_${shade}`] || fallback,
  ])
);

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand,
      },
    },
  },
  plugins: [],
};
export default config;
