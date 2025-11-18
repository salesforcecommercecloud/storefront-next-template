import { describe, test, expect } from 'vitest';
import 'reflect-metadata';
import { COMPONENT_PACKAGE } from './component';
import {
    RegionDefinition,
    getRegionDefinitions,
    getRegionDefinition,
    getRegionIds,
    getRegionNames,
    getRegionExclusions,
    getRegionExclusionsForRegion,
    getRegionInclusions,
    getRegionInclusionsForRegion,
    getRegionDefaultConstructors,
    getRegionDefaultConstructorsForRegion,
    getRegionMaxComponents,
    REGION_DEFINITIONS_KEY,
    type RegionDefinitionConfig,
} from './region-definition';

describe('RegionDefinition Decorator', () => {
    describe('RegionDefinition Decorator', () => {
        test('decorates class with single region definition', () => {
            const config: RegionDefinitionConfig = {
                id: 'main-content',
                name: 'Main Content',
                description: 'Primary content area',
            };

            @RegionDefinition([config])
            class TestComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, TestComponent);
            expect(definitions).toHaveLength(1);
            expect(definitions[0].id).toBe('main-content');
            expect(definitions[0].name).toBe('Main Content');
        });

        test('decorates class with multiple region definitions', () => {
            @RegionDefinition([
                {
                    id: 'header',
                    name: 'Header',
                },
                {
                    id: 'content',
                    name: 'Content',
                },
                {
                    id: 'footer',
                    name: 'Footer',
                },
            ])
            class LayoutComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, LayoutComponent);
            expect(definitions).toHaveLength(3);
            expect(definitions[0].id).toBe('header');
            expect(definitions[1].id).toBe('content');
            expect(definitions[2].id).toBe('footer');
        });

        test('transforms component type exclusions with package prefix', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    componentTypeExclusions: ['header', 'footer'],
                },
            ])
            class TestComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, TestComponent);
            expect(definitions[0].componentTypeExclusions).toEqual([
                `${COMPONENT_PACKAGE}.header`,
                `${COMPONENT_PACKAGE}.footer`,
            ]);
        });

        test('transforms component type inclusions with package prefix', () => {
            @RegionDefinition([
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    componentTypeInclusions: ['banner', 'promo'],
                },
            ])
            class TestComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, TestComponent);
            expect(definitions[0].componentTypeInclusions).toEqual([
                `${COMPONENT_PACKAGE}.banner`,
                `${COMPONENT_PACKAGE}.promo`,
            ]);
        });

        test('transforms default component constructors typeId with package prefix', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    defaultComponentConstructors: [
                        {
                            id: 'hero-1',
                            typeId: 'hero',
                            data: { title: 'Welcome' },
                        },
                    ],
                },
            ])
            class TestComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, TestComponent);
            expect(definitions[0].defaultComponentConstructors[0].typeId).toBe(`${COMPONENT_PACKAGE}.hero`);
        });

        test('sets maxComponents property', () => {
            @RegionDefinition([
                {
                    id: 'limited',
                    name: 'Limited Region',
                    maxComponents: 5,
                },
            ])
            class TestComponent {}

            const definitions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, TestComponent);
            expect(definitions[0].maxComponents).toBe(5);
        });

        test('stores individual metadata properties', () => {
            @RegionDefinition([
                {
                    id: 'region1',
                    name: 'Region 1',
                    componentTypeExclusions: ['excluded1'],
                    componentTypeInclusions: ['included1'],
                    defaultComponentConstructors: [
                        {
                            id: 'default1',
                            typeId: 'hero',
                            data: {},
                        },
                    ],
                },
            ])
            class TestComponent {}

            const regionIds = Reflect.getMetadata('region:ids', TestComponent);
            const regionNames = Reflect.getMetadata('region:names', TestComponent);
            const exclusions = Reflect.getMetadata('region:exclusions', TestComponent);
            const inclusions = Reflect.getMetadata('region:inclusions', TestComponent);
            const defaultConstructors = Reflect.getMetadata('region:default-constructors', TestComponent);

            expect(regionIds).toEqual(['region1']);
            expect(regionNames).toEqual(['Region 1']);
            expect(exclusions).toEqual([`${COMPONENT_PACKAGE}.excluded1`]);
            expect(inclusions).toEqual([`${COMPONENT_PACKAGE}.included1`]);
            expect(defaultConstructors).toHaveLength(1);
        });
    });

    describe('getRegionDefinitions', () => {
        test('retrieves all region definitions', () => {
            @RegionDefinition([
                { id: 'r1', name: 'Region 1' },
                { id: 'r2', name: 'Region 2' },
            ])
            class TestComponent {}

            const definitions = getRegionDefinitions(TestComponent);
            expect(definitions).toHaveLength(2);
            expect(definitions[0].id).toBe('r1');
            expect(definitions[1].id).toBe('r2');
        });

        test('returns empty array for non-decorated class', () => {
            class PlainComponent {}

            const definitions = getRegionDefinitions(PlainComponent);
            expect(definitions).toEqual([]);
        });
    });

    describe('getRegionDefinition', () => {
        test('retrieves specific region definition by ID', () => {
            @RegionDefinition([
                { id: 'header', name: 'Header' },
                { id: 'content', name: 'Content' },
                { id: 'footer', name: 'Footer' },
            ])
            class TestComponent {}

            const definition = getRegionDefinition(TestComponent, 'content');
            expect(definition?.id).toBe('content');
            expect(definition?.name).toBe('Content');
        });

        test('returns undefined for non-existent region ID', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const definition = getRegionDefinition(TestComponent, 'nonexistent');
            expect(definition).toBeUndefined();
        });

        test('returns undefined for non-decorated class', () => {
            class PlainComponent {}

            const definition = getRegionDefinition(PlainComponent, 'any-id');
            expect(definition).toBeUndefined();
        });
    });

    describe('getRegionIds', () => {
        test('retrieves all region IDs', () => {
            @RegionDefinition([
                { id: 'header', name: 'Header' },
                { id: 'main', name: 'Main' },
                { id: 'sidebar', name: 'Sidebar' },
            ])
            class TestComponent {}

            const ids = getRegionIds(TestComponent);
            expect(ids).toEqual(['header', 'main', 'sidebar']);
        });

        test('returns empty array for non-decorated class', () => {
            class PlainComponent {}

            const ids = getRegionIds(PlainComponent);
            expect(ids).toEqual([]);
        });
    });

    describe('getRegionNames', () => {
        test('retrieves all region names', () => {
            @RegionDefinition([
                { id: 'h', name: 'Header Section' },
                { id: 'm', name: 'Main Content' },
                { id: 'f', name: 'Footer Area' },
            ])
            class TestComponent {}

            const names = getRegionNames(TestComponent);
            expect(names).toEqual(['Header Section', 'Main Content', 'Footer Area']);
        });

        test('returns empty array for non-decorated class', () => {
            class PlainComponent {}

            const names = getRegionNames(PlainComponent);
            expect(names).toEqual([]);
        });
    });

    describe('getRegionExclusions', () => {
        test('retrieves all component type exclusions from all regions', () => {
            @RegionDefinition([
                {
                    id: 'region1',
                    name: 'Region 1',
                    componentTypeExclusions: ['header', 'footer'],
                },
                {
                    id: 'region2',
                    name: 'Region 2',
                    componentTypeExclusions: ['sidebar'],
                },
            ])
            class TestComponent {}

            const exclusions = getRegionExclusions(TestComponent);
            expect(exclusions).toEqual([
                `${COMPONENT_PACKAGE}.header`,
                `${COMPONENT_PACKAGE}.footer`,
                `${COMPONENT_PACKAGE}.sidebar`,
            ]);
        });

        test('returns empty array when no exclusions defined', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const exclusions = getRegionExclusions(TestComponent);
            expect(exclusions).toEqual([]);
        });
    });

    describe('getRegionExclusionsForRegion', () => {
        test('retrieves exclusions for specific region', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    componentTypeExclusions: ['header', 'footer'],
                },
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    componentTypeExclusions: ['hero'],
                },
            ])
            class TestComponent {}

            const exclusions = getRegionExclusionsForRegion(TestComponent, 'main');
            expect(exclusions).toEqual([`${COMPONENT_PACKAGE}.header`, `${COMPONENT_PACKAGE}.footer`]);
        });

        test('returns empty array for region without exclusions', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const exclusions = getRegionExclusionsForRegion(TestComponent, 'main');
            expect(exclusions).toEqual([]);
        });

        test('returns empty array for non-existent region', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const exclusions = getRegionExclusionsForRegion(TestComponent, 'nonexistent');
            expect(exclusions).toEqual([]);
        });
    });

    describe('getRegionInclusions', () => {
        test('retrieves all component type inclusions from all regions', () => {
            @RegionDefinition([
                {
                    id: 'region1',
                    name: 'Region 1',
                    componentTypeInclusions: ['hero', 'banner'],
                },
                {
                    id: 'region2',
                    name: 'Region 2',
                    componentTypeInclusions: ['promo'],
                },
            ])
            class TestComponent {}

            const inclusions = getRegionInclusions(TestComponent);
            expect(inclusions).toEqual([
                `${COMPONENT_PACKAGE}.hero`,
                `${COMPONENT_PACKAGE}.banner`,
                `${COMPONENT_PACKAGE}.promo`,
            ]);
        });

        test('returns empty array when no inclusions defined', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const inclusions = getRegionInclusions(TestComponent);
            expect(inclusions).toEqual([]);
        });
    });

    describe('getRegionInclusionsForRegion', () => {
        test('retrieves inclusions for specific region', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    componentTypeInclusions: ['hero', 'product-grid'],
                },
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    componentTypeInclusions: ['banner'],
                },
            ])
            class TestComponent {}

            const inclusions = getRegionInclusionsForRegion(TestComponent, 'main');
            expect(inclusions).toEqual([`${COMPONENT_PACKAGE}.hero`, `${COMPONENT_PACKAGE}.product-grid`]);
        });

        test('returns empty array for region without inclusions', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const inclusions = getRegionInclusionsForRegion(TestComponent, 'main');
            expect(inclusions).toEqual([]);
        });

        test('returns empty array for non-existent region', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const inclusions = getRegionInclusionsForRegion(TestComponent, 'nonexistent');
            expect(inclusions).toEqual([]);
        });
    });

    describe('getRegionDefaultConstructors', () => {
        test('retrieves all default constructors from all regions', () => {
            @RegionDefinition([
                {
                    id: 'region1',
                    name: 'Region 1',
                    defaultComponentConstructors: [
                        { id: 'hero-1', typeId: 'hero', data: {} },
                        { id: 'banner-1', typeId: 'banner', data: {} },
                    ],
                },
                {
                    id: 'region2',
                    name: 'Region 2',
                    defaultComponentConstructors: [{ id: 'promo-1', typeId: 'promo', data: {} }],
                },
            ])
            class TestComponent {}

            const constructors = getRegionDefaultConstructors(TestComponent);
            expect(constructors).toHaveLength(3);
            expect(constructors[0].id).toBe('hero-1');
            expect(constructors[1].id).toBe('banner-1');
            expect(constructors[2].id).toBe('promo-1');
        });

        test('returns empty array when no default constructors defined', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const constructors = getRegionDefaultConstructors(TestComponent);
            expect(constructors).toEqual([]);
        });
    });

    describe('getRegionDefaultConstructorsForRegion', () => {
        test('retrieves default constructors for specific region', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    defaultComponentConstructors: [
                        {
                            id: 'default-hero',
                            typeId: 'hero',
                            data: { title: 'Welcome' },
                        },
                        {
                            id: 'default-banner',
                            typeId: 'banner',
                            data: { message: 'Sale' },
                        },
                    ],
                },
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    defaultComponentConstructors: [
                        {
                            id: 'sidebar-promo',
                            typeId: 'promo',
                            data: {},
                        },
                    ],
                },
            ])
            class TestComponent {}

            const constructors = getRegionDefaultConstructorsForRegion(TestComponent, 'main');
            expect(constructors).toHaveLength(2);
            expect(constructors[0].id).toBe('default-hero');
            expect(constructors[1].id).toBe('default-banner');
        });

        test('returns empty array for region without default constructors', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const constructors = getRegionDefaultConstructorsForRegion(TestComponent, 'main');
            expect(constructors).toEqual([]);
        });

        test('returns empty array for non-existent region', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const constructors = getRegionDefaultConstructorsForRegion(TestComponent, 'nonexistent');
            expect(constructors).toEqual([]);
        });
    });

    describe('getRegionMaxComponents', () => {
        test('retrieves max components for specific region', () => {
            @RegionDefinition([
                {
                    id: 'main',
                    name: 'Main',
                    maxComponents: 10,
                },
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    maxComponents: 5,
                },
            ])
            class TestComponent {}

            const mainMax = getRegionMaxComponents(TestComponent, 'main');
            const sidebarMax = getRegionMaxComponents(TestComponent, 'sidebar');

            expect(mainMax).toBe(10);
            expect(sidebarMax).toBe(5);
        });

        test('returns undefined for region without maxComponents', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const max = getRegionMaxComponents(TestComponent, 'main');
            expect(max).toBeUndefined();
        });

        test('returns undefined for non-existent region', () => {
            @RegionDefinition([{ id: 'main', name: 'Main' }])
            class TestComponent {}

            const max = getRegionMaxComponents(TestComponent, 'nonexistent');
            expect(max).toBeUndefined();
        });
    });

    describe('Complex Real-world Scenarios', () => {
        test('page layout with multiple regions and all properties', () => {
            @RegionDefinition([
                {
                    id: 'header',
                    name: 'Header',
                    description: 'Page header area',
                    maxComponents: 3,
                    componentTypeInclusions: ['navigation', 'logo', 'search'],
                },
                {
                    id: 'main-content',
                    name: 'Main Content',
                    description: 'Primary content area',
                    maxComponents: 20,
                    componentTypeExclusions: ['header', 'footer'],
                    defaultComponentConstructors: [
                        {
                            id: 'hero-default',
                            typeId: 'hero',
                            data: {
                                title: 'Welcome to Our Store',
                                imageUrl: '/images/hero.jpg',
                            },
                        },
                    ],
                },
                {
                    id: 'sidebar',
                    name: 'Sidebar',
                    maxComponents: 5,
                    componentTypeInclusions: ['promo-banner', 'product-recommendations'],
                },
                {
                    id: 'footer',
                    name: 'Footer',
                    description: 'Page footer area',
                    maxComponents: 4,
                    componentTypeInclusions: ['footer-links', 'newsletter-signup'],
                },
            ])
            class PageLayout {}

            const definitions = getRegionDefinitions(PageLayout);
            expect(definitions).toHaveLength(4);

            const mainContent = getRegionDefinition(PageLayout, 'main-content');
            expect(mainContent?.name).toBe('Main Content');
            expect(mainContent?.maxComponents).toBe(20);
            expect(mainContent?.defaultComponentConstructors).toHaveLength(1);

            const headerInclusions = getRegionInclusionsForRegion(PageLayout, 'header');
            expect(headerInclusions).toContain(`${COMPONENT_PACKAGE}.navigation`);
        });

        test('container component with nested regions', () => {
            @RegionDefinition([
                {
                    id: 'tab-1',
                    name: 'Tab 1',
                    maxComponents: 10,
                },
                {
                    id: 'tab-2',
                    name: 'Tab 2',
                    maxComponents: 10,
                },
                {
                    id: 'tab-3',
                    name: 'Tab 3',
                    maxComponents: 10,
                },
            ])
            class TabbedContainer {}

            const ids = getRegionIds(TabbedContainer);
            const names = getRegionNames(TabbedContainer);

            expect(ids).toEqual(['tab-1', 'tab-2', 'tab-3']);
            expect(names).toEqual(['Tab 1', 'Tab 2', 'Tab 3']);
        });
    });

    describe('Constants', () => {
        test('exports correct region definitions key', () => {
            expect(REGION_DEFINITIONS_KEY).toBe('region:definitions');
        });
    });
});
