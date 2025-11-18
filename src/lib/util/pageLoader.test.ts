import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperienceTypes } from 'commerce-sdk-isomorphic';
import { fetchPageFromLoader, collectComponentDataPromises } from './pageLoader';
import { fetchPage } from '@/lib/api/page';
import { registry } from '@/lib/registry';

vi.mock('@/lib/api/page', () => ({
    fetchPage: vi.fn(),
}));

vi.mock('@/lib/registry', () => ({
    registry: {
        getLoaders: vi.fn(),
    },
}));

const mockedFetchPage = vi.mocked(fetchPage);
const mockedRegistry = vi.mocked(registry);

// Test constants
const TEST_CONTEXT = { shopperContext: 'test' };
const BASE_URL = 'https://example.com/page';
const MOCK_PAGE_ID = 'test-page';
const MOCK_PD_TOKEN = 'abc123';

// Test utilities
const createLoaderArgs = (url: string, context = TEST_CONTEXT): LoaderFunctionArgs => ({
    request: new Request(url),
    context,
    params: {},
});

const createMockPage = (regions: any[] = []): ShopperExperienceTypes.Page =>
    ({
        id: 'mock-page',
        regions,
    }) as ShopperExperienceTypes.Page;

const createMockComponent = (id: string, typeId: string, additionalProps = {}) => ({
    id,
    typeId,
    ...additionalProps,
});

const createMockRegion = (components: any[]) => ({ components });
describe('pageLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedFetchPage.mockResolvedValue(createMockPage());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchPageFromLoader', () => {
        test('calls fetchPage with basic params when no mode in URL', async () => {
            const args = createLoaderArgs(BASE_URL);

            await fetchPageFromLoader(args, { pageId: MOCK_PAGE_ID });

            expect(fetchPage).toHaveBeenCalledWith(TEST_CONTEXT, { pageId: MOCK_PAGE_ID });
        });

        test('includes mode=EDIT and pdToken (and pageId from URL) when present', async () => {
            const urlPageId = 'url-page';
            const args = createLoaderArgs(`${BASE_URL}?mode=EDIT&pdToken=${MOCK_PD_TOKEN}&pageId=${urlPageId}`);

            await fetchPageFromLoader(args, { pageId: 'param-page', aspectType: 'product' });

            // URL pageId should override params.pageId because it’s spread later
            expect(fetchPage).toHaveBeenCalledWith(TEST_CONTEXT, {
                aspectType: 'product',
                mode: 'EDIT',
                pdToken: MOCK_PD_TOKEN,
                pageId: urlPageId,
            });
        });

        test('includes mode=PREVIEW and pdToken when present', async () => {
            const previewToken = 'xyz789';
            const args = createLoaderArgs(`${BASE_URL}?mode=PREVIEW&pdToken=${previewToken}`);

            await fetchPageFromLoader(args, { pageId: MOCK_PAGE_ID });

            expect(fetchPage).toHaveBeenCalledWith(TEST_CONTEXT, {
                pageId: MOCK_PAGE_ID,
                mode: 'PREVIEW',
                pdToken: previewToken,
            });
        });

        test('does not include pdToken if missing even in EDIT mode', async () => {
            const args = createLoaderArgs(`${BASE_URL}?mode=EDIT`);

            await fetchPageFromLoader(args, { pageId: MOCK_PAGE_ID });

            expect(fetchPage).toHaveBeenCalledWith(TEST_CONTEXT, {
                pageId: MOCK_PAGE_ID,
                mode: 'EDIT',
            });
        });

        test('includes mode=VIEW but ignores pdToken and pageId from URL', async () => {
            const paramPageId = 'param-page';
            const args = createLoaderArgs(`${BASE_URL}?mode=VIEW&pdToken=shouldNotAppear&pageId=ignored`);

            await fetchPageFromLoader(args, { pageId: paramPageId });

            expect(fetchPage).toHaveBeenCalledWith(TEST_CONTEXT, {
                pageId: paramPageId, // URL pageId is ignored in VIEW mode
                mode: 'VIEW',
            });
        });

        test('propagates fetchPage errors', async () => {
            const error = new Error('API Error');
            mockedFetchPage.mockRejectedValueOnce(error);

            await expect(fetchPageFromLoader(createLoaderArgs(BASE_URL), { pageId: MOCK_PAGE_ID })).rejects.toThrow(
                'API Error'
            );
        });
    });

    describe('collectComponentDataPromises', () => {
        test('returns empty map when page has no regions', async () => {
            const args = createLoaderArgs(BASE_URL);
            const page = createMockPage([]);

            const result = await collectComponentDataPromises(args, Promise.resolve(page));

            expect(result).toEqual({});
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockedRegistry.getLoaders).toHaveBeenCalledTimes(0);
        });

        test('returns promises only for components with server loaders', async () => {
            const heroData = { title: 'Hero Title' };
            const footerData = { links: ['home', 'about'] };

            mockedRegistry.getLoaders
                .mockReturnValueOnce({ server: vi.fn().mockResolvedValue(heroData) })
                .mockReturnValueOnce(undefined) // carousel has no loader
                .mockReturnValueOnce({ server: vi.fn().mockResolvedValue(footerData) });

            const args = createLoaderArgs(BASE_URL);
            const components = [
                createMockComponent('hero-1', 'hero'),
                createMockComponent('carousel-1', 'carousel'),
                createMockComponent('footer-1', 'footer'),
            ];
            const page = createMockPage([createMockRegion(components)]);

            const result = await collectComponentDataPromises(args, Promise.resolve(page));

            expect(Object.keys(result)).toEqual(['hero-1', 'footer-1']);
            await expect(result['hero-1']).resolves.toEqual(heroData);
            await expect(result['footer-1']).resolves.toEqual(footerData);
        });

        test('server loader receives componentData and context', async () => {
            const serverLoader = vi.fn().mockResolvedValue({ loaded: true });
            mockedRegistry.getLoaders.mockReturnValue({ server: serverLoader });

            const args = createLoaderArgs(BASE_URL);
            const component = createMockComponent('hero-1', 'hero', { title: 'Hero Title' });
            const page = createMockPage([createMockRegion([component])]);

            const dataPromises = await collectComponentDataPromises(args, Promise.resolve(page));
            await dataPromises['hero-1'];

            expect(serverLoader).toHaveBeenCalledWith({
                componentData: component,
                context: TEST_CONTEXT,
            });
        });

        test('rejects promise when server loader throws error', async () => {
            const loaderError = new Error('Server loader failed');
            const serverLoader = vi.fn().mockRejectedValue(loaderError);
            mockedRegistry.getLoaders.mockReturnValue({ server: serverLoader });

            const args = createLoaderArgs(BASE_URL);
            const component = createMockComponent('failing-component', 'hero');
            const page = createMockPage([createMockRegion([component])]);

            const dataPromises = await collectComponentDataPromises(args, Promise.resolve(page));

            await expect(dataPromises['failing-component']).rejects.toThrow('Server loader failed');
        });

        test('handles regions with null/undefined components gracefully', async () => {
            const args = createLoaderArgs(BASE_URL);
            const page = createMockPage([
                { components: null },
                { components: undefined },
                createMockRegion([]), // empty array
            ]);

            const dataPromises = await collectComponentDataPromises(args, Promise.resolve(page));

            expect(dataPromises).toEqual({});
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockedRegistry.getLoaders).toHaveBeenCalledTimes(0);
        });

        test('processes multiple regions with mixed loader availability', async () => {
            const heroData = { type: 'hero' };
            const bannerData = { type: 'banner' };
            const footerData = { type: 'footer' };

            mockedRegistry.getLoaders
                .mockReturnValueOnce({ server: vi.fn().mockResolvedValue(heroData) })
                .mockReturnValueOnce({ server: vi.fn().mockResolvedValue(bannerData) })
                .mockReturnValueOnce(undefined) // carousel has no loader
                .mockReturnValueOnce({ server: vi.fn().mockResolvedValue(footerData) });

            const args = createLoaderArgs(BASE_URL);
            const page = createMockPage([
                createMockRegion([createMockComponent('hero-1', 'hero'), createMockComponent('banner-1', 'banner')]),
                createMockRegion([
                    createMockComponent('carousel-1', 'carousel'), // no loader
                    createMockComponent('footer-1', 'footer'),
                ]),
            ]);

            const dataPromises = await collectComponentDataPromises(args, Promise.resolve(page));

            expect(Object.keys(dataPromises)).toEqual(['hero-1', 'banner-1', 'footer-1']);

            const results = await Promise.all([
                dataPromises['hero-1'],
                dataPromises['banner-1'],
                dataPromises['footer-1'],
            ]);

            expect(results).toEqual([heroData, bannerData, footerData]);
        });
    });
});
