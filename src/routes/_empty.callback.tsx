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
import { type LoaderFunctionArgs, redirect } from 'react-router';
import { buildUrlFromContext } from '@/lib/url.server';
import { getLogger } from '@/lib/logger.server';

// TODO: This is right now just a naive shell to make client-side auth flow at least work. This requires attention.
export function loader({ request, context }: LoaderFunctionArgs) {
    const logger = getLogger(context);
    const { searchParams } = new URL(request.url);
    logger.debug('OAuthCallback: loader starting');

    // SLAS sends different parameter names than direct OAuth
    const code = searchParams.get('code');
    const usid = searchParams.get('usid');
    if (code && usid) {
        logger.debug('OAuthCallback: valid code and usid received');
        return new Response(null, { status: 200 });
    }
    logger.warn('OAuthCallback: missing code or usid, redirecting to login');
    return redirect(buildUrlFromContext('/login', context));
}
