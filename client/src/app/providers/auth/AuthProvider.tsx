import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '../../../shared/api/auth/auth.types';
import { AuthContext, type AuthStatus } from './AuthContext';
import { auth } from '../../../shared/api/auth';
import { useBootstrap } from '../bootstrap/BootstrapContext';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>('checking');
    const { state } = useBootstrap();

    const refreshAuth = useCallback(async () => {
        try {
            const response = await auth.getMe();

            if (!response.data) {
                throw new Error('Сервер не вернул данные пользователя');
            }

            setUser(response.data);
            setStatus('authenticated');
        } catch (error: unknown) {
            setUser(null);
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
        if (state.status !== 'resolved' || state.stage !== 'ready') {
            return;
        }

        let ignore = false;

        auth.getMe()
            .then((response) => {
                if (!ignore && response.data) {
                    setUser(response.data);
                    setStatus('authenticated');
                }
            })
            .catch((error: unknown) => {
                if (!ignore) {
                    setUser(null);
                    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
                        setStatus('unauthenticated');
                    } else {
                        setStatus('error');
                    }
                }
            });

        return () => {
            ignore = true;
        };
    }, [state.status, state.stage]);

    return (
        <AuthContext.Provider value={{ user, status, refreshAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}