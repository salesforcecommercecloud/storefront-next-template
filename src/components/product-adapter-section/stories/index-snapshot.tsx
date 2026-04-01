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
import { expect, test, describe, afterEach, beforeAll, afterAll } from 'vitest';
import { composeStories } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as ProductAdapterSectionStories from './index.stories';
import { render, cleanup, act } from '@testing-library/react';
import { createProductContentMockAdapter } from '@/adapters/product-content-mock';
import {
    addProductContentAdapter,
    removeProductContentAdapter,
    PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
} from '@/lib/adapters/product-content-store';

const composed = composeStories(ProductAdapterSectionStories);

// ContentComingSoon uses a minimal empty adapter to trigger the "coming soon" fallback.
// The name must match the NULL_ADAPTER_NAME constant in the stories file.
const NULL_ADAPTER_NAME = 'product-null-adapter';

// Pre-register both adapters with zero delay so their Promises resolve as microtasks.
//
// Why register here rather than calling Story.beforeEach()? Vitest test-file module isolation:
// the closure inside the story's beforeEach holds a reference to the stories file's own
// module instance of addProductContentAdapter (a different Map than the one used by
// ProductContentProvider's getProductContentAdapter at render time). Registering directly
// from this test file ensures both callers share the same adapter store.
beforeAll(() => {
    addProductContentAdapter(
        PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
        createProductContentMockAdapter({ enabled: true, mockDelay: 0 })
    );
    // Empty adapter: all method lookups return undefined → shows "Content coming soon." fallback.
    addProductContentAdapter(NULL_ADAPTER_NAME, {});
});

afterAll(() => {
    removeProductContentAdapter(PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME);
    removeProductContentAdapter(NULL_ADAPTER_NAME);
});

afterEach(() => {
    cleanup();
});

describe('ProductAdapterSection stories snapshot', () => {
    for (const [storyName, Story] of Object.entries(composed)) {
        test(`${storyName} story renders and matches snapshot`, async () => {
            const { container } = render(<Story />);
            // Three act() rounds flush the full async initialization chain:
            //   Round 1: Global Storybook decorator (RouterProvider) and outer
            //            ProductContentProvider (WithProductContent) both settle.
            //   Round 2: Inner ProductContentProvider (e.g. WithNullAdapter for ContentComingSoon)
            //            settles and ProductAdapterSection.useEffect fires.
            //   Round 3: setContent() state update (adapter data or false-fallback) is applied,
            //            and the final render captures content / fallback / collapsed skeleton.
            await act(async () => {});
            await act(async () => {});
            await act(async () => {});
            expect(container.firstChild).toMatchSnapshot();
        });
    }
});
