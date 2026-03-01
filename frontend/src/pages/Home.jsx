import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import EmployeeDashboard from './EmployeeDashboard';
import VaultManagerDashboard from './VaultManagerDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';

const RoleBasedDashboard = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'Super Admin') {
        return <SuperAdminDashboard />;
    } else if (user.role === 'Vault Manager') {
        return <VaultManagerDashboard />;
    } else {
        return <EmployeeDashboard />;
    }
};

export default RoleBasedDashboard;
