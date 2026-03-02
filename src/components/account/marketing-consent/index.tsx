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
/**
 * Marketing consent (subscriptions) – loader and action wiring
 *
 * - GET (subscriptions): loader in routes/_app.account.tsx calls getSubscriptions(context) and passes
 *   subscriptions via Outlet context. Component receives them as a prop; it does not fetch.
 * - POST (update subscription): routes/action.update-marketing-consent.ts; hook use-update-marketing-consent
 *   submits to /action/update-marketing-consent; on success parent revalidates to refresh subscriptions.
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperConsents } from '@salesforce/storefront-next-runtime/scapi';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/toast';
import { useUpdateMarketingConsent } from '@/hooks/use-update-marketing-consent';

type ConsentSubscription = ShopperConsents.schemas['ConsentSubscription'];

/** Channel type from Shopper Consents API. */
type ConsentChannel = 'email' | 'sms' | 'whatsapp';

export type MarketingConsentSubscriptions = ShopperConsents.schemas['ConsentSubscriptionResponse'] | null;

export type ContactPointValueByChannel = Partial<Record<ConsentChannel, string>>;

export interface MarketingConsentProps {
    subscriptions?: MarketingConsentSubscriptions | null;
    contactPointValueByChannel?: ContactPointValueByChannel | null;
    onConsentUpdated?: () => void;
}

function channelLabel(channelId: string): string {
    return channelId.charAt(0).toUpperCase() + channelId.slice(1).toLowerCase();
}

/** Status for a subscription on a channel: from consentStatus entry for that channel, or defaultStatus. */
function getStatusForChannel(sub: ConsentSubscription, channelId: string): 'opt_in' | 'opt_out' {
    const entry = sub.consentStatus?.find((e) => e.channel === channelId);
    return entry?.status ?? sub.defaultStatus ?? 'opt_out';
}

/** User's contact point for a channel (from account). Sent as contactPointValue in the update POST. */
function getContactPointForChannel(
    channelId: ConsentChannel,
    contactPointValueByChannel?: ContactPointValueByChannel | null
): string | undefined {
    return contactPointValueByChannel?.[channelId];
}

/** Section grouping subscriptions by channel (channelId is from API sub.channels). */
type ChannelSection = {
    channelId: ConsentChannel;
    channelLabel: string;
    items: ConsentSubscription[];
};

/** Group subscriptions by channel; each subscription appears under every channel in its channels array. Order follows API (first-seen channel order). */
function groupByChannel(subscriptions: ConsentSubscription[]): ChannelSection[] {
    const byChannel = new Map<ConsentChannel, ConsentSubscription[]>();
    for (const sub of subscriptions) {
        for (const channelId of sub.channels ?? []) {
            const list = byChannel.get(channelId) ?? [];
            list.push(sub);
            byChannel.set(channelId, list);
        }
    }
    return Array.from(byChannel, ([channelId, items]) => ({
        channelId,
        channelLabel: channelLabel(channelId),
        items,
    }));
}

export function MarketingConsent({
    subscriptions: subscriptionsProp,
    contactPointValueByChannel,
    onConsentUpdated,
}: MarketingConsentProps): ReactElement | null {
    const { t } = useTranslation('account');
    const { addToast } = useToast();

    const onUpdateSuccess = useCallback(() => {
        onConsentUpdated?.();
    }, [onConsentUpdated]);

    const subscriptions = subscriptionsProp ?? null;

    /** Optimistic checked state per subscription+channel. Cleared when subscriptions update (revalidation) or on error. */
    const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setOptimisticOverrides({});
    }, [subscriptions]);

    const clearOptimisticOverrides = useCallback(() => {
        setOptimisticOverrides({});
    }, []);

    const onUpdateError = useCallback(() => {
        addToast(t('marketingConsent.updateError'), 'error');
        clearOptimisticOverrides();
    }, [addToast, clearOptimisticOverrides, t]);

    const { updateSubscription, isUpdating } = useUpdateMarketingConsent(onUpdateSuccess, onUpdateError);

    const channelSections = useMemo(() => groupByChannel(subscriptions?.data ?? []), [subscriptions]);

    const statusToLabel = (status: 'opt_in' | 'opt_out'): string =>
        status === 'opt_in' ? t('marketingConsent.optedIn') : t('marketingConsent.optedOut');

    const handleSwitchChange = useCallback(
        (sub: ConsentSubscription, channelId: ConsentChannel, newChecked: boolean) => {
            const contactPointValue = getContactPointForChannel(channelId, contactPointValueByChannel);
            if (!contactPointValue) return;
            const key = `${sub.subscriptionId}-${channelId}`;
            setOptimisticOverrides((prev) => ({ ...prev, [key]: newChecked }));
            updateSubscription({
                subscriptionId: sub.subscriptionId,
                channel: channelId,
                contactPointValue,
                status: newChecked ? 'opt_in' : 'opt_out',
            });
        },
        [contactPointValueByChannel, updateSubscription]
    );

    const hasSubscriptionData = Array.isArray(subscriptions?.data) && (subscriptions?.data?.length ?? 0) > 0;
    if (!hasSubscriptionData) {
        return null;
    }

    const renderContent = (): ReactElement => {
        return (
            <div className="space-y-4">
                {channelSections.map((section, sectionIndex) => (
                    <section
                        key={section.channelId}
                        className={sectionIndex > 0 ? 'border-t border-muted-foreground/10 pt-4' : ''}
                        aria-labelledby={`marketing-consent-channel-${section.channelId}`}>
                        <h2
                            id={`marketing-consent-channel-${section.channelId}`}
                            className="text-sm font-semibold text-foreground mb-2">
                            {section.channelLabel}
                        </h2>
                        <ul className="space-y-2 pl-4" role="list">
                            {section.items.map((sub) => {
                                const status = getStatusForChannel(sub, section.channelId);
                                const serverChecked = status === 'opt_in';
                                const overrideKey = `${sub.subscriptionId}-${section.channelId}`;
                                const checked =
                                    optimisticOverrides[overrideKey] !== undefined
                                        ? optimisticOverrides[overrideKey]
                                        : serverChecked;
                                const title = sub.title ?? sub.subscriptionId;
                                const contactPointValue = getContactPointForChannel(
                                    section.channelId,
                                    contactPointValueByChannel
                                );
                                const canUpdate = Boolean(contactPointValue);
                                return (
                                    <li
                                        key={`${section.channelId}-${sub.subscriptionId}`}
                                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-1">
                                        <div className="space-y-1 min-w-0">
                                            {sub.title != null && sub.title !== '' && (
                                                <p className="text-sm font-medium text-foreground">{sub.title}</p>
                                            )}
                                            {sub.subtitle != null && sub.subtitle !== '' && (
                                                <p className="text-sm text-muted-foreground">{sub.subtitle}</p>
                                            )}
                                        </div>
                                        <Switch
                                            checked={checked}
                                            disabled={!canUpdate || isUpdating}
                                            aria-label={`${title}: ${
                                                checked ? statusToLabel('opt_in') : statusToLabel('opt_out')
                                            }`}
                                            onCheckedChange={(value) =>
                                                handleSwitchChange(sub, section.channelId, value === true)
                                            }
                                            className="shrink-0 sm:ml-4"
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
                <p className="text-sm text-muted-foreground pt-4 border-t border-muted-foreground/10">
                    {t('marketingConsent.disclaimer')}
                </p>
            </div>
        );
    };

    return (
        <Card data-section="marketing-consent">
            <CardHeader className="border-b border-muted-foreground/20 pb-4">
                <CardTitle>{t('marketingConsent.title')}</CardTitle>
                <CardAction>
                    <Button variant="outline" size="sm" type="button" aria-label={t('marketingConsent.editA11y')}>
                        {t('marketingConsent.edit')}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="pt-6">{renderContent()}</CardContent>
        </Card>
    );
}

export default MarketingConsent;
