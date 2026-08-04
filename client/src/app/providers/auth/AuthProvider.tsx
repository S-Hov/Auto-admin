import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '../../../shared/api/auth/auth.types';
import { AuthContext, type AuthStatus } from './AuthContext';
import { auth } from '../../../shared/api/auth';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>('checking');

    const refreshAuth = useCallback(async () => {
        setStatus('checking');
        setUser(null);
        try {
            const response = await auth.getMe();

            if (!response.data) {
                throw new Error('Сервер не вернул данные пользователя');
            }

            setUser(response.data);
            setStatus('authenticated');
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'status' in error) {
                const statusCode = error.status;
                if (statusCode === 401) setStatus('unauthenticated');
                else setStatus('error');
            } else {
                setStatus('error');
            }
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        await auth.logout();

        setUser(null);
        setStatus('unauthenticated');
    }, []);

    useEffect(() => {
        void refreshAuth();
    }, [refreshAuth]);

    return (
        <AuthContext.Provider value={{ user, status, refreshAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}