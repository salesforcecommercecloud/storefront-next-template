import { defineConfig } from 'tsdown'

export default defineConfig([
  // Library build (without shebang)
  {
    entry: {
      index: 'src/index.ts'
    },
    format: ['esm'],
    clean: true,
    dts: true,
    sourcemap: true,
    minify: false
  },
  // CLI build (with shebang)
  {
    entry: {
      cli: 'src/cli.ts'
    },
    format: ['esm'],
    banner: {
      js: '#!/usr/bin/env node'
    },
    minify: false,
    copy: [
      {
        from: 'src/extensibility/templates',
        to: 'dist/extensibility/templates'
      }
    ]
  }
])
