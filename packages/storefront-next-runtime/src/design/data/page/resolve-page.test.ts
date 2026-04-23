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
import { describe, test, expect, vi } from 'vitest';
import { resolvePage } from './resolve-page';
import { RequiredError } from '../errors/required';
import type { ManifestStorage, PageManifest, SiteManifest, QualifierContext } from '../types';

const makePage = (id = 'resolved-page') => ({
    id,
    typeId: 'storePage',
    regions: [],
});

const makePageManifest = (overrides: Partial<PageManifest> = {}): PageManifest => ({
    pageId: 'test-page',
    context: { campaignQualifiers: [], customerGroups: [], dataBindings: [] },
    variationOrder: ['default'],
    variations: {
        default: {
            ruleRequiresContext: false,
            pageRequiresContext: false,
            page: makePage(),
        },
    },
    defaultVariation: 'default',
    componentInfo: {},
    ...overrides,
});

const makeSiteManifest = (overrides: Partial<SiteManifest> = {}): SiteManifest => ({
    contentObjectAssignments: {},
    categories: {},
    ...overrides,
});

const makeStorage = (
    pageManifest: PageManifest | null = makePageManifest(),
    siteManifest: SiteManifest = makeSiteManifest()
): ManifestStorage => ({
    getPageManifest: vi.fn(() => Promise.resolve(pageManifest as PageManifest)),
    getSiteManifest: vi.fn(() => Promise.resolve(siteManifest)),
});

describe('resolvePage', () => {
    test('resolves a page by direct page ID', async () => {
        const storage = makeStorage();

        const result = await resolvePage({
            id: 'homepage',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
        });

        expect(result).not.toBeNull();
        expect(result?.id).toBe('resolved-page');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(storage.getSiteManifest).not.toHaveBeenCalled();
    });

    test('resolves a product ID via content assignment', async () => {
        const siteManifest = makeSiteManifest({
            contentObjectAssignments: {
                pdp: {
                    product: {
                        'prod-1': { lookupMode: 'category-explicit', contentId: 'page-prod-1' },
                    },
                },
            },
        });

        const pageManifest = makePageManifest({ pageId: 'page-prod-1' });
        const storage = makeStorage(pageManifest, siteManifest);

        const result = await resolvePage({
            id: 'prod-1',
            identifierType: 'product',
            aspectType: 'pdp',
            locale: 'en-US',
            manifestStorage: storage,
        });

        expect(result).not.toBeNull();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(storage.getSiteManifest).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(storage.getPageManifest).toHaveBeenCalledWith('page-prod-1');
    });

    test('returns null when product ID has no content assignment', async () => {
        const storage = makeStorage(null, makeSiteManifest());

        const result = await resolvePage({
            id: 'unknown-product',
            identifierType: 'product',
            aspectType: 'pdp',
            locale: 'en-US',
            manifestStorage: storage,
        });

        expect(result).toBeNull();
    });

    test('returns null when page manifest is not found', async () => {
        const storage = makeStorage(null);

        const result = await resolvePage({
            id: 'missing-page',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
        });

        expect(result).toBeNull();
    });

    test('returns null when no variation matches', async () => {
        const pageManifest = makePageManifest({
            variationOrder: ['vip-only'],
            variations: {
                'vip-only': {
                    ruleRequiresContext: true,
                    pageRequiresContext: false,
                    visibilityRule: { activeLocales: ['en-US'], customerGroups: ['vip'] },
                    page: makePage(),
                },
            },
            defaultVariation: 'nonexistent',
        });

        const storage = makeStorage(pageManifest);

        const result = await resolvePage({
            id: 'homepage',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
            contextResolver: () =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                }),
        });

        expect(result).toBeNull();
    });

    test('calls contextResolver when pageRequiresContext is true', async () => {
        const contextResolver = vi.fn(
            (): Promise<QualifierContext> =>
                Promise.resolve({
                    customerGroups: { vip: true },
                    campaignQualifiers: {},
                })
        );

        const pageManifest = makePageManifest({
            variationOrder: ['default'],
            variations: {
                default: {
                    ruleRequiresContext: false,
                    pageRequiresContext: true,
                    page: makePage(),
                },
            },
            componentInfo: {},
        });

        const storage = makeStorage(pageManifest);

        await resolvePage({
            id: 'homepage',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
            contextResolver,
        });

        expect(contextResolver).toHaveBeenCalled();
    });

    test('does not call contextResolver when pageRequiresContext is false', async () => {
        const contextResolver = vi.fn(
            (): Promise<QualifierContext> =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                })
        );

        const pageManifest = makePageManifest({
            variationOrder: ['default'],
            variations: {
                default: {
                    ruleRequiresContext: false,
                    pageRequiresContext: false,
                    page: makePage(),
                },
            },
        });

        const storage = makeStorage(pageManifest);

        await resolvePage({
            id: 'homepage',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
            contextResolver,
        });

        expect(contextResolver).not.toHaveBeenCalled();
    });

    test('throws RequiredError when aspectType is missing for product type', async () => {
        const storage = makeStorage(null, makeSiteManifest());

        await expect(
            resolvePage({
                id: 'prod-1',
                identifierType: 'product',
                locale: 'en-US',
                manifestStorage: storage,
            })
        ).rejects.toThrow(RequiredError);
    });

    test('throws RequiredError when aspectType is missing for category type', async () => {
        const storage = makeStorage(null, makeSiteManifest());

        await expect(
            resolvePage({
                id: 'cat-1',
                identifierType: 'category',
                locale: 'en-US',
                manifestStorage: storage,
            })
        ).rejects.toThrow(RequiredError);
    });

    test('throws RequiredError when aspectType is an empty string', async () => {
        const storage = makeStorage(null, makeSiteManifest());

        await expect(
            resolvePage({
                id: 'prod-1',
                identifierType: 'product',
                aspectType: '',
                locale: 'en-US',
                manifestStorage: storage,
            })
        ).rejects.toThrow(RequiredError);
    });

    test('filters components based on visibility rules in the resolved page', async () => {
        const page = {
            id: 'homepage',
            typeId: 'storePage',
            regions: [
                {
                    id: 'main',
                    components: [
                        { id: 'public-banner', typeId: 'banner', regions: [] },
                        { id: 'vip-offer', typeId: 'promo', regions: [] },
                    ],
                },
            ],
        };

        const pageManifest = makePageManifest({
            variationOrder: ['default'],
            variations: {
                default: {
                    ruleRequiresContext: false,
                    pageRequiresContext: true,
                    page,
                },
            },
            componentInfo: {
                'public-banner': {
                    visibilityRules: [],
                    regions: {},
                },
                'vip-offer': {
                    visibilityRules: [{ activeLocales: ['en-US'], customerGroups: ['vip'] }],
                    regions: {},
                },
            },
        });

        const storage = makeStorage(pageManifest);

        const result = await resolvePage({
            id: 'homepage',
            identifierType: 'page',
            locale: 'en-US',
            manifestStorage: storage,
            contextResolver: () =>
                Promise.resolve({
                    customerGroups: {},
                    campaignQualifiers: {},
                }),
        });

        expect(result?.regions?.[0].components?.map((c) => c.id)).toEqual(['public-banner']);
    });
});
