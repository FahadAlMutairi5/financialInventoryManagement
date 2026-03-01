import { createContext, useState, useEffect } from 'react';
import api from '../api';
import { jwtDecode } from 'jwt-decode'; // Needs to be installed next

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                // Decode token to get username or id, fetch /users/me/ if we had it, but simple JWT doesn't.
                // For MVP, we'll store basic role if decoded, or fetch users list and filter.
                // Here we fetch all users and find ours by id. (Django Simple JWT payload has user_id)
                fetchCurrentUser(token);
            } catch (err) {
                console.error("Token decode failed", err);
                logout();
            }
        } else {
            setLoading(false);
        }
    }, []);

    const fetchCurrentUser = async (token) => {
        try {
            const decoded = jwtDecode(token);
            // We need to fetch from /api/users/ to get roles, since JWT only stores user_id
            const response = await api.get('/users/');
            const currentUser = response.data.find(u => u.id === Number(decoded.user_id));
            if (currentUser) {
                setUser(currentUser);
            } else {
                logout();
            }
        } catch (error) {
            console.error("Failed to fetch user details", error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const response = await api.post('/auth/token/', { username, password });
        const { access, refresh } = response.data;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        await fetchCurrentUser(access);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
