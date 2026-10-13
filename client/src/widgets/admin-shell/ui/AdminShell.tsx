import {
    AdminShellVariants,
    defaultAdminShellVariant,
} from "../model/admin-shell.registry";
import type { AdminShellVariantProps } from "../model/admin-shell.types";

import "./AdminShell.css";

const AdminShell = ({ children }: AdminShellVariantProps) => {
    const selectedModel = "sidebar";

    let model = AdminShellVariants.find((mod) => mod.id === selectedModel);
    if (!model) {
        model = defaultAdminShellVariant;
    }

    return <model.component>{children}</model.component>;
};

export default AdminShell;
