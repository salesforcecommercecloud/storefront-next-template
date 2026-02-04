/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use client';

import { createContext, type PropsWithChildren, useContext } from 'react';
import type { SessionData } from '@/lib/api/types';
import { getAuthDataFromCookies } from '@/middlewares/auth.client';

/**
 * Bootstrap auth data used during client hydration before loader data is available.
 *
 * - On the client: snapshot of auth data from cookies at call time.
 * - On the server: always undefined.
 *
 * This is consumed by the root App component to provide a fallback value when
 * the loader-based auth value is not yet available.
 */
/* eslint-disable react-refresh/only-export-components */

export const getBootstrapSession = (): SessionData | undefined =>
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
