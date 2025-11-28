/**
 * Genera un ID personalizado para clientes
 * Formato: [2 letras ciudad][YYYYMMDD][iniciales]
 * Ejemplo: CH20250114JD (Chicago, 14 de enero 2025, John Doe)
 */
export function generateClientId(
  city: string,
  firstName: string,
  lastName: string
): string {
  // Obtener las primeras 2 letras de la ciudad en mayúsculas
  const cityCode = (city || "XX").substring(0, 2).toUpperCase();
  
  // Obtener la fecha actual en formato YYYYMMDD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateCode = `${year}${month}${day}`;
  
  // Obtener las iniciales del nombre y apellido
  const firstInitial = (firstName || "X").charAt(0).toUpperCase();
  const lastInitial = (lastName || "X").charAt(0).toUpperCase();
  const initials = `${firstInitial}${lastInitial}`;
  
  // Combinar todo
  return `${cityCode}${dateCode}${initials}`;
}
