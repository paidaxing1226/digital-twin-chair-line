import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        factory: {
          ink: "#101827",
          panel: "#172033",
          cyan: "#46d5e8",
          amber: "#f4c95d",
          steel: "#7f8b9b"
        }
      }
    }
  },
  plugins: []
};

export default config;
