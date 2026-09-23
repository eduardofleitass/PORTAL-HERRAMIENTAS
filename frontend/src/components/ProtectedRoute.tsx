import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
//Este componente actua como guardia de seguridad
//Recibe children = los componentes que debe de proteger
function ProtectedRoute({children} : {children: React.ReactNode}){
const {usuario}=useAuth();

if (!usuario){ //si no hay usuarios logueados, redirige al login
    return <Navigate to="/login" replace />; 
}
//si hay usuario, mostramos lo que venga adentro es decir la pagina
return children;
}
export default ProtectedRoute;