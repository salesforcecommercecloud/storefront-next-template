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
import { getLogger } from '@/lib/logger.server';

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
    const logger = getLogger(context);
    const { t } = getTranslation();

    logger.debug('UpdateShopperContext: starting', { method: request.method });

    const session = getAuth(context);
    if (!session.usid) {
        logger.warn('UpdateShopperContext: usid not available');
        return Response.json(
            {
                success: false,
                error: t("Usid isn't available for updating shopper context."),
            },
            { status: 401 }
        );
    }

    if (request.method !== 'PUT') {
        logger.warn('UpdateShopperContext: method not allowed', { method: request.method });
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

        logger.debug('UpdateShopperContext: extracted qualifiers', {
            shopperContextCount: Object.keys(newShopperContext).length,
            sourceCodeContextCount: Object.keys(newSourceCodeContext).length,
        });

        // Validate that at least one qualifier is provided
        if (Object.keys(newShopperContext).length === 0 && Object.keys(newSourceCodeContext).length === 0) {
            logger.warn('UpdateShopperContext: no qualifiers provided');
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

        logger.info('UpdateShopperContext: succeeded', {
            qualifierCount: Object.keys(newShopperContext).length + Object.keys(newSourceCodeContext).length,
        });

        return response;
    } catch (error) {
        logger.error('UpdateShopperContext: failed', { error });
        const statusCode = extractStatusCode(error) ? Number(extractStatusCode(error)) : 500;
        const errorMessage = error instanceof Error ? error.message : t('Shopper context failed to update.');
        return Response.json(
            {
                success: false,
                error: errorMessage,
            } satisfies UpdateShopperContextResponse,
            { status: statusCode }
        );
    }
}
