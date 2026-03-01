import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="reports" element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<div className="p-5 text-center"><h1>404 - Not Found</h1></div>} />
      </Routes>
    </>
  );
}

export default App;
