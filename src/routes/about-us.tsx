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
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import ContentCard from '@/components/content-card';
import Contact from '@/components/contact';
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';

/**
 * About Us page component that displays company information
 *
 * This component renders:
 * - Breadcrumb navigation
 * - Content card with about us information
 *
 * Header and Footer are automatically included from the root layout.
 * @returns JSX element representing the About Us page
 */
export default function AboutUs(): ReactElement {
    const { t } = useTranslation('aboutUs');

    return (
        <div className="pb-8">
            <div className="max-w-screen-2xl mx-auto px-4 pb-6">
                {/* Breadcrumb */}
                <Breadcrumb className="mb-2.5">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/">{t('breadcrumb.home', { defaultValue: 'Home' })}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t('breadcrumb.aboutUs', { defaultValue: 'About Us' })}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Page Title */}
                <Typography variant="h2">{t('title', { defaultValue: 'About Us' })}</Typography>
            </div>

            {/* About Us Sections: Our Goal, Our Vision, Our Value */}
            <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
                <ContentCard
                    title={t('section.ourGoal.title')}
                    description={t('section.ourGoal.content')}
                    className="max-w-4xl"
                />
                <ContentCard
                    title={t('section.ourVision.title')}
                    description={t('section.ourVision.content')}
                    className="max-w-4xl"
                />
                <ContentCard
                    title={t('section.ourValue.title')}
                    description={t('section.ourValue.content')}
                    className="max-w-4xl"
                />
            </div>

            <div className="md:px-8 px-4 py-12 bg-secondary">
                <div className="max-w-screen-2xl mx-auto">
                    <Contact />
                </div>
            </div>

            {/* About Us Sections: Our Mission, Our Team */}
            <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
                <ContentCard
                    title={t('section.ourMission.title')}
                    description={t('section.ourMission.content')}
                    className="max-w-4xl"
                />
                <ContentCard
                    title={t('section.ourTeam.title')}
                    description={t('section.ourTeam.content')}
                    className="max-w-4xl"
                />
            </div>
        </div>
    );
}
