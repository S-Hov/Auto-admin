import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BootstrapContext, type BootstrapState } from "./BootstrapContext";
import { bootstrap } from "../../../shared/api/bootstrap";
import { STORAGE_KEYS } from "../../../constants/storage";

interface BootstrapProviderProps {
    children: ReactNode;
}

export const BootstrapProvider = ({ children }: BootstrapProviderProps) => {
    const [state, setState] = useState<BootstrapState>({
        status: 'checking',
        stage: null
    });

    const refreshBootstrap = useCallback(async (): Promise<void> => {
        try {
            const response = await bootstrap.getStatus();
            if (!response.data) {
                throw new Error('Сервер не вернул данные о статусе bootstrap');
            }
            setState({ status: 'resolved', stage: response.data.stage });
        } catch {
            setState({ status: 'error', stage: null });
        }
    }, []);

    useEffect(() => {
        let ignore = false;

        bootstrap.getStatus()
            .then((response) => {
                if (!ignore && response.data) {
                    setState({ status: 'resolved', stage: response.data.stage });
                }
            })
            .catch(() => {
                if (!ignore) {
                    setState({ status: 'error', stage: null });
                }
            });

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (state.status === 'resolved' && state.stage === 'ready') {
            if (sessionStorage.getItem(STORAGE_KEYS.INSTALL_TOKEN)) {
                sessionStorage.removeItem(STORAGE_KEYS.INSTALL_TOKEN);
            }
        }
    }, [state.status, state.stage])

    return (
        <BootstrapContext.Provider value={{ state, refreshBootstrap }}>
            {children}
        </BootstrapContext.Provider>
    );
};