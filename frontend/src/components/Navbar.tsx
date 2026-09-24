import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar(){
    const {usuario,logout}=useAuth();
    const navigate= useNavigate();
    
    function cerrarSesion(){
    logout();
    navigate("/login");
}
    return (
        <nav className="navbar">
            {/*Links de navegacion a la izquierda */}
            <div className="nav-links">
            <Link to="/" className="nav-link">Inicio</Link>
            <Link to="/procedimientos" className="nav-link">Procedimientos</Link>
            <Link to="/errores" className="nav-link">Errores</Link>
            <Link to="/documentacion" className="nav-link">Documentacion</Link>
            </div>
            {/*Usuario y logout a la derecha*/}
            <div className="nav-user">
                {usuario && (
                    <>
                    <span className="nav-username">{usuario.nombre}</span>
                    <button onClick={cerrarSesion} className="nav-logout">Cerrar Sesion</button>
                    </>
                )}
            </div>
        </nav>
        
    );
}

export default Navbar;