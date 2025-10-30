/**
 * @file Jest tests for path-util.ts
 * Covers: resolvePathFromAlias, isSupportedFileExtension, FILE_EXTENSIONS
 */

const path = require('path')
const {Volume} = require('memfs')

let vol: any
let resolvePathFromAlias: (p: string, root: string) => string
let isSupportedFileExtension: (f: string) => boolean
let FILE_EXTENSIONS: string[]

function loadModuleWithFs(files: Record<string, string> = {}) {
    jest.resetModules()
    vol = Volume.fromJSON(files)
    jest.doMock('fs', () => vol)
    const mod = require('./path-util')
    resolvePathFromAlias = mod.resolvePathFromAlias
    isSupportedFileExtension = mod.isSupportedFileExtension
    FILE_EXTENSIONS = mod.FILE_EXTENSIONS
}

describe('path-util', () => {
    const mockProjectRoot = '/mock/project'
    const tsconfigPath = path.join(mockProjectRoot, 'tsconfig.json')

    describe('isSupportedFileExtension', () => {
        it('returns true for supported extensions', () => {
            loadModuleWithFs()
            for (const ext of FILE_EXTENSIONS) {
                expect(isSupportedFileExtension(`file${ext}`)).toBe(true)
            }
        })
        it('returns false for unsupported extensions', () => {
            loadModuleWithFs()
            expect(isSupportedFileExtension('file.txt')).toBe(false)
            expect(isSupportedFileExtension('file.md')).toBe(false)
        })
    })

    describe('resolvePathFromAlias', () => {
        beforeEach(() => {
            const baseFiles: Record<string, string> = {}
            baseFiles[tsconfigPath] = JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: {
                        '@/*': ['./src/*'],
                        '+types/*': ['./types/*'],
                        '@alias/CompB': ['src/components/CompB'],
                        '@noMatch/*': ['src/doesnotexist/*']
                    }
                }
            })
            // Existing files
            baseFiles[`${mockProjectRoot}/src/components/CompA.tsx`] = 'export {}'
            baseFiles[`${mockProjectRoot}/src/components/CompB/index.tsx`] = 'export {}'
            baseFiles[`${mockProjectRoot}/types/components/CompA.ts`] = 'export {}'
            loadModuleWithFs(baseFiles)
        })

        it('returns the same path for relative imports', () => {
            expect(resolvePathFromAlias('./foo/bar', mockProjectRoot)).toBe('./foo/bar')
            expect(resolvePathFromAlias('../baz', mockProjectRoot)).toBe('../baz')
        })

        it('resolves a simple alias with wildcard', () => {
            const result = resolvePathFromAlias('@/components/CompA', mockProjectRoot)
            expect(result).toContain('src/components/CompA.tsx')
        })

        it('resolves a simple alias with leading +types', () => {
            const result = resolvePathFromAlias('+types/components/CompA', mockProjectRoot)
            expect(result).toContain('types/components/CompA.ts')
        })

        it('resolves an alias without wildcard', () => {
            const result = resolvePathFromAlias('@alias/CompB', mockProjectRoot)
            expect(result).toContain('src/components/CompB/index.tsx')
        })

        it('returns the original path if no tsconfig.json exists', () => {
            // Recreate module without tsconfig
            loadModuleWithFs({})
            expect(resolvePathFromAlias('@components/CompA', mockProjectRoot)).toBe('@components/CompA')
        })

        it('returns the original path if no alias matches', () => {
            expect(resolvePathFromAlias('notAnAlias/CompA', mockProjectRoot)).toBe('notAnAlias/CompA')
        })

        it('throws if alias matches but no file exists', () => {
            // Provide only tsconfig, but no files mapped
            loadModuleWithFs({
                [tsconfigPath]: JSON.stringify({
                    compilerOptions: { paths: { '@noMatch/*': ['src/doesnotexist/*'] } }
                })
            })
            expect(() => resolvePathFromAlias('@noMatch/DoesNotExist', mockProjectRoot)).toThrow(/Could not resolve import/)
        })

        it('throws if tsconfig.json is invalid', () => {
            loadModuleWithFs({
                [tsconfigPath]: 'invalid json'
            })
            expect(() => resolvePathFromAlias('@/CompA', mockProjectRoot)).toThrow(/Error parsing tsconfig.json/)
        })

        it('resolves to directory if no index file exists but directory exists', () => {
            const files: Record<string, string> = {}
            files[tsconfigPath] = JSON.stringify({
                compilerOptions: { paths: { '@alias/CompB': ['src/components/CompB'] } }
            })
            loadModuleWithFs(files)
            vol.mkdirSync(`${mockProjectRoot}/src/components/CompB`, {recursive: true})
            const result = resolvePathFromAlias('@alias/CompB', mockProjectRoot)
            expect(result).toContain('src/components/CompB')
        })

        it('handles tsconfig.json with comments', () => {
            const commented = `{
                // comment
                "compilerOptions": { "paths": { "@foo/*": ["src/foo/*"] } }
            }`
            const files: Record<string, string> = {}
            files[tsconfigPath] = commented
            files[`${mockProjectRoot}/src/foo/Bar.tsx`] = 'export {}'
            loadModuleWithFs(files)
            const result = resolvePathFromAlias('@foo/Bar', mockProjectRoot)
            expect(result).toContain('src/foo/Bar.tsx')
        })
    })
})
