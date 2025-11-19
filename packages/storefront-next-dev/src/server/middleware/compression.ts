import compression from 'compression';
import type { RequestHandler } from 'express';
import zlib from 'node:zlib';
import { warn } from '../../utils/logger';

/**
 * Parse and validate COMPRESSION_LEVEL environment variable
 * @returns Valid compression level (0-9) or default compression level
 */
function getCompressionLevel(): number {
    const raw = process.env.COMPRESSION_LEVEL;
    const DEFAULT = zlib.constants.Z_DEFAULT_COMPRESSION;

    if (raw == null || raw.trim() === '') {
        return DEFAULT;
    }

    const level = Number(raw);

    const isValid = Number.isInteger(level) && level >= 0 && level <= 9;

    if (!isValid) {
        warn(`[compression] Invalid COMPRESSION_LEVEL="${raw}". ` + `Using default (${DEFAULT}).`);
        return DEFAULT;
    }

    return level;
}

/**
 * Create compression middleware for gzip/brotli compression
 * Used in serve mode to optimize response sizes
 */
export function createCompressionMiddleware(): RequestHandler {
    const compressionLevel = getCompressionLevel();

    return compression({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        },
        // Compression level (0-9, higher = better compression but slower)
        // default is zlib.constants.Z_DEFAULT_COMPRESSION = -1
        level: compressionLevel,
    });
}
