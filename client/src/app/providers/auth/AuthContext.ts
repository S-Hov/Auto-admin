import { createContext, useContext  } from "react";
import type { AuthUser } from '../../../shared/api/auth/auth.types';

type AuthStatus =
    | 'checking'
    | 'authenticated'
    | 'unauthenticated'
    | 'error';

interface AuthContextValue {
    user: AuthUser | null;
    status: AuthStatus;
    refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined
);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth должен использоваться внутри AuthProvider');

    return context;
}