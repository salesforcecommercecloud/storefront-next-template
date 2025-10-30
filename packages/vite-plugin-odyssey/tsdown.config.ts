import { defineConfig } from 'tsdown'

/**
 * There are three builds:
 * 1. The vite plugin itself, that will be imported from the user land vite.config.ts
 * 2. The MRT server build entry point ssr.js, this bundles the express server and the aws lambda handler
 *    The server requires that the build folder contains a ./server/index.js file which is the react-router
 *    server build.
 * 3. The React Router preset config, exported for use in user land react-router.config.ts
 */
export default defineConfig([{
  entry: {
    index: 'src/index.ts',
  },
  platform: 'node',
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  clean: true,
},
{
  entry: {
    Scripts: 'src/react-router/Scripts.tsx',
  },
  platform: 'neutral',
  format: ['esm'],
  dts: true,
  outDir: 'dist/react-router',
  clean: true,
},
{
  entry: {
    ssr: 'src/mrt/ssr.ts',
  },
  platform: 'node',
  format: ['cjs'],
  outExtensions: () => {
    return {
      // By default, tsdown creates .cjs extension for commonjs output
      // But, we need to create .js extension for MRT compatibility
      js: '.js',
      dts: '.d.ts',
    }
  },
  dts: true,
  outDir: 'dist/mrt',
  // This is the react-router server build entry point, it is created from the user land when running `vite build
  // it is a relative path from within the build directory
  external: ['./server/index.js'],
  // unlike rollup where we can use `noExternal: true`, tsdown doesn't support it.
  // This regex will bundle all dependencies (except node internals?)
  // this regex is not extensively tested, if you encounter any issues like "require('xxx') not found"
  // you may need to fix this
  noExternal: '/.*/',
  clean: true
},
{
  entry: {
    'react-router.config': 'src/configs/react-router.config.ts',
  },
  platform: 'node',
  format: ['esm'],
  dts: true,
  outDir: 'dist/configs',
  clean: true,
}])
