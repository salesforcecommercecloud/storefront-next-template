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
/**
 * Configuration Context Tests
 *
 * Tests the ConfigProvider and createAppConfig function.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, createAppConfig, ConfigContext } from './context';
import { useContext } from 'react';
import { mockBuildConfig } from '@/test-utils/config';

describe('createAppConfig', () => {
    it('should extract app section from Config', () => {
        const appConfig = createAppConfig(mockBuildConfig);

        // Should have all app properties
        expect(appConfig.commerce).toBe(mockBuildConfig.app.commerce);
        expect(appConfig.commerce.sites).toBe(mockBuildConfig.app.commerce.sites);
        expect(appConfig.pages).toBe(mockBuildConfig.app.pages);
        expect(appConfig.global).toBe(mockBuildConfig.app.global);

        // Should not have runtime (it's build config, not app config)
        expect(appConfig).not.toHaveProperty('runtime');
    });

    it('should not include runtime build settings', () => {
        const appConfig = createAppConfig(mockBuildConfig);

        // Runtime section is build/deployment config, not needed at app runtime
        expect(appConfig).not.toHaveProperty('runtime');
    });

    it('should not include metadata in AppConfig', () => {
        const appConfig = createAppConfig(mockBuildConfig);

        expect('metadata' in appConfig).toBe(false);
    });
});

describe('ConfigProvider', () => {
    it('should provide config to children', () => {
        const appConfig = createAppConfig(mockBuildConfig);

        function TestComponent() {
            const config = useContext(ConfigContext);
            return <div data-testid="config-value">{config?.commerce.api.clientId}</div>;
        }

        const { getByTestId } = render(
            <ConfigProvider config={appConfig}>
                <TestComponent />
            </ConfigProvider>
        );

        expect(getByTestId('config-value')).toHaveTextContent('test-client');
    });

    it('should provide null when no config is provided', () => {
        function TestComponent() {
            const config = useContext(ConfigContext);
            return <div data-testid="config-value">{config === null ? 'null' : 'not-null'}</div>;
        }

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('config-value')).toHaveTextContent('null');
    });
});
