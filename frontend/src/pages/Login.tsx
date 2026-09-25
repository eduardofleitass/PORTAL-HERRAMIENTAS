// Importamos useState para poder crear y manejar estados dentro del componente
import { useState } from "react";

// Importamos useNavigate para poder cambiar de página mediante código
import { useNavigate } from "react-router-dom";

// Importamos nuestro contexto de autenticación
// Desde aquí obtenemos la función login()
import { useAuth } from "../context/AuthContext.tsx";


// Declaramos el componente Login
function Login() {

  // Estado que almacena el nombre de usuario escrito en el input
  // username = valor actual
  // setUsername = función para modificar ese valor
  const [username, setUsername] = useState("");

  // Estado que almacena la contraseña escrita en el input
  const [password, setPassword] = useState("");

  // Estado que almacena un mensaje de error
  // Por ejemplo: "Credenciales inválidas"
  const [error, setError] = useState("");

  // Estado que indica si el proceso de login está cargando
  // false = no está cargando
  // true = está esperando la respuesta del servidor
  const [cargando, setCargando] = useState(false);

  // Obtenemos la función navigate para poder redirigir al usuario
  // Por ejemplo: navigate("/") nos lleva a la página principal
  const navigate = useNavigate();

  // Obtenemos la función login() desde nuestro AuthContext
  // Esta función normalmente guarda la información de autenticación
  const { login } = useAuth();


  // Función que se ejecuta cuando el usuario envía el formulario
  async function manejarLogin(evento: React.FormEvent) {

    // Evitamos que el navegador recargue la página
    evento.preventDefault();

    // Limpiamos cualquier mensaje de error anterior
    setError("");

    // Indicamos que el proceso de login está comenzando
    setCargando(true);


    // Intentamos ejecutar el login
    try {

      // Hacemos una petición HTTP al backend
      const respuesta = await fetch("http://localhost:3001/auth/login", {

        // Indicamos que estamos enviando información al servidor
        method: "POST",

        // Indicamos que los datos enviados estarán en formato JSON
        headers: {
          "Content-Type": "application/json",
        },

        // Convertimos username y password a un objeto JSON
        // para enviarlos al backend
        body: JSON.stringify({
          username,
          password,
        }),
      });


      // Convertimos la respuesta del servidor de JSON
      // a un objeto JavaScript
      const datos = await respuesta.json();


      // Verificamos si el servidor respondió con un error
      // respuesta.ok es false cuando, por ejemplo, recibimos
      // un código HTTP 400, 401, 404, 500, etc.
      if (!respuesta.ok) {

        // Mostramos el mensaje enviado por el backend
        // Si no existe, mostramos "Credenciales inválidas"
        setError(datos.message || "Credenciales inválidas");

        // Indicamos que terminó el proceso de carga
        setCargando(false);

        // Detenemos la ejecución de la función
        return;
      }


      // Si llegamos hasta aquí significa que el login fue exitoso
      // Enviamos el token y los datos del usuario al contexto
      login(datos.token, datos.usuario);


      // Después de iniciar sesión correctamente,
      // redirigimos al usuario a la página principal
      navigate("/");


    // Si ocurre un error de conexión con el servidor,
    // entramos en este bloque
    } catch (err) {

      // Mostramos un mensaje indicando que no se pudo conectar
      setError("No se pudo conectar con el servidor");

      // Quitamos el estado de carga
      setCargando(false);
    }
  }


  // Lo que devuelve el componente y que será mostrado en pantalla
  return (

    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <img src="/logo3.png" alt="Portal de Herramientas" />
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


// Exportamos el componente para poder utilizarlo
// en otras partes de nuestra aplicación
export default Login;