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
import { describe, test, expect } from 'vitest';
import { processPage, type PageProcessorContext } from './process-page';
import type { ShopperExperience } from '@/scapi-client/types';

type Page = ShopperExperience.schemas['Page'];
type Component = ShopperExperience.schemas['Component'];

const makeComponent = (id: string, overrides: Partial<Component> = {}) => ({
    id,
    typeId: `type.${id}`,
    regions: [] as ShopperExperience.schemas['Region'][],
    ...overrides,
});

const makeRegion = (id: string, components: ShopperExperience.schemas['Component'][] = []) => ({
    id,
    components,
});

const makePage = (regions: ShopperExperience.schemas['Region'][] = []): Page => ({
    id: 'test-page',
    typeId: 'storePage',
    regions,
});

describe('processPage', () => {
    describe('visibility rules', () => {
        test('keeps components without visibility rules', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);
            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            expect(result.regions?.[0].components).toHaveLength(1);
            expect(result.regions?.[0].components?.[0].id).toBe('banner');
        });

        test('removes components whose visibility rules fail', () => {
            const page = makePage([makeRegion('main', [makeComponent('public-banner'), makeComponent('vip-offer')])]);

            const context: PageProcessorContext = {
                qualifiers: { customerGroups: {}, campaignQualifiers: {} },
                locale: 'en_US',
                componentInfo: {
                    'public-banner': {
                        visibilityRules: [],
                    },
                    'vip-offer': {
                        visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                    },
                },
            };

            const result = processPage(page, context);
            expect(result.regions?.[0].components?.map((c) => c.id)).toEqual(['public-banner']);
        });

        test('keeps components whose visibility rules pass', () => {
            const page = makePage([makeRegion('main', [makeComponent('vip-offer')])]);

            const context: PageProcessorContext = {
                qualifiers: { customerGroups: { vip: true }, campaignQualifiers: {} },
                locale: 'en_US',
                componentInfo: {
                    'vip-offer': {
                        visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                    },
                },
            };

            const result = processPage(page, context);
            expect(result.regions?.[0].components).toHaveLength(1);
        });

        test('keeps component when any visibility rule passes (OR logic)', () => {
            const page = makePage([makeRegion('main', [makeComponent('promo')])]);

            const context: PageProcessorContext = {
                qualifiers: {
                    customerGroups: { vip: true },
                    campaignQualifiers: {},
                },
                locale: 'en_US',
                componentInfo: {
                    promo: {
                        visibilityRules: [
                            { activeLocales: ['en_US'], customerGroups: ['vip'] },
                            {
                                activeLocales: ['en_US'],
                                campaignQualifiers: [{ campaignId: 'sale', promotionId: 'discount' }],
                            },
                        ],
                    },
                },
            };

            const result = processPage(page, context);
            expect(result.regions?.[0].components).toHaveLength(1);
            expect(result.regions?.[0].components?.[0].id).toBe('promo');
        });

        test('removes component when all visibility rules fail', () => {
            const page = makePage([makeRegion('main', [makeComponent('promo')])]);

            const context: PageProcessorContext = {
                qualifiers: {
                    customerGroups: {},
                    campaignQualifiers: {},
                },
                locale: 'en_US',
                componentInfo: {
                    promo: {
                        visibilityRules: [
                            { activeLocales: ['en_US'], customerGroups: ['vip'] },
                            {
                                activeLocales: ['en_US'],
                                campaignQualifiers: [{ campaignId: 'sale', promotionId: 'discount' }],
                            },
                        ],
                    },
                },
            };

            const result = processPage(page, context);
            expect(result.regions?.[0].components).toHaveLength(0);
        });
    });

    describe('descendant traversal', () => {
        test('filters nested components with failing visibility rules', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('container', {
                        regions: [makeRegion('inner', [makeComponent('nested-vip')])],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: { customerGroups: {}, campaignQualifiers: {} },
                locale: 'en_US',
                componentInfo: {
                    container: {
                        visibilityRules: [],
                    },
                    'nested-vip': {
                        visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                    },
                },
            };

            const result = processPage(page, context);
            const container = result.regions?.[0].components?.[0];
            expect(container?.id).toBe('container');
            expect(container?.regions?.[0].components).toHaveLength(0);
        });

        test('resolves data bindings on nested components', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('container', {
                        regions: [
                            makeRegion('inner', [
                                makeComponent('bound-child', {
                                    data: { heading: 'Fallback' } as unknown as Component['data'],
                                    custom: {
                                        dataBinding: {
                                            expressions: { heading: 'content_asset.title' },
                                            contexts: [{ type: 'content_asset', id: 'asset-1' }],
                                        },
                                    } as unknown as Component['custom'],
                                }),
                            ]),
                        ],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: {
                    customerGroups: {},
                    campaignQualifiers: {},
                    dataBindings: {
                        content_asset: { 'asset-1': { title: 'Resolved Title' } },
                    },
                },
                locale: 'en_US',
                componentInfo: {
                    container: {
                        visibilityRules: [],
                    },
                    'bound-child': {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            const child = result.regions?.[0].components?.[0].regions?.[0].components?.[0];
            expect((child?.data as Record<string, unknown>).heading).toBe('Resolved Title');
        });

        test('traverses children when component is not in componentInfo', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('unknown-container', {
                        regions: [makeRegion('inner', [makeComponent('nested-vip')])],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: { customerGroups: {}, campaignQualifiers: {} },
                locale: 'en_US',
                componentInfo: {
                    'nested-vip': {
                        visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                    },
                },
            };

            const result = processPage(page, context);
            const container = result.regions?.[0].components?.[0];
            expect(container?.id).toBe('unknown-container');
            expect(container?.regions?.[0].components).toHaveLength(0);
        });

        test('always traverses descendants regardless of descendant flags', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('container', {
                        regions: [makeRegion('inner', [makeComponent('child')])],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    container: {
                        visibilityRules: [],
                    },
                    child: {
                        visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                    },
                },
            };

            const result = processPage(page, context);
            const container = result.regions?.[0].components?.[0];
            // Child is removed because descendants are always traversed
            expect(container?.regions?.[0].components).toHaveLength(0);
        });
    });

    describe('data binding resolution', () => {
        test('resolves data binding expressions on components', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Fallback' } as unknown as Component['data'],
                        custom: {
                            dataBinding: {
                                expressions: { heading: 'content_asset.title' },
                                contexts: [{ type: 'content_asset', id: 'asset-1' }],
                            },
                        } as unknown as Component['custom'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: {
                    customerGroups: {},
                    campaignQualifiers: {},
                    dataBindings: {
                        content_asset: { 'asset-1': { title: 'Winter Sale' } },
                    },
                },
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Winter Sale');
        });

        test('leaves components unchanged when no dataBindings are provided', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Static' } as unknown as Component['data'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Static');
        });
    });

    describe('locale content resolution', () => {
        test('merges locale-specific content into component data', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Default Heading' } as unknown as Component['data'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            en_US: { heading: 'English Heading', subtitle: 'English Subtitle' },
                            fr_FR: { heading: 'Titre Français', subtitle: 'Sous-titre Français' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('English Heading');
            expect(data.subtitle).toBe('English Subtitle');
        });

        test('selects content for the correct locale', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'fr_FR',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            en_US: { heading: 'English' },
                            fr_FR: { heading: 'Français' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Français');
        });

        test('leaves component unchanged when no content exists for locale or default', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Original' } as unknown as Component['data'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'ja_JP',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            en_US: { heading: 'English' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Original');
        });

        test('leaves component unchanged when componentInfo has no content', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Original' } as unknown as Component['data'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Original');
        });

        test('applies default content when no locale-specific content exists', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'ja_JP',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            default: { heading: 'Default Heading', subtitle: 'Default Subtitle' },
                            en_US: { heading: 'English' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            expect(data.heading).toBe('Default Heading');
            expect(data.subtitle).toBe('Default Subtitle');
        });

        test('locale-specific content overrides default content', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            default: { heading: 'Default Heading', subtitle: 'Default Subtitle' },
                            en_US: { heading: 'English Heading' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            // Locale-specific value overrides default
            expect(data.heading).toBe('English Heading');
            // Default value is preserved for attributes not overridden by locale
            expect(data.subtitle).toBe('Default Subtitle');
        });

        test('data bindings override locale content for bound attributes', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('banner', {
                        data: { heading: 'Default', body: 'Default Body' } as unknown as Component['data'],
                        custom: {
                            dataBinding: {
                                expressions: { heading: 'content_asset.title' },
                                contexts: [{ type: 'content_asset', id: 'asset-1' }],
                            },
                        } as unknown as Component['custom'],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: {
                    customerGroups: {},
                    campaignQualifiers: {},
                    dataBindings: {
                        content_asset: { 'asset-1': { title: 'Bound Title' } },
                    },
                },
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            en_US: { heading: 'Locale Heading', body: 'Locale Body' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const data = result.regions?.[0].components?.[0].data as Record<string, unknown>;
            // Data binding overrides the locale content for 'heading'
            expect(data.heading).toBe('Bound Title');
            // Locale content is preserved for non-bound attributes
            expect(data.body).toBe('Locale Body');
        });
    });

    describe('localized flag', () => {
        test('sets localized to true when locale-specific content exists', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            default: { heading: 'Default' },
                            en_US: { heading: 'English' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const component = result.regions?.[0].components?.[0] as Record<string, unknown>;
            expect(component.localized).toBe(true);
        });

        test('sets localized to false when falling back to default locale only', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'ja_JP',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                        content: {
                            default: { heading: 'Default' },
                            en_US: { heading: 'English' },
                        },
                    },
                },
            };

            const result = processPage(page, context);
            const component = result.regions?.[0].components?.[0] as Record<string, unknown>;
            expect(component.localized).toBe(false);
        });

        test('sets localized to false when componentInfo has no content', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: {
                        visibilityRules: [],
                    },
                },
            };

            const result = processPage(page, context);
            const component = result.regions?.[0].components?.[0] as Record<string, unknown>;
            expect(component.localized).toBe(false);
        });
    });

    describe('visible flag', () => {
        test('sets visible to true on all processed components', () => {
            const page = makePage([makeRegion('main', [makeComponent('banner'), makeComponent('promo')])]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    banner: { visibilityRules: [] },
                    promo: { visibilityRules: [] },
                },
            };

            const result = processPage(page, context);
            const components = result.regions?.[0].components as Record<string, unknown>[];
            expect(components[0].visible).toBe(true);
            expect(components[1].visible).toBe(true);
        });

        test('sets visible to true on nested components', () => {
            const page = makePage([
                makeRegion('main', [
                    makeComponent('container', {
                        regions: [makeRegion('inner', [makeComponent('child')])],
                    }),
                ]),
            ]);

            const context: PageProcessorContext = {
                qualifiers: null,
                locale: 'en_US',
                componentInfo: {
                    container: { visibilityRules: [] },
                    child: { visibilityRules: [] },
                },
            };

            const result = processPage(page, context);
            const container = result.regions?.[0].components?.[0] as Record<string, unknown>;
            const child = result.regions?.[0].components?.[0].regions?.[0].components?.[0] as Record<string, unknown>;
            expect(container.visible).toBe(true);
            expect(child.visible).toBe(true);
        });
    });

    test('handles page with no regions', () => {
        const page = makePage();
        const context: PageProcessorContext = {
            qualifiers: null,
            locale: 'en_US',
            componentInfo: {},
        };

        const result = processPage(page, context);
        expect(result.regions).toEqual([]);
    });

    test('handles components not in componentInfo', () => {
        const page = makePage([makeRegion('main', [makeComponent('unknown')])]);
        const context: PageProcessorContext = {
            qualifiers: null,
            locale: 'en_US',
            componentInfo: {},
        };

        const result = processPage(page, context);
        expect(result.regions?.[0].components).toHaveLength(1);
    });

    test('does not mutate the original page object', () => {
        const innerComponent = makeComponent('nested-vip');
        const innerRegion = makeRegion('inner', [innerComponent]);
        const container = makeComponent('container', { regions: [innerRegion] });
        const mainRegion = makeRegion('main', [container]);
        const page = makePage([mainRegion]);

        const context: PageProcessorContext = {
            qualifiers: { customerGroups: {}, campaignQualifiers: {} },
            locale: 'en_US',
            componentInfo: {
                container: {
                    visibilityRules: [],
                },
                'nested-vip': {
                    visibilityRules: [{ activeLocales: ['en_US'], customerGroups: ['vip'] }],
                },
            },
        };

        const result = processPage(page, context);

        // The nested-vip component should be filtered from the result
        expect(result.regions?.[0].components?.[0].regions?.[0].components).toHaveLength(0);

        // The original page should still have the nested-vip component
        expect(page.regions?.[0].components?.[0].regions?.[0].components).toHaveLength(1);
        expect(page.regions?.[0].components?.[0].regions?.[0].components?.[0].id).toBe('nested-vip');
    });
});
