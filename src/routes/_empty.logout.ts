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
import { type ActionFunctionArgs, redirect } from 'react-router';
import { destroyAuth as destroyAuthServer, getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients';
import { destroyBasket } from '@/middlewares/basket.server';

/**
 * This server action is required for authentication, because logout must be handled server-side to properly invalidate
 * server-side sessions and integrate with Salesforce Commerce Cloud's authentication system.
 */
export async function action({ context }: ActionFunctionArgs) {
    const session = getAuth(context);
    const { access_token, refresh_token } = session;
    if (access_token && refresh_token) {
        try {
            const clients = createApiClients(context);
            await clients.auth.logout({
                accessToken: access_token,
                refreshToken: refresh_token,
            });
        } catch {
            // SLAS logout failed, but continue with redirect
        }
    }
    destroyAuthServer(context);
    destroyBasket(context);
    return redirect('/');
}
