import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export type NotificacionTipo = "error" | "warning" | "success" | "info";

export interface Notificacion {
  id: number;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  usuarioId: number; // ID del usuario al que pertenece la notificacion
}

interface NotificationContextType {
  notifs: Notificacion[];
  noLeidas: number;
  agregar: (titulo: string, mensaje: string, tipo?: NotificacionTipo) => void;
  marcarLeida: (id: number) => void;
  marcarTodasLeidas: () => void;
  eliminar: (id: number) => void;
  limpiar: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function getStorageKey(usuarioId?: number): string {
  return usuarioId ? `portal-notificaciones-${usuarioId}` : "portal-notificaciones";
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const storageKey = getStorageKey(usuario?.id ?? undefined);

  const [notifs, setNotifs] = useState<Notificacion[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch { return []; }
  });

  // Al cambiar de usuario, recargar sus notificaciones
  useEffect(() => {
    const key = getStorageKey(usuario?.id ?? undefined);
    try {
      const guardadas = JSON.parse(localStorage.getItem(key) || "[]");
      setNotifs(guardadas);
    } catch { setNotifs([]); }
  }, [usuario?.id]);

  useEffect(() => {
    const key = getStorageKey(usuario?.id ?? undefined);
    localStorage.setItem(key, JSON.stringify(notifs));
  }, [notifs, usuario?.id]);

  const agregar = useCallback((titulo: string, mensaje: string, tipo: NotificacionTipo = "info") => {
    if (!usuario) return;
    const nueva: Notificacion = {
      id: Date.now(),
      tipo,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false,
      usuarioId: usuario.id,
    };
    setNotifs((prev) => [nueva, ...prev].slice(0, 50));
  }, [usuario]);

  const marcarLeida = useCallback((id: number) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  const eliminar = useCallback((id: number) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const limpiar = useCallback(() => setNotifs([]), []);

  // Filtrar solo las notificaciones del usuario actual para el badge/dropdown
  const notifsUsuario = notifs.filter((n) => n.usuarioId === (usuario?.id ?? -1));
  const noLeidas = notifsUsuario.filter((n) => !n.leida).length;

  return (
    <NotificationContext.Provider value={{ notifs: notifsUsuario, noLeidas, agregar, marcarLeida, marcarTodasLeidas, eliminar, limpiar }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificaciones(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificationProvider");
  return ctx;
}
