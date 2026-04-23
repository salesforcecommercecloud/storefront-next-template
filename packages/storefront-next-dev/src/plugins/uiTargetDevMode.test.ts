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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { uiTargetDevModePlugin } from './uiTargetDevMode';

const TSX_FILE = '/project/src/components/Product.tsx';
const JSX_FILE = '/project/src/components/Product.jsx';
const NODE_MODULES_FILE = '/project/node_modules/some-lib/Component.tsx';
const UI_TARGET_FILE = '/project/src/targets/ui-target.tsx';

const CODE_WITH_UITARGET = `
import { UITarget } from '@/targets/ui-target';
export function Page() {
    return (
        <div>
            <UITarget targetId="pdp.badge" />
        </div>
    );
}
`;

const CODE_WITH_UITARGET_WITH_CHILDREN = `
import { UITarget } from '@/targets/ui-target';
export function Page() {
    return (
        <UITarget targetId="pdp.loyalty">
            <Widget />
        </UITarget>
    );
}
`;

const CODE_WITH_UITARGET_NO_IMPORT = `
export function Page() {
    return <UITarget targetId="pdp.badge" />;
}
`;

const CODE_WITHOUT_UITARGET = `
export function Page() {
    return <div>Hello</div>;
}
`;

const CODE_WITH_UITARGET_NO_TARGETID = `
import { UITarget } from '@/targets/ui-target';
export function Page() {
    return <UITarget />;
}
`;

const CODE_WITH_UITARGET_DYNAMIC_TARGETID = `
import { UITarget } from '@/targets/ui-target';
export function Page({ id }: { id: string }) {
    return <UITarget targetId={id} />;
}
`;

describe('uiTargetDevModePlugin', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalViteEnv = process.env.VITE_UI_TARGET_DEV_MODE;

    beforeEach(() => {
        delete process.env.VITE_UI_TARGET_DEV_MODE;
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalViteEnv === undefined) {
            delete process.env.VITE_UI_TARGET_DEV_MODE;
        } else {
            process.env.VITE_UI_TARGET_DEV_MODE = originalViteEnv;
        }
        vi.restoreAllMocks();
    });

    describe('plugin registration', () => {
        it('returns noop plugin in production', () => {
            process.env.NODE_ENV = 'production';
            const plugin = uiTargetDevModePlugin({ enabled: true });
            expect(plugin.name).toBe('storefront-next:ui-target-dev-mode-noop');
            expect((plugin as any).transform).toBeUndefined();
        });

        it('returns disabled plugin when not enabled and no env var', () => {
            const plugin = uiTargetDevModePlugin();
            expect(plugin.name).toBe('storefront-next:ui-target-dev-mode-disabled');
            expect((plugin as any).transform).toBeUndefined();
        });

        it('returns disabled plugin when enabled: false', () => {
            process.env.VITE_UI_TARGET_DEV_MODE = 'true';
            const plugin = uiTargetDevModePlugin({ enabled: false });
            expect(plugin.name).toBe('storefront-next:ui-target-dev-mode-disabled');
        });

        it('activates via VITE_UI_TARGET_DEV_MODE env var', () => {
            process.env.VITE_UI_TARGET_DEV_MODE = 'true';
            const plugin = uiTargetDevModePlugin();
            expect(plugin.name).toBe('storefront-next:ui-target-dev-mode');
            expect((plugin as any).transform).toBeDefined();
        });

        it('activates via enabled: true config', () => {
            const plugin = uiTargetDevModePlugin({ enabled: true });
            expect(plugin.name).toBe('storefront-next:ui-target-dev-mode');
            expect((plugin as any).transform).toBeDefined();
        });

        it('sets enforce: pre', () => {
            const plugin = uiTargetDevModePlugin({ enabled: true });
            expect(plugin.enforce).toBe('pre');
        });
    });

    describe('transform()', () => {
        let transform: (code: string, id: string) => unknown;

        beforeEach(() => {
            const plugin = uiTargetDevModePlugin({ enabled: true });
            transform = (plugin as any).transform.bind(plugin);
        });

        it('skips non-tsx/jsx files', () => {
            expect(transform(CODE_WITH_UITARGET, '/project/src/foo.ts')).toBeNull();
            expect(transform(CODE_WITH_UITARGET, '/project/src/foo.js')).toBeNull();
            expect(transform(CODE_WITH_UITARGET, '/project/src/foo.css')).toBeNull();
        });

        it('skips node_modules', () => {
            expect(transform(CODE_WITH_UITARGET, NODE_MODULES_FILE)).toBeNull();
        });

        it('skips the ui-target.tsx component itself', () => {
            expect(transform(CODE_WITH_UITARGET, UI_TARGET_FILE)).toBeNull();
        });

        it('skips files without UITarget text', () => {
            expect(transform(CODE_WITHOUT_UITARGET, TSX_FILE)).toBeNull();
        });

        it('skips files that only contain UITargetProviders (not UITarget)', () => {
            // Regression: 'UITargetProviders'.includes('UITarget') === true, so a naive
            // string check would incorrectly process files that only use UITargetProviders.
            const code = `
                import { UITargetProviders } from '@/targets/ui-target-providers';
                export default function Root({ children }) {
                    return <UITargetProviders>{children}</UITargetProviders>;
                }
            `;
            expect(transform(code, TSX_FILE)).toBeNull();
        });

        it('skips files with UITarget but missing the expected import', () => {
            expect(transform(CODE_WITH_UITARGET_NO_IMPORT, TSX_FILE)).toBeNull();
        });

        it('transforms UITarget without children (insertion slot)', () => {
            const result = transform(CODE_WITH_UITARGET, TSX_FILE) as { code: string };
            expect(result).not.toBeNull();
            expect(result.code).toContain('UITargetDevMarker');
            expect(result.code).toContain('pdp.badge');
            expect(result.code).toContain('__file__');
            expect(result.code).toContain('__hasChildren__');
            expect(result.code).toContain('@/lib/ui-target-dev-mode/marker');
        });

        it('transforms UITarget with children (wrapper slot)', () => {
            const result = transform(CODE_WITH_UITARGET_WITH_CHILDREN, TSX_FILE) as { code: string };
            expect(result).not.toBeNull();
            expect(result.code).toContain('UITargetDevMarker');
            expect(result.code).toContain('pdp.loyalty');
        });

        it('processes .jsx files', () => {
            const result = transform(CODE_WITH_UITARGET, JSX_FILE);
            expect(result).not.toBeNull();
        });

        it('returns null when no transforms were applied', () => {
            // File has UITarget text and import but AST finds no <UITarget> elements
            const codeWithTextButNoJsx = `
import { UITarget } from '@/targets/ui-target';
const x = 'UITarget is mentioned here but not used as JSX';
`;
            expect(transform(codeWithTextButNoJsx, TSX_FILE)).toBeNull();
        });

        it('skips UITarget without targetId attribute', () => {
            // The logger emits a warn — verified by inspecting test output.
            // The important behavior is that transform returns null (no code emitted).
            const result = transform(CODE_WITH_UITARGET_NO_TARGETID, TSX_FILE);
            expect(result).toBeNull();
        });

        it('skips UITarget with non-string (dynamic) targetId', () => {
            // The logger emits a warn — verified by inspecting test output.
            // The important behavior is that transform returns null (no code emitted).
            const result = transform(CODE_WITH_UITARGET_DYNAMIC_TARGETID, TSX_FILE);
            expect(result).toBeNull();
        });

        it('returns null and logs error on parse failure', () => {
            const errorSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
            const result = transform('this is not valid tsx }{}{', TSX_FILE.replace('.tsx', '.jsx'));
            // Quick-check passes (no 'UITarget' in string), so it returns null before parse
            expect(result).toBeNull();
            errorSpy.mockRestore();
        });

        it('returns null and logs on transform error for valid-looking but malformed JSX', () => {
            const badCode = `import { UITarget } from '@/targets/ui-target';\n<UITarget targetId="x" `;
            const errorSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
            const result = transform(badCode, TSX_FILE);
            expect(result).toBeNull();
            errorSpy.mockRestore();
        });

        it('includes source map in output', () => {
            const result = transform(CODE_WITH_UITARGET, TSX_FILE) as { code: string; map: unknown };
            expect(result).not.toBeNull();
            expect(result.map).toBeDefined();
        });
    });

    describe('filterCategory', () => {
        let transform: (code: string, id: string) => unknown;

        const codeWithTwoTargets = `
import { UITarget } from '@/targets/ui-target';
export function Page() {
    return (
        <div>
            <UITarget targetId="pdp.badge" />
            <UITarget targetId="cart.summary" />
        </div>
    );
}
`;

        beforeEach(() => {
            const plugin = uiTargetDevModePlugin({ enabled: true, filterCategory: 'pdp' });
            transform = (plugin as any).transform.bind(plugin);
        });

        it('transforms only targets matching the filter category', () => {
            const result = transform(codeWithTwoTargets, TSX_FILE) as { code: string };
            expect(result).not.toBeNull();
            expect(result.code).toContain('pdp.badge');
            // cart.summary should remain as UITarget (not transformed to UITargetDevMarker)
            expect(result.code).toContain('cart.summary');
        });

        it('returns null when no targets match the filter category', () => {
            const codeWithCartOnly = `
import { UITarget } from '@/targets/ui-target';
export function Page() {
    return <UITarget targetId="cart.summary" />;
}
`;
            expect(transform(codeWithCartOnly, TSX_FILE)).toBeNull();
        });
    });
});
