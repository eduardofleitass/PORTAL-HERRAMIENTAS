import { useAuth } from "../context/AuthContext";
function Dashboard(){
    // Obtenemos usuario y logout desde AuthContext
  const {usuario , logout} = useAuth();
  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      {
        usuario ? (
          <div>
            <p>Bienvenido, <strong>{usuario.nombre}</strong></p>
            <p>Rol:{usuario.rol}</p>
            <button onClick={logout}>Cerrar Sesion</button>
          </div>
    ):(
    <p>No has iniciado sesion.</p>
  )}
  </div>
);
}  
export default Dashboard;