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
import type { ActionFunctionArgs } from 'react-router';
import { getAuth } from '@/middlewares/auth.server';

// TODO: This is temporary file. Once everything is migrated to use server side loaders and actions,
// you can safely delete this file. The file ./customer.ts would be sufficient.

/**
 * Check if the current session belongs to a registered customer (server-side)
 *
 * @param context - React Router context
 * @returns boolean indicating if user is registered and logged in
 */
export function isRegisteredCustomer(context: ActionFunctionArgs['context']): boolean {
    const session = getAuth(context);
    return !!(
        session.userType === 'registered' &&
        session.customer_id &&
        session.access_token &&
        session.access_token_expiry &&
        session.access_token_expiry > Date.now()
    );
}
