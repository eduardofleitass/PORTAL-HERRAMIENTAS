import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import AnimatedLogo from "../components/AnimatedLogo";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { login, logoutMessage } = useAuth();

  async function manejarLogin(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.message || "Credenciales invalidas");
        setCargando(false);
        return;
      }

      login(datos.token, datos.usuario);
      navigate("/");

    } catch (err) {
      setError("No se pudo conectar con el servidor");
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <AnimatedLogo />
        </div>
        <h2>Portal de Herramientas</h2>
        <form onSubmit={manejarLogin}>
          <div> 
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="introduzca su usuario"
            />
          </div>
          <div>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••"
            />
          </div>
          {logoutMessage && <p className="logout-message">{logoutMessage}</p>}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={cargando}>
            {cargando ? "Cargando..." : "Iniciar Sesion"}
          </button>
        </form>
        <p className="login-footer"></p>
      </div>
    </div>
  );
}

export default Login;