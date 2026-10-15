import { Outlet } from "react-router-dom";
import './authLayout.css'

const AuthLayout = () => {
    return (
        <div className="auth-layout">
            <iframe
                className="auth-layout__background"
                src={`${import.meta.env.BASE_URL}animations/particle-background/index.html`}
                title=""
                aria-hidden="true"
                tabIndex={-1}
                sandbox="allow-scripts allow-same-origin"
            />
            <div className="auth-layout__content">
                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
