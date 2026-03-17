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
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { isProxyPath } from './config';

/**
 * A client-side component that listens for navigation changes.
 * If the user navigates to a path that is configured to be proxied,
 * this component forces a full page reload so that the request
 * goes to the server (and hits the Hybrid Proxy middleware) instead
 * of being handled by the client-side router.
 */
export function HybridProxyNavigationInterceptor() {
    const location = useLocation();

    useEffect(() => {
        if (isProxyPath(location.pathname)) {
            // We are on a client-side route that should be proxied by the server.
            // Force a hard reload to hit the server middleware.
            window.location.reload();
        }
    }, [location]);

    return null;
}
