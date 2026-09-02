import AuthForm from "../../features/auth-form/ui/AuthForm";

const LoginPage = () => {
    return (
        <section className="section login-page h-100">
            <div className="container flex flex-center h-100__percent">
                <AuthForm />
            </div>
        </section>
    );
};

export default LoginPage;