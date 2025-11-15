/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { type ReactElement, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import uiStrings from '@/temp-ui-string';
import { useToast } from '@/components/toast';
import { useConfig } from '@/config';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Link as LinkIcon, Mail, MessageSquare, Copy, type LucideIcon } from 'lucide-react';

interface ShareButtonProps {
    product: ShopperProducts.schemas['Product'];
    className?: string;
}

type ShareProvider = 'Twitter' | 'Facebook' | 'LinkedIn' | 'Email';

// Provider icon mapping (constant, defined outside component)
const providerIcons: Record<ShareProvider, LucideIcon> = {
    Twitter: MessageSquare,
    Facebook: LinkIcon,
    LinkedIn: LinkIcon,
    Email: Mail,
};

// Provider label mapping (constant, defined outside component)
const providerLabels: Record<ShareProvider, string> = {
    Twitter: 'Twitter/X',
    Facebook: 'Facebook',
    LinkedIn: 'LinkedIn',
    Email: 'Email',
};

/**
 * Share button that provides a custom dropdown menu with share options.
 * Share options are configurable via site.features.socialShare config.
 *
 * @param props - Component props
 * @param props.product - The product data to share
 * @param props.className - Optional additional CSS classes
 * @returns JSX element with share button and dropdown menu
 */
export function ShareButton({ product, className }: ShareButtonProps): ReactElement {
    const { addToast } = useToast();
    const { site } = useConfig();

    const productName = product.name || 'Check out this product';
    const productDescription = product.shortDescription || 'I found this great product';
    // Safely access window.location.href - only on client side
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(productName);
    const encodedText = encodeURIComponent(`${productName}\n\n${productDescription}`);

    const handleNativeShare = async () => {
        if (!navigator.share) {
            addToast('Native sharing is not available on this device', 'error');
            return;
        }

        try {
            const shareMessage = `${productName}\n\n${productDescription}\n\n${shareUrl}`;
            await navigator.share({
                title: productName,
                text: shareMessage,
                url: shareUrl,
            });
        } catch (error) {
            // User cancelled - silently fail
            if (error instanceof Error && error.name !== 'AbortError') {
                addToast('Failed to share', 'error');
            }
        }
    };

    const handleCopyLink = async () => {
        try {
            // Only copy the URL, not the full share text
            await navigator.clipboard.writeText(shareUrl);
            addToast('Link copied to clipboard', 'success');
        } catch {
            addToast('Failed to copy link', 'error');
        }
    };

    // Share provider handlers
    const shareHandlers = useMemo(
        () => ({
            Email: () => {
                const subject = encodedTitle;
                const body = `${encodedText}%0A%0A${encodedUrl}`;
                window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
            },
            Twitter: () => {
                const text = `${productName} - ${shareUrl}`;
                window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`,
                    '_blank'
                );
            },
            Facebook: () => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
            },
            LinkedIn: () => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
            },
        }),
        [productName, shareUrl, encodedUrl, encodedTitle, encodedText]
    );

    // Build share provider configurations
    const shareProviders = useMemo(() => {
        const enabledProviders = site.features.socialShare.enabled ? site.features.socialShare.providers : [];

        return enabledProviders
            .filter((provider): provider is ShareProvider => {
                return ['Twitter', 'Facebook', 'LinkedIn', 'Email'].includes(provider);
            })
            .map((provider) => ({
                provider,
                icon: providerIcons[provider],
                label: providerLabels[provider],
                handler: shareHandlers[provider],
            }));
    }, [site.features.socialShare.enabled, site.features.socialShare.providers, shareHandlers]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="lg"
                    className={className}
                    aria-label={uiStrings.product.share || 'Share product'}>
                    {uiStrings.product.share || 'Share'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function' && (
                    <>
                        <DropdownMenuItem onClick={() => void handleNativeShare()}>
                            <Share2 className="mr-2 size-4" />
                            <span>Share via...</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem onClick={() => void handleCopyLink()}>
                    <Copy className="mr-2 size-4" />
                    <span>Copy link</span>
                </DropdownMenuItem>
                {shareProviders.length > 0 && (
                    <>
                        {shareProviders.some((p) => p.provider === 'Email') && (
                            <>
                                <DropdownMenuSeparator />
                                {shareProviders
                                    .filter((p) => p.provider === 'Email')
                                    .map(({ provider, icon: Icon, label, handler }) => (
                                        <DropdownMenuItem key={provider} onClick={handler}>
                                            <Icon className="mr-2 size-4" />
                                            <span>{label}</span>
                                        </DropdownMenuItem>
                                    ))}
                            </>
                        )}
                        {shareProviders.some((p) => p.provider !== 'Email') && (
                            <>
                                <DropdownMenuSeparator />
                                {shareProviders
                                    .filter((p) => p.provider !== 'Email')
                                    .map(({ provider, icon: Icon, label, handler }) => (
                                        <DropdownMenuItem key={provider} onClick={handler}>
                                            <Icon className="mr-2 size-4" />
                                            <span>{label}</span>
                                        </DropdownMenuItem>
                                    ))}
                            </>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
