// Detección dinámica en tiempo de ejecución basada en window.location.hostname
const isLocalhost = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

// En desarrollo local (localhost/127.0.0.1) apunta al servidor local :3000.
// En producción / dispositivos móviles / Vercel apunta SIEMPRE al backend desplegado en Vercel.
export const API_URL = isLocalhost
  ? (import.meta.env.VITE_API_URL || "http://localhost:3000/api")
  : "https://agenda-entrenamiento-back.vercel.app/api";

export const API = {
  base: API_URL,
  entrenamientos: `${API_URL}/entrenamientos`,
  visitas: `${API_URL}/entrenamientos`,
};
