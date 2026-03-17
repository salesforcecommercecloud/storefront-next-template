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
 * Subscription item from the consent API.
 * Mock data only – replace with API types when integrating.
 */
export interface MarketingConsentSubscription {
    subscriptionId: string;
    channels: string[];
    title: string;
    subtitle: string;
    consentType: string;
    consentRequired: boolean;
    defaultStatus: 'opt_in' | 'opt_out';
    tags: string[];
}

/**
 * Marketing consent API response shape.
 * Mock data only – replace with API data when integrating.
 */
export interface MarketingConsentMockData {
    data: MarketingConsentSubscription[];
}

/**
 * Mock marketing consent data for UI development.
 * Keep this file for mock data only; do not add business logic here.
 */
export const mockMarketingConsentData: MarketingConsentMockData = {
    data: [
        {
            subscriptionId: 'weekly-newsletter',
            channels: ['email', 'whatsapp'],
            title: 'Weekly Newsletter',
            subtitle: 'Get our weekly newsletter with the latest updates.',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: ['homepage_banner', 'user_profile'],
        },
        {
            subscriptionId: 'promotional-offers',
            channels: ['sms'],
            title: 'Promotional Offers',
            subtitle: 'Receive special promotional offers.',
            consentType: 'marketing',
            consentRequired: false,
            defaultStatus: 'opt_out',
            tags: ['checkout'],
        },
    ],
};
