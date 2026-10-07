import { useEffect} from 'react';
import { useTranslation} from 'react-i18next';
import AuthForm from "../../features/auth-form/ui/AuthForm";

const LoginPage = () => {
    const { i18n } = useTranslation();
    const language = i18n.resolvedLanguage;

    useEffect(() => {
        document.title = i18n.t('loginPage:documentTitle');
    }, [i18n, language]);

    return (
        <section className="section login-page h-100">
            <div className="container flex flex-center h-100__percent">
                <AuthForm />
            </div>
        </section>
    );
};

export default LoginPage;
