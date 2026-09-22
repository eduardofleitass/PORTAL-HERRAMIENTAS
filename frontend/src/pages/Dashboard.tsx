import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
function Dashboard(){
    // Obtenemos usuario y logout desde AuthContext
  const {usuario , logout} = useAuth();
  const navigate= useNavigate();
  //Funcion que ejecuta logout y redirige al login 
  function cerrarSesion(){
    logout();
    navigate("/login")
  }
  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      {
        usuario ? (
          <div>
            <p>Bienvenido, <strong>{usuario.nombre}</strong></p>
            <p>Rol:{usuario.rol}</p>
            <button onClick={cerrarSesion}>Cerrar Sesion</button>
          </div>
    ): null
  }
  </div>
);
}  
export default Dashboard;