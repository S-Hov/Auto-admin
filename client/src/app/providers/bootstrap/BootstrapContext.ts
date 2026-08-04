import { createContext, useContext } from "react";
import type { BootstrapStage } from "../../../shared/api/bootstrap/bootstrap.types";

export type BootstrapState =
    | {
        status: 'checking';
        stage: null;
    }
    | {
        status: 'resolved';
        stage: BootstrapStage;
    }
    | {
        status: 'error';
        stage: null;
    };

export interface BootstrapContextValue {
    state: BootstrapState;
    refreshBootstrap: () => Promise<void>;
}

export const BootstrapContext = createContext<BootstrapContextValue | undefined>(undefined);

export const useBootstrap = () => {
    const context = useContext(BootstrapContext);
    if (context === undefined) throw new Error('useBootstrap должен использоваться внутри BootstrapProvider');

    return context;
}