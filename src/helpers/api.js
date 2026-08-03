// URL Base tomada de las variables de entorno de Vite (.env en local, .env.production / Vercel en prod)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const API = {
  base: API_URL,
  // Agrega aquí las rutas a tus colecciones / recursos:
  // usuarios: `${API_URL}/usuarios`,
  // rutinas: `${API_URL}/rutinas`,
};
