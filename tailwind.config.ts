import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f1e8",
        ink: "#11212d",
        ember: "#d97706",
        pine: "#174c44",
        clay: "#b65d3d",
        gold: "#d6a548",
        mist: "#d7dde2"
      },
      boxShadow: {
        card: "0 12px 30px rgba(17, 33, 45, 0.10)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(214,165,72,0.24), transparent 34%), radial-gradient(circle at bottom right, rgba(23,76,68,0.18), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
