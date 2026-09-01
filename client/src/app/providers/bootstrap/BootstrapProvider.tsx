import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BootstrapContext, type BootstrapState } from "./BootstrapContext";
import { bootstrap } from "../../../shared/api/bootstrap";

interface BootstrapProviderProps {
    children: ReactNode;
}

export const BootstrapProvider = ({ children }: BootstrapProviderProps ) => {
    const [state, setState] = useState<BootstrapState>({
        status: 'checking',
        stage: null
    });

    const refreshBootstrap = useCallback(async (): Promise<void> => {
        setState({ status: 'checking', stage: null });

        try {
            const response = await bootstrap.getStatus();
            
            if (!response.data) {
                throw new Error('Сервер не вернул данные о статусе bootstrap');
            }

            setState({ status: 'resolved', stage: response.data.stage });
        }
        catch {
            setState({ status: 'error', stage: null });
        }
    }, []);

    useEffect(() => {
        void refreshBootstrap();
    }, [refreshBootstrap]);

    return (
        <BootstrapContext.Provider value={{ state, refreshBootstrap }}>
            {children}
        </BootstrapContext.Provider>
    )
}