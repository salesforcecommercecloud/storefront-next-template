'use client';

import { createContext, type PropsWithChildren, useContext } from 'react';
import type { SessionData } from '@/lib/api/types';
import { getAuthDataFromCookies } from '@/middlewares/auth.client';

/**
 * Bootstrap auth data used during client hydration before loader data is available.
 *
 * - On the client: snapshot of auth data from cookies at module load time.
 * - On the server: always undefined.
 *
 * This is consumed by the root App component to provide a fallback value when
 * the loader-based auth value is not yet available.
 */
/* eslint-disable react-refresh/only-export-components */

export const bootstrapAuth: SessionData | undefined =
    typeof window === 'undefined' ? undefined : (getAuthDataFromCookies() as SessionData | undefined);

export const AuthContext = createContext<SessionData | undefined>(undefined);

/**
 * Provider for given auth/session data that's typically retrieved by the auth middleware.
 * @see {@link authMiddleware}
 */
const AuthProvider = ({ children, value }: PropsWithChildren<{ value?: SessionData }>) => {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): SessionData | undefined => {
    return useContext(AuthContext);
};

export default AuthProvider;
