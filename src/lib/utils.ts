import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene la fecha de hoy en zona horaria de Bolivia (UTC-4) en formato YYYY-MM-DD
 * Bolivia: UTC-4, sin horario de verano
 */
export function getHoyLocal(): string {
  const dtf = new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  });
  const fecha = dtf.format(new Date());
  const [día, mes, año] = fecha.split('/');
  return `${año}-${mes}-${día}`;
}

/**
 * Obtiene una fecha futura en zona horaria de Bolivia (UTC-4) en formato YYYY-MM-DD
 * @param días - Número de días a sumar (ej: 7 para dentro de 7 días)
 */
export function getFechaFuturaLocal(días: number): string {
  const ahora = new Date();
  ahora.setDate(ahora.getDate() + días);
  
  const dtf = new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  });
  const fecha = dtf.format(ahora);
  const [día, mes, año] = fecha.split('/');
  return `${año}-${mes}-${día}`;
}

/**
 * Obtiene una fecha pasada en zona horaria de Bolivia (UTC-4) en formato YYYY-MM-DD
 * @param meses - Número de meses a restar (ej: 6 para hace 6 meses)
 */
export function getFechaPasadaLocalMeses(meses: number): string {
  const ahora = new Date();
  ahora.setMonth(ahora.getMonth() - meses);
  
  const dtf = new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  });
  const fecha = dtf.format(ahora);
  const [día, mes, año] = fecha.split('/');
  return `${año}-${mes}-${día}`;
}

/**
 * Obtiene el primer día del mes actual en zona horaria de Bolivia (UTC-4) en formato YYYY-MM-DD
 */
export function getPrimerDiaDelMesLocal(): string {
  const ahora = new Date();
  ahora.setDate(1);
  
  const dtf = new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  });
  const fecha = dtf.format(ahora);
  const [día, mes, año] = fecha.split('/');
  return `${año}-${mes}-${día}`;
}
