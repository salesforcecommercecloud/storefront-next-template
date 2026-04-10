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

import { useLayoutEffect, type ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { TurnstileWidget } from '../turnstile-widget';

type TurnstileRenderOptions = {
    sitekey: string;
    callback?: (token: string) => void;
    'error-callback'?: () => void;
    'expired-callback'?: () => void;
    appearance?: string;
    theme?: string;
    size?: string;
};

type TurnstileApi = {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
};

function installTurnstileMock() {
    const w = window as Window & { turnstile?: TurnstileApi };
    const previous = w.turnstile;
    const existingScript = document.getElementById('turnstile-script');
    if (existingScript) {
        existingScript.remove();
    }
    w.turnstile = {
        render(_container, options) {
            queueMicrotask(() => {
                options.callback?.('mock-turnstile-token');
            });
            return 'mock-widget-id';
        },
        remove() {},
    };
    return () => {
        w.turnstile = previous;
        document.getElementById('turnstile-script')?.remove();
    };
}

function withTurnstileMock(Story: ComponentType) {
    function Decorated() {
        useLayoutEffect(() => {
            return installTurnstileMock();
        }, []);
        return <Story />;
    }
    return Decorated;
}

const meta: Meta<typeof TurnstileWidget> = {
    title: 'SECURITY/TurnstileWidget',
    component: TurnstileWidget,
    decorators: [withTurnstileMock],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Cloudflare Turnstile widget placeholder. Stories mock `window.turnstile` so the real script is not loaded.',
            },
        },
    },
    // Third-party widget host node uses role="presentation" in production; axe flags the placeholder.
    tags: ['autodocs', 'skip-a11y'],
};

export default meta;
type Story = StoryObj<typeof TurnstileWidget>;

export const Default: Story = {
    args: {
        siteKey: '1x0000000000000000000000000000000AA',
        onSuccess: action('onSuccess'),
        onError: action('onError'),
        onExpire: action('onExpire'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const root = canvasElement.querySelector('[data-testid="turnstile-widget"]');
        await expect(root).toBeInTheDocument();
    },
};

export const VisibleMode: Story = {
    args: {
        ...Default.args,
        mode: 'visible',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement.querySelector('[data-testid="turnstile-widget"]')).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: {
        ...Default.args,
        enabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        await expect(canvasElement.querySelector('[data-testid="turnstile-widget"]')).not.toBeInTheDocument();
    },
};
