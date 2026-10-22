import { createContext, useContext } from 'react';

export const MenuRefreshContext = createContext<(() => void) | null>(null);

export function useMenuRefresh() {
    const refresh = useContext(MenuRefreshContext);
    if (!refresh) throw new Error('MenuRefreshContext is required inside the admin shell');
    return refresh;
}
