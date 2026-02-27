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
import { extractQualifiersFromInput, updateShopperContext } from '@/lib/shopper-context-utils';
import { extractStatusCode, parseJsonToStringRecord } from '@/lib/utils';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@/lib/i18next';

type UpdateShopperContextResponse = {
    success: boolean;
    message?: string;
    error?: string;
};

/**
 * Server action to update all qualifiers in shopper context.
 * Supports customQualifiers, assignmentQualifiers, couponCodes, sourceCode, and other root-level qualifiers.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    const { t } = getTranslation();

    const session = getAuth(context);
    if (!session.usid) {
        return Response.json(
            {
                success: false,
                error: t('Usid is not available for updating shopper context.'),
            },
            { status: 401 }
        );
    }

    if (request.method !== 'PUT') {
        throw new Response(t(`This method isn't allowed to update shopper context.`), { status: 405 });
    }

    try {
        const formData = await request.formData();
        const qualifiersJson = formData.get('qualifiers');

        // Parse new qualifiers
        const allNewQualifiers =
            qualifiersJson && typeof qualifiersJson === 'string' ? parseJsonToStringRecord(qualifiersJson) : {};

        const { qualifiers: newShopperContext, sourceCodeQualifiers: newSourceCodeContext } =
            extractQualifiersFromInput(allNewQualifiers);
        // Validate that at least one qualifier is provided
        if (Object.keys(newShopperContext).length === 0 && Object.keys(newSourceCodeContext).length === 0) {
            return Response.json(
                {
                    success: false,
                    error: t('At least one qualifier must be provided to update shopper context.'),
                },
                { status: 400 }
            );
        }

        // Use shared function to update shopper context
        const { setCookieHeaders } = await updateShopperContext({
            context,
            usid: session.usid,
            newShopperContext,
            newSourceCodeContext,
            cookieHeader: request.headers.get('Cookie'),
        });

        const response = Response.json({
            success: true,
            message: t('Shopper context has been updated.'),
        } satisfies UpdateShopperContextResponse);

        // Apply Set-Cookie headers from updateShopperContext
        for (const header of setCookieHeaders) {
            response.headers.append('Set-Cookie', header);
        }

        return response;
    } catch (error) {
        const statusCode = extractStatusCode(error) ? Number(extractStatusCode(error)) : 500;
        const errorMessage = error instanceof Error ? error.message : t('Shopper context failed to update');
        return Response.json(
            {
                success: false,
                error: errorMessage,
            } satisfies UpdateShopperContextResponse,
            { status: statusCode }
        );
    }
}
