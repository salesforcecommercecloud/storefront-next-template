#!/usr/bin/env node
/**
 * Check if a port is available before running lighthouse CI
 * This prevents LHCI from testing against a stale server that's already running
 */
import net from 'node:net';

// TODO: remove this temporary file. Soon Kevin's refactoring will make it unnecessary.

const PORT = parseInt(process.env.PORT || '5173', 10);

/**
 * Check if a port is in use on a specific host
 * @param {number} port - The port to check
 * @param {string} host - The host to check
 * @returns {Promise<boolean>} - Returns true if port is in use, false otherwise
 */
function checkPortOnHost(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                // For other errors (like EADDRNOTAVAIL), port might still be available
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(false);
            });
        });

        server.listen(port, host);
    });
}

/**
 * Check if a port is already in use on any interface
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - Returns true if port is in use, false otherwise
 */
async function isPortInUse(port) {
    // Check both IPv4 and IPv6 localhost
    // Check IPv6 first since Node.js prefers it
    const ipv6InUse = await checkPortOnHost(port, '::1');
    if (ipv6InUse) return true;

    const ipv4InUse = await checkPortOnHost(port, '127.0.0.1');
    if (ipv4InUse) return true;

    // Also check default binding (0.0.0.0)
    const defaultInUse = await checkPortOnHost(port, '0.0.0.0');
    return defaultInUse;
}

async function main() {
    console.log(`[Pre-LHCI Check] Verifying port ${PORT} is available...`);

    const portInUse = await isPortInUse(PORT);

    if (portInUse) {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
        console.error(`\nLighthouse CI needs to start a fresh server to test your latest changes.`);
        console.error(`Please stop any running servers on port ${PORT} before running lighthouse:ci.\n`);
        console.error(`To find and stop the process using port ${PORT}:`);
        console.error(`  lsof -ti :${PORT} | xargs kill -9\n`);
        process.exit(1);
    }

    console.log(`✅ Port ${PORT} is available. Proceeding with Lighthouse CI...\n`);
}

main();
