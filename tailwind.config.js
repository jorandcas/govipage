/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: {
        movi: {
          primary: "#00A19B",   // verde Movistar
          light:   "#00C7B1",
          dark:    "#00877F",
        },
        wa: {
          green:  "#25D366",
          dark:   "#128C7E",
        }
      }
  } },
  plugins: [],
}




