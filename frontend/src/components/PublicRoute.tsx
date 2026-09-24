import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PublicRoute({children}: {children: React.ReactNode}){
    const {usuario} = useAuth();
    if (usuario){ //si ya hay login redirigimos al dashboard
        return <Navigate to="/" replace />;
    }
    return children; //si no, se hace el proceso normal
}
export default PublicRoute;