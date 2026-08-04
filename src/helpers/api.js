// URL Base tomada de las variables de entorno de Vite o fallback al backend remoto desplegado
export const API_URL = import.meta.env.VITE_API_URL || "https://agenda-entrenamiento-back.vercel.app/api";

export const API = {
  base: API_URL,
  entrenamientos: `${API_URL}/entrenamientos`,
  visitas: `${API_URL}/entrenamientos`,
};
