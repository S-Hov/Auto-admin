import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
    return (
        <div>
            <header>
                <h1>Auth Layout</h1>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default AuthLayout;