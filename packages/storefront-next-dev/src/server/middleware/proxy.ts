import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { ServerConfig } from '../config';
import { getCommerceCloudApiUrl } from '../../utils/paths';

/**
 * Create proxy middleware for Commerce Cloud API
 * Proxies requests from /mobify/proxy/api to the Commerce Cloud API
 */
export function createCommerceProxyMiddleware(config: ServerConfig): RequestHandler {
    const target = getCommerceCloudApiUrl(config.commerce.api.shortCode);

    return createProxyMiddleware({
        target,
        changeOrigin: true,
    });
}
