import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
}
function Dashboard(){
    // Obtenemos usuario y logout desde AuthContext
  const {usuario , logout} = useAuth();
  const navigate= useNavigate();
  const [modulos , setModulos] = useState<Modulo[]>([]); //modulos: guarda la lista de modulos que vienen del backend y empieza con un array vacio 
  const [loading,setLoading] = useState(true); //true mientras esperamos respuesta del backend
  const [error,setError]=useState(""); //guarda un mensaje de texto si algo sale mal
    //useEffect: pedimos los modulos del backend los [] vacios significa ejecutar esto una sola vez
    useEffect(()=> {
      async function cargaModulos(){ //funcion asincronica
        try {
          const respuesta= await fetch(
            "http://localhost:3001/configuracion/modulos-portal" //pedimos los modulos del backend
          );
          const datos = await respuesta.json() //convertimos respuesta a objeto
          setModulos(datos);
        }catch(err){ //si el back mo responde lanza este error 
          setError("No se pudieron cargar los modulos del portal")
        } finally{
          setLoading(false); //dejamos de mostrar cargando..
        }
      }
      cargaModulos(); //ejecutamos la funcion que definimos
    }, []);
  //Funcion que ejecuta logout y redirige al login 
  function cerrarSesion(){
    logout();
    navigate("/login")
  }
 return (
    <div className="dashboard-container">
      {/* Encabezado con bienvenida */}
      <header className="dashboard-header">
        <div>
          <h1>Portal de Herramientas</h1>
          {usuario && (
            <p>
            <strong>{usuario.nombre}</strong> ({usuario.rol})
            </p>
          )}
        </div>
        <button onClick={cerrarSesion}>Cerrar Sesion</button>
      </header>

      {/* Si todavia estamos cargando, mostramos mensaje */}
      {loading && <p className="loading">Cargando modulos...</p>}

      {/* Si hubo un error, mostramos el mensaje */}
      {error && <p className="error">{error}</p>}

      {/* Si ya cargamos y no hay error, mostramos las cards */}
      {!loading && !error && (
        <div className="cards-grid">
          {/* .map() recorre el array "modulos" y por cada uno devuelve un <div> */}
          {modulos.map((modulo) => (
            <div
              key={modulo.id}
              className="card"
              onClick={() => navigate(`/${modulo.id}`)}
            >
              <h3>{modulo.nombre}</h3>
              <p>{modulo.descripcion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;