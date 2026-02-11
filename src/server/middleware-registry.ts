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
import type { RequestHandler } from 'express';
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { createHybridProxyMiddleware } from '@/extensions/hybrid-proxy/server/middleware';
/** @sfdc-extension-line SFDC_EXT_HYBRID_PROXY */
import { cookieCaptureMiddleware } from '@/extensions/hybrid-proxy/server/cookie-capture';
import config from '@/config/server';

/**
 * Registry for custom server middlewares.
 * This allows for the injection of middleware from extensions.
 * This setup enables extensions, such as hybrid-proxy, to integrate their own Express middlewares by adding them to an array.
 * This approach keeps the core server logic clean and easy to upgrade.
 */
export const customMiddlewares: RequestHandler[] = [
    /** @sfdc-extension-block-start SFDC_EXT_HYBRID_PROXY */
    // Cookie capture must run before other middlewares to wrap the request
    cookieCaptureMiddleware,
    createHybridProxyMiddleware(config.app.commerce.api.siteId, config.app.commerce.sites[0].defaultLocale),
    /** @sfdc-extension-block-end SFDC_EXT_HYBRID_PROXY */
];
