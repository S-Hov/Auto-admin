import { Outlet } from 'react-router-dom';
import AdminShell from '../../../widgets/admin-shell/ui/AdminShell';

export default function AdminLayout() {
  return (
    <AdminShell>
        <Outlet />
    </AdminShell>
  )
}
