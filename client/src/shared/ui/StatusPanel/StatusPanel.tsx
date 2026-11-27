import type { ReactNode } from 'react';
import { Raccoon, type RaccoonVariant } from '../Raccoon/Raccoon';
import './StatusPanel.css';

interface StatusPanelProps {
    variant: RaccoonVariant;
    title: string;
    description?: string;
    children?: ReactNode;
    fullscreen?: boolean;
    role?: 'alert' | 'status';
}

export function StatusPanel({ variant, title, description, children, fullscreen, role }: StatusPanelProps) {
    return (
        <div className={fullscreen ? 'status-panel status-panel--fullscreen' : 'status-panel'}>
            <div className="status-panel__card">
                <Raccoon variant={variant} />
                <div role={role}>
                    <h1>{title}</h1>
                    {description && <p>{description}</p>}
                </div>
                {children && <div className="status-panel__actions">{children}</div>}
            </div>
        </div>
    );
}
