import { type RouteConfig, type RouteConfigEntry } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';
import fs from 'fs';

const pluginRoutes: RouteConfigEntry[] = [];

fs.readdirSync('./src/extensions').forEach((extension: string) => {
    if (fs.existsSync(`./src/extensions/${extension}/routes`)) {
        fs.readdirSync(`./src/extensions/${extension}/routes`).forEach((route: string) => {
            if (
                (route.endsWith('.tsx') || route.endsWith('.ts')) &&
                !route.endsWith('.test.tsx') &&
                !route.endsWith('.test.ts')
            ) {
                const routeName = route.replace('.tsx', '').replace('.ts', '');
                pluginRoutes.push({
                    id: `${extension}-${routeName}`,
                    path: `/${routeName
                        .replace(`./extensions/${extension}/routes/`, '')
                        .replace('.', '/')
                        .replace('$', ':')}`,
                    file: `./extensions/${extension}/routes/${route}`,
                });
            }
        });
    }
});
export default (async () => {
    const fileRoutes = await flatRoutes({ ignoredRouteFiles: ['**/*.test.{ts,tsx}'] });
    return [...pluginRoutes, ...fileRoutes];
})() satisfies RouteConfig;
