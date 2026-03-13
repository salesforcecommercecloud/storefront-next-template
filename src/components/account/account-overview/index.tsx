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
import { type ReactElement, Suspense, useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProductRecommendations from '@/components/product-recommendations';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';
import { User, Heart, Receipt, MapPin, ChevronRight } from 'lucide-react';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';

type Customer = ShopperCustomers.schemas['Customer'];

/**
 * Quick link item data for the Quick Links section
 */
interface QuickLinkItem {
    path: string;
    icon: React.ElementType;
    label: string;
    description: string;
}

/**
 * Props for the AccountOverview component
 */
export interface AccountOverviewProps {
    /** Customer data for personalization */
    customer?: Customer | null;
}

/**
 * Welcome section that displays the personalized greeting
 */
export function WelcomeSection({ customer }: { customer?: Customer | null }): ReactElement {
    const { t } = useTranslation('account');
    const firstName = customer?.firstName || t('overview.defaultName');

    return (
        <Card className="bg-card border-border">
            <CardContent className="px-6 py-3">
                <h1 className="text-[length:var(--account-section-header)] font-semibold text-foreground mb-1">
                    {t('overview.welcomeBack', { name: firstName })}
                </h1>
                <p className="text-sm text-muted-foreground">{t('overview.welcomeSubtitle')}</p>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the welcome section while loading
 */
export function WelcomeSectionSkeleton(): ReactElement {
    return (
        <Card className="bg-card border-border">
            <CardContent className="px-6 py-3">
                <Skeleton className="h-6 w-64 mb-1" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </CardContent>
        </Card>
    );
}

/**
 * Quick Links section with navigation cards
 */
export function QuickLinksSection(): ReactElement {
    const { t } = useTranslation('account');

    const quickLinks: QuickLinkItem[] = [
        {
            path: '/account',
            icon: User,
            label: t('navigation.accountDetails'),
            description: t('overview.quickLinks.accountDetailsDesc'),
        },
        {
            path: '/account/orders',
            icon: Receipt,
            label: t('navigation.orderHistory'),
            description: t('overview.quickLinks.orderHistoryDesc'),
        },
        {
            path: '/account/wishlist',
            icon: Heart,
            label: t('navigation.wishlist'),
            description: t('overview.quickLinks.wishlistDesc'),
        },
        {
            path: '/account/addresses',
            icon: MapPin,
            label: t('navigation.addresses'),
            description: t('overview.quickLinks.addressesDesc'),
        },
    ];

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-[length:var(--account-section-header)] font-semibold text-foreground mb-4">
                    {t('overview.quickLinks.title')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link key={link.path} to={link.path} className="group">
                                <div className="h-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                            {link.label}
                                        </h3>
                                        <p className="text-sm text-muted-foreground truncate">{link.description}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the Quick Links section
 */
export function QuickLinksSectionSkeleton(): ReactElement {
    return (
        <Card>
            <CardContent className="p-6">
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-full flex items-center gap-4 p-4 rounded-xl border">
                            <Skeleton className="w-12 h-12 rounded-lg" />
                            <div className="flex-1">
                                <Skeleton className="h-5 w-24 mb-1" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Curated for You section with product recommendations
 * Uses Einstein recommendations to display personalized product suggestions
 */
export function CuratedForYouSection(): ReactElement {
    const { t } = useTranslation('account');

    const curatedRecommender = useMemo(
        () => ({
            name: EINSTEIN_RECOMMENDERS.EMPTY_SEARCH_RESULTS_MOST_VIEWED,
            title: t('overview.curatedForYou.title'),
        }),
        [t]
    );

    return (
        <Card>
            <CardContent className="p-6">
                <Suspense fallback={<ProductRecommendationSkeleton title={t('overview.curatedForYou.title')} />}>
                    <ProductRecommendations
                        recommender={curatedRecommender}
                        titleClassName="text-[length:var(--account-section-header)] font-semibold text-foreground tracking-tight"
                    />
                </Suspense>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the Curated for You section
 */
export function CuratedForYouSectionSkeleton(): ReactElement {
    return (
        <Card>
            <CardContent className="p-6">
                <ProductRecommendationSkeleton />
            </CardContent>
        </Card>
    );
}

/**
 * Account Overview Dashboard component
 *
 * This dashboard displays:
 * - Welcome back greeting with customer name
 * - Curated product recommendations (using Einstein)
 * - Quick Links to key account sections
 */
export function AccountOverview({ customer }: AccountOverviewProps): ReactElement {
    return (
        <div className="space-y-5">
            <WelcomeSection customer={customer} />
            <CuratedForYouSection />
            <QuickLinksSection />
        </div>
    );
}

/**
 * Account overview skeleton for loading state
 */
export function AccountOverviewSkeleton(): ReactElement {
    return (
        <div className="space-y-5">
            <WelcomeSectionSkeleton />
            <CuratedForYouSectionSkeleton />
            <QuickLinksSectionSkeleton />
        </div>
    );
}

export default AccountOverview;
