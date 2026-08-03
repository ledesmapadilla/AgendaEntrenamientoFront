// URL Base tomada de las variables de entorno de Vite (.env en local, .env.production / Vercel en prod)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const API = {
  base: API_URL,
  visitas: `${API_URL}/visitas`,
  tractores: `${API_URL}/tractores`,
};
