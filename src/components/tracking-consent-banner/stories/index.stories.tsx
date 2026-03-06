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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { TrackingConsent } from '@/types/tracking-consent';
import { useState } from 'react';

// Mock translation function
const mockT = (key: string) => {
    const translations: Record<string, string> = {
        title: 'Cookie Preferences',
        description:
            'We use cookies to improve your experience. By accepting, you agree to our use of cookies for analytics and personalization.',
        accept: 'Accept',
        decline: 'Decline',
        closeAriaLabel: 'Close banner',
    };
    return translations[key] || key;
};

// Create a wrapper component that mocks the hooks
interface MockedTrackingConsentBannerProps {
    shouldShowBanner?: boolean;
    isTrackingConsentEnabled?: boolean;
    defaultTrackingConsent?: TrackingConsent;
    setTrackingConsent?: (consent: TrackingConsent) => Promise<void>;
    onConsentChange?: (consent: TrackingConsent) => void | Promise<void>;
    configPosition?: 'bottom-left' | 'bottom-right' | 'bottom-center';
}

function MockedTrackingConsentBanner({
    shouldShowBanner = true,
    isTrackingConsentEnabled = true,
    defaultTrackingConsent = TrackingConsent.Declined,
    setTrackingConsent = async () => {},
    onConsentChange,
    configPosition = 'bottom-center',
}: MockedTrackingConsentBannerProps) {
    // Since we can't mock the hooks directly in Storybook, we'll create a test wrapper
    // that mimics the component's behavior for testing purposes
    const [processingAction, setProcessingAction] = useState<'accept' | 'decline' | 'close' | null>(null);
    const [showBanner, setShowBanner] = useState(shouldShowBanner);

    if (!showBanner) {
        return null;
    }

    const handleConsent = async (consent: TrackingConsent, actionType: 'accept' | 'decline' | 'close') => {
        if (processingAction !== null || !isTrackingConsentEnabled) return;

        setProcessingAction(actionType);

        try {
            await setTrackingConsent(consent);
            if (onConsentChange) {
                await onConsentChange(consent);
            }
            // Simulate banner hiding after consent
            setTimeout(() => setShowBanner(false), 100);
        } catch {
            // Handle error
        } finally {
            setProcessingAction(null);
        }
    };

    const handleClose = () => {
        void handleConsent(defaultTrackingConsent, 'close');
    };

    const handleAccept = () => {
        void handleConsent(TrackingConsent.Accepted, 'accept');
    };

    const handleDecline = () => {
        void handleConsent(TrackingConsent.Declined, 'decline');
    };

    const isProcessing = processingAction !== null;

    const positionClasses = {
        'bottom-left': 'left-0 md:left-4 bottom-0 md:bottom-4',
        'bottom-right': 'right-0 md:right-4 bottom-0 md:bottom-4',
        'bottom-center': 'left-0 md:left-1/2 md:-translate-x-1/2 bottom-0 md:bottom-4',
    };

    const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

    return (
        <div
            className={cn(
                'fixed z-50 w-full md:max-w-md animate-in slide-in-from-bottom-5 duration-300',
                positionClasses[configPosition] || positionClasses['bottom-center']
            )}
            role="dialog"
            aria-labelledby="tracking-consent-banner-title"
            aria-describedby="tracking-consent-banner-description">
            <div className="relative shadow-lg border rounded-lg bg-card text-card-foreground">
                <button
                    className="absolute right-4 top-4 h-8 w-8 shrink-0 opacity-70 transition-opacity hover:opacity-100 inline-flex items-center justify-center rounded-md"
                    onClick={handleClose}
                    disabled={isProcessing}
                    aria-label={mockT('closeAriaLabel')}>
                    {processingAction === 'close' ? (
                        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                        <svg
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    )}
                    <span className="sr-only">{mockT('closeAriaLabel')}</span>
                </button>
                <div className="p-6 pt-6 pr-10">
                    <div className="space-y-2">
                        <h2 id="tracking-consent-banner-title" className="text-lg font-semibold">
                            {mockT('title')}
                        </h2>
                        <p id="tracking-consent-banner-description" className="text-sm text-muted-foreground">
                            {mockT('description')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 p-6 pt-0">
                    <button
                        className="flex-1 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                        onClick={handleDecline}
                        disabled={isProcessing}>
                        {processingAction === 'decline' && (
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        )}
                        {mockT('decline')}
                    </button>
                    <button
                        className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                        onClick={handleAccept}
                        disabled={isProcessing}>
                        {processingAction === 'accept' && (
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        )}
                        {mockT('accept')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const meta: Meta<typeof MockedTrackingConsentBanner> = {
    title: 'Tracking Consent Banner',
    component: MockedTrackingConsentBanner,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
# Tracking Consent Banner Component

A non-intrusive banner that collects user consent for tracking cookies and analytics.

**Keywords:** tracking-consent, DNT, do-not-track, cookie-banner, cookie-consent, privacy, GDPR, analytics-consent

## Features

The banner:
- Only shows if tracking consent is enabled in config and user hasn't responded
- Refreshes SLAS token with tracking consent value (server sets dw_dnt cookie)
- Supports custom onConsentChange callback for external analytics integration
- Can be positioned at bottom-left, bottom-right, or bottom-center
- Shows loading spinners during async operations
- Includes a close button (X) that applies default consent
- Dismisses immediately upon interaction for minimal user disruption

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly

## Responsive Design

- Mobile and desktop optimized
- Smooth animations
- Loading states for all actions
                `,
            },
        },
    },
    tags: ['autodocs', 'interaction', 'tracking-consent', 'engagement', 'dnt', 'do-not-track'],
    argTypes: {
        onConsentChange: {
            description: 'Optional callback called after user responds to consent banner',
            table: { disable: true },
        },
    },
    decorators: [
        (Story) => {
            return (
                <div style={{ minHeight: '100vh', position: 'relative', padding: '2rem' }}>
                    <div>
                        <h1>Sample Page Content</h1>
                        <p>This is sample content to demonstrate the banner positioning.</p>
                    </div>
                    <Story />
                </div>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof MockedTrackingConsentBanner>;

/**
 * Default story showing the banner when it should be displayed
 */
export const Default: Story = {
    args: {
        shouldShowBanner: true,
        isTrackingConsentEnabled: true,
        defaultTrackingConsent: TrackingConsent.Declined,
        setTrackingConsent: async () => {},
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check banner dialog is present
        const banner = await canvas.findByRole('dialog', {}, { timeout: 3000 });
        await expect(banner).toBeInTheDocument();

        // Check title
        const title = canvas.getByText('Cookie Preferences');
        await expect(title).toBeInTheDocument();

        // Check description
        const description = canvas.getByText(/We use cookies to improve your experience/i);
        await expect(description).toBeInTheDocument();

        // Check buttons
        const acceptButton = canvas.getByRole('button', { name: 'Accept' });
        const declineButton = canvas.getByRole('button', { name: 'Decline' });
        const closeButton = canvas.getByRole('button', { name: /close banner/i });

        await expect(acceptButton).toBeInTheDocument();
        await expect(declineButton).toBeInTheDocument();
        await expect(closeButton).toBeInTheDocument();

        await expect(acceptButton).not.toBeDisabled();
        await expect(declineButton).not.toBeDisabled();
        await expect(closeButton).not.toBeDisabled();
    },
};

/**
 * Interactive story demonstrating user interactions with the banner.
 * Users can accept, decline, or close (applies default) the banner.
 * The banner dismisses immediately for minimal user disruption.
 */
export const Interaction: Story = {
    args: {
        shouldShowBanner: true,
        isTrackingConsentEnabled: true,
        defaultTrackingConsent: TrackingConsent.Declined,
        setTrackingConsent: async () => {},
        onConsentChange: action('consent-changed'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates user interactions with the banner buttons (Accept, Decline, Close). The banner dismisses immediately upon interaction for minimal user disruption.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify all interactive elements are present
        const acceptButton = await canvas.findByRole('button', { name: 'Accept' }, { timeout: 3000 });
        const declineButton = canvas.getByRole('button', { name: 'Decline' });
        const closeButton = canvas.getByRole('button', { name: /close banner/i });

        await expect(acceptButton).toBeInTheDocument();
        await expect(declineButton).toBeInTheDocument();
        await expect(closeButton).toBeInTheDocument();

        // Click accept button to demonstrate interaction
        // Banner dismisses immediately (by design - least intrusive)
        await userEvent.click(acceptButton);
    },
};

/**
 * Banner positioned at bottom-left
 */
export const PositionBottomLeft: Story = {
    args: {
        shouldShowBanner: true,
        isTrackingConsentEnabled: true,
        defaultTrackingConsent: TrackingConsent.Declined,
        setTrackingConsent: async () => {},
        configPosition: 'bottom-left',
    },
    parameters: {
        docs: {
            description: {
                story: 'Banner positioned at the bottom-left corner of the screen.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const banner = await canvas.findByRole('dialog', {}, { timeout: 3000 });
        await expect(banner).toBeInTheDocument();
    },
};

/**
 * Banner positioned at bottom-right
 */
export const PositionBottomRight: Story = {
    args: {
        shouldShowBanner: true,
        isTrackingConsentEnabled: true,
        defaultTrackingConsent: TrackingConsent.Declined,
        setTrackingConsent: async () => {},
        configPosition: 'bottom-right',
    },
    parameters: {
        docs: {
            description: {
                story: 'Banner positioned at the bottom-right corner of the screen.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const banner = await canvas.findByRole('dialog', {}, { timeout: 3000 });
        await expect(banner).toBeInTheDocument();
    },
};

/**
 * Banner with custom consent callback
 */
export const WithCustomCallback: Story = {
    args: {
        shouldShowBanner: true,
        isTrackingConsentEnabled: true,
        defaultTrackingConsent: TrackingConsent.Declined,
        setTrackingConsent: async () => {},
        onConsentChange: (consent) => {
            action('custom-analytics-integration')({ consent, timestamp: new Date().toISOString() });
        },
    },
    parameters: {
        chromatic: { disableSnapshot: true },
        docs: {
            description: {
                story: 'Demonstrates using the onConsentChange callback for custom analytics integration.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const banner = await canvas.findByRole('dialog', {}, { timeout: 3000 });
        await expect(banner).toBeInTheDocument();

        // User can interact with accept or decline
        const acceptButton = canvas.getByRole('button', { name: 'Accept' });
        await expect(acceptButton).toBeInTheDocument();
    },
};
