// Detección dinámica de entorno según la ubicación en tiempo de ejecución (window.location.hostname)
const isLocalhost = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

export const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (isLocalhost ? "http://localhost:3000/api" : "https://agenda-entrenamiento-back.vercel.app/api");

export const API = {
  base: API_URL,
  entrenamientos: `${API_URL}/entrenamientos`,
  visitas: `${API_URL}/entrenamientos`,
};
