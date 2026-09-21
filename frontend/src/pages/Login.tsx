import { useState } from "react";         // Hook para guardar datos que cambian
import { useNavigate } from "react-router-dom"; // Para redirigir a otra pagina

function Login() {
  // --- ESTADOS (useState) ---
  // username: valor actual del input. setUsername: funcion para cambiarlo.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");     // Mensaje de error si el login falla
  const [cargando, setCargando] = useState(false); // "true" mientras esperamos al servidor

  // navigate("/") nos lleva al Dashboard cuando el login es exitoso
  const navigate = useNavigate();

  // --- FUNCION QUE SE EJECUTA AL HACER SUBMIT ---
  async function manejarLogin(evento: React.FormEvent) {
    evento.preventDefault(); // Evita que el formulario recargue la pagina

    setError("");         // Limpiamos errores anteriores
    setCargando(true);    // Mostramos "Cargando..."

    try {
      // 1. Hacemos la peticion al backend
      const respuesta = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const datos = await respuesta.json();

      // 2. Si el backend devolvio error (401, 404, etc.)
      if (!respuesta.ok) {
        setError(datos.message || "Credenciales invalidas");
        setCargando(false);
        return;
      }

      // 3. Si todo salio bien: guardamos el token
      localStorage.setItem("token", datos.token);
      localStorage.setItem("usuario", JSON.stringify(datos.usuario));

      // 4. Redirigimos al Dashboard
      navigate("/");

    } catch (err) {
      // Error de red (backend apagado, sin internet, etc.)
      setError("No se pudo conectar con el servidor");
      setCargando(false);
    }
  }

  // --- JSX: lo que se ve en pantalla ---
  return (
    <div className="login-container">
      <h2>Iniciar Sesion</h2>

      <form onSubmit={manejarLogin}>
        <div>
          <label>Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Cargando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default Login;