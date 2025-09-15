"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type AuthContextType = {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STATUS_KEY = 'isLoggedIn';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check session storage on initial load
        try {
            const storedAuthStatus = sessionStorage.getItem(AUTH_STATUS_KEY);
            if (storedAuthStatus === 'true') {
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error("Could not read auth status from session storage", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = () => {
        try {
            sessionStorage.setItem(AUTH_STATUS_KEY, 'true');
            setIsLoggedIn(true);
        } catch (error) {
             console.error("Could not set auth status in session storage", error);
        }
    };

    const logout = () => {
        try {
            sessionStorage.removeItem(AUTH_STATUS_KEY);
            setIsLoggedIn(false);
        } catch (error) {
             console.error("Could not remove auth status from session storage", error);
        }
    };

    const value = { isLoggedIn, login, logout, loading };

    // Don't render children until we have checked the auth status
    if (loading) {
        return null; // Or a global loader
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
