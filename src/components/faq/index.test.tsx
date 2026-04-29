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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Faq from './index';

const { mockOpenShopperAgentAndSendMessage, mockUseConfig, mockIsShopperAgentContextUiEnabled } = vi.hoisted(() => ({
    mockOpenShopperAgentAndSendMessage: vi.fn(),
    mockUseConfig: vi.fn(),
    mockIsShopperAgentContextUiEnabled: vi.fn(() => true),
}));

vi.mock('@/components/shopper-agent', () => ({
    openShopperAgentAndSendMessage: mockOpenShopperAgentAndSendMessage,
}));

vi.mock('@/lib/shopper-agent-context-ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/shopper-agent-context-ui')>();
    return {
        ...actual,
        isShopperAgentContextUiEnabled: () => mockIsShopperAgentContextUiEnabled(),
    };
});

vi.mock('@salesforce/storefront-next-runtime/config', async () => {
    const actual = await vi.importActual<typeof import('@salesforce/storefront-next-runtime/config')>(
        '@salesforce/storefront-next-runtime/config'
    );
    return {
        ...actual,
        useConfig: () => mockUseConfig(),
    };
});

const validCommerceAgent = {
    enabled: 'true' as const,
    embeddedServiceName: 'test_service',
    embeddedServiceEndpoint: 'https://test.my.site.com/ESWtest',
    scriptSourceUrl: 'https://test.my.site.com/ESWtest/assets/js/bootstrap.min.js',
    scrt2Url: 'https://test.salesforce-scrt.com',
    salesforceOrgId: '00Dxx0000000000',
    siteId: 'RefArch',
};

const mockQuestions = {
    questions: [
        'What sizes does this come in?',
        'Which color would work best for a minimalist space?',
        'Will this work in a minimalist living room?',
    ],
};

const mockGetFaqQuestions = vi.fn();

const mockUseProductContent = vi.fn();
vi.mock('@/hooks/product-content/use-product-content', () => ({
    useProductContent: () => mockUseProductContent(),
}));

vi.mock('@/providers/product-view', () => ({
    useProductView: () => ({
        product: { id: 'test-product-id' },
    }),
}));

describe('Faq', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsShopperAgentContextUiEnabled.mockReturnValue(true);
        mockUseProductContent.mockReturnValue({
            adapter: { getFaqQuestions: mockGetFaqQuestions },
            isEnabled: true,
        });
        mockGetFaqQuestions.mockResolvedValue(mockQuestions);
        mockUseConfig.mockReturnValue({ commerceAgent: validCommerceAgent });
    });

    it('renders Ask assistant section with questions after data loads', async () => {
        render(<Faq />);

        await waitFor(() => {
            expect(screen.getByText('Ask assistant')).toBeInTheDocument();
        });

        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByText('What sizes does this come in?')).toBeInTheDocument();
        expect(screen.getByText('Which color would work best for a minimalist space?')).toBeInTheDocument();
        expect(screen.getByText('Will this work in a minimalist living room?')).toBeInTheDocument();
    });

    it('renders nothing when adapter has no getFaqQuestions', async () => {
        mockUseProductContent.mockReturnValue({
            adapter: {},
            isEnabled: true,
        });

        const { container } = render(<Faq />);

        await waitFor(() => {
            expect(container.firstChild).toBeNull();
        });
    });

    it('renders nothing when getFaqQuestions returns empty questions', async () => {
        mockGetFaqQuestions.mockResolvedValue({ questions: [] });

        const { container } = render(<Faq />);

        await waitFor(() => {
            expect(mockGetFaqQuestions).toHaveBeenCalledWith('test-product-id');
        });
        expect(container.firstChild).toBeNull();
    });

    it('calls getFaqQuestions with product id', async () => {
        render(<Faq />);

        await waitFor(() => {
            expect(mockGetFaqQuestions).toHaveBeenCalledWith('test-product-id');
        });
    });

    it('opens shopper agent with the FAQ question when commerce agent is enabled', async () => {
        const user = userEvent.setup();
        render(<Faq />);

        const button = await screen.findByRole('button', {
            name: /Open shopper agent and ask: What sizes does this come in\?/,
        });
        await user.click(button);

        expect(mockOpenShopperAgentAndSendMessage).toHaveBeenCalledTimes(1);
        expect(mockOpenShopperAgentAndSendMessage).toHaveBeenCalledWith('What sizes does this come in?');
    });

    it('renders nothing when commerce agent is disabled (FAQ is agent-only)', async () => {
        mockUseConfig.mockReturnValue({
            commerceAgent: { ...validCommerceAgent, enabled: 'false' },
        });
        const { container } = render(<Faq />);

        await waitFor(() => {
            expect(container.firstChild).toBeNull();
        });

        expect(mockGetFaqQuestions).not.toHaveBeenCalled();
        expect(mockOpenShopperAgentAndSendMessage).not.toHaveBeenCalled();
    });

    it('renders nothing when production context UI is off even if agent config is valid', async () => {
        mockIsShopperAgentContextUiEnabled.mockReturnValue(false);
        const { container } = render(<Faq />);

        await waitFor(() => {
            expect(mockGetFaqQuestions).not.toHaveBeenCalled();
        });

        expect(container.firstChild).toBeNull();
        mockIsShopperAgentContextUiEnabled.mockReturnValue(true);
    });
});
