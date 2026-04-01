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
import { Link } from '@/components/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProductRecommendations from '@/components/product-recommendations';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';
import { User, CreditCard, Receipt, MapPin } from 'lucide-react';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';
import { AppDownloadSection } from '@/components/account/app-download-section';
import { AccountHelp } from '@/components/account/account-help';

type Customer = ShopperCustomers.schemas['Customer'];

/**
 * Quick link item data for the Quick Links section
 */
interface QuickLinkItem {
    path: string;
    icon: React.ElementType;
    label: string;
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
        <Card className="py-0">
            <CardContent className="p-6">
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
        <Card className="py-0">
            <CardContent className="p-6">
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
        },
        {
            path: '/account/addresses',
            icon: MapPin,
            label: t('navigation.manageAddresses'),
        },
        {
            path: '/account/payment-methods',
            icon: CreditCard,
            label: t('navigation.paymentMethods'),
        },
        {
            path: '/account/orders',
            icon: Receipt,
            label: t('navigation.orderHistory'),
        },
    ];

    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <h2 className="text-[length:var(--account-section-header)] font-semibold text-foreground mb-4">
                    {t('overview.quickLinks.title')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link key={link.path} to={link.path} className="group">
                                <div className="h-full flex flex-col items-center justify-center gap-3 p-6 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                                    <Icon className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                                    <h3 className="text-sm font-medium text-foreground text-center leading-5 group-hover:text-primary transition-colors">
                                        {link.label}
                                    </h3>
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
        <Card className="py-0">
            <CardContent className="p-6">
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-full flex flex-col items-center justify-center gap-3 p-6 rounded-lg border">
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-5 w-24" />
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
        <Card className="py-0">
            <CardContent className="p-6">
                <Suspense
                    fallback={
                        <ProductRecommendationSkeleton
                            title={t('overview.curatedForYou.title')}
                            className="max-w-none -mx-6 md:py-0"
                        />
                    }>
                    <ProductRecommendations
                        recommender={curatedRecommender}
                        titleClassName="text-[length:var(--account-section-header)] font-semibold text-foreground tracking-tight"
                        subtitle={t('overview.curatedForYou.subtitle')}
                        className="max-w-none -mx-6 md:py-0"
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
        <Card className="py-0">
            <CardContent className="p-6">
                <ProductRecommendationSkeleton className="max-w-none -mx-6 md:py-0" />
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
            <AccountHelp />
            <AppDownloadSection />
            <QuickLinksSection />
        </div>
    );
}

/**
 * Skeleton for the App Download section
 */
export function AppDownloadSectionSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-4 w-full max-w-xl mb-6" />
                        <div className="flex flex-wrap gap-3">
                            <Skeleton className="h-12 w-32" />
                            <Skeleton className="h-12 w-36" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 lg:flex-shrink-0">
                        <Skeleton className="w-40 h-40 rounded-lg" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the Account Help section
 */
export function AccountHelpSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-full max-w-xl mb-4" />
                <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
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
            <AccountHelpSkeleton />
            <AppDownloadSectionSkeleton />
            <QuickLinksSectionSkeleton />
        </div>
    );
}

export default AccountOverview;
