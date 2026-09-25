import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hayError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Barrera de errores global.
 * Captura cualquier excepcion no manejada en el arbol de React y muestra
 * una pantalla de recuperacion en vez de dejar la app en blanco.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hayError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hayError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // Loguear en consola para diagnostico
    console.error("[ErrorBoundary] Error capturado:", error);
    console.error("[ErrorBoundary] Componente:", info.componentStack);

    // Registrar en el backend (best-effort, no bloquea)
    try {
      fetch("http://localhost:3001/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nivel: "error",
          accion: "error_frontend",
          detalle: `${error.name}: ${error.message}`,
          extra: info.componentStack?.slice(0, 1000),
        }),
      }).catch(() => {});
    } catch {
      // silencioso
    }
  }

  reiniciar = () => {
    this.setState({ hayError: false, error: null, info: null });
  };

  irAlInicio = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hayError) return this.props.children;

    const esDev = import.meta.env.DEV;

    return (
      <div className="error-boundary">
        <div className="error-boundary-card">
          <div className="error-boundary-icon">
            <AlertTriangle size={40} />
          </div>
          <h1>Algo salio mal</h1>
          <p>
            Se produjo un error inesperado en la aplicacion. Puedes reintentar
            o volver al inicio.
          </p>

          {esDev && this.state.error && (
            <details className="error-boundary-details">
              <summary>Detalle tecnico</summary>
              <pre>{this.state.error.message}</pre>
              {this.state.info?.componentStack && (
                <pre>{this.state.info.componentStack.slice(0, 1200)}</pre>
              )}
            </details>
          )}

          <div className="error-boundary-actions">
            <button className="btn-primario" onClick={this.reiniciar}>
              <RotateCcw size={15} /> Reintentar
            </button>
            <button className="btn-secundario" onClick={this.irAlInicio}>
              <Home size={15} /> Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
