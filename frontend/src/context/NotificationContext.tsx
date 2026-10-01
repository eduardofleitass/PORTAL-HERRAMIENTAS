import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type NotificacionTipo = "error" | "warning" | "success" | "info";

export interface Notificacion {
  id: number;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = useState<Notificacion[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("portal-notificaciones") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("portal-notificaciones", JSON.stringify(notifs));
  }, [notifs]);

  const agregar = useCallback((titulo: string, mensaje: string, tipo: NotificacionTipo = "info") => {
    const nueva: Notificacion = {
      id: Date.now(),
      tipo,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false,
    };
    setNotifs((prev) => [nueva, ...prev].slice(0, 50));
  }, []);

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

  const noLeidas = notifs.filter((n) => !n.leida).length;

  return (
    <NotificationContext.Provider value={{ notifs, noLeidas, agregar, marcarLeida, marcarTodasLeidas, eliminar, limpiar }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificaciones(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificationProvider");
  return ctx;
}
