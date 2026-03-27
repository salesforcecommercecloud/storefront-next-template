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
import type { LoaderFunctionArgs } from 'react-router';
import { Link } from '@/components/link';
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
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { PageType } from '@/lib/decorators/page-type';
import { useTranslation } from 'react-i18next';
import visionImage from '/images/hero-02.webp';

@PageType({
    name: 'About Us Page',
    description: 'About Us page containing company information and a contact form.',
    supportedAspectTypes: [],
})
export class AboutUsPageMetadata {}

type AboutUsPageData = {
    pageUrl: string;
    ogImageUrl: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export function loader({ request }: LoaderFunctionArgs): AboutUsPageData {
    const requestUrl = new URL(request.url);
    return {
        pageUrl: buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search),
        ogImageUrl: new URL(visionImage, requestUrl.origin).href,
    };
}

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
export default function AboutUs({ loaderData }: { loaderData: AboutUsPageData }): ReactElement {
    const { t } = useTranslation('aboutUs');

    return (
        <div className="pb-8">
            <SeoMeta
                title={t('title', { defaultValue: 'About Us' })}
                description={t('meta.description', {
                    defaultValue: 'Learn more about our story, mission, and the team behind the store.',
                })}
                openGraph={{ type: 'article', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
            />
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
                    className="full-width"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ContentCard
                        title={t('section.ourVision.title')}
                        description={t('section.ourVision.content')}
                        imageUrl={visionImage}
                        imageAlt={t('section.ourVision.imageAlt', { defaultValue: 'Our vision' })}
                    />
                    <ContentCard
                        title={t('section.ourValue.title')}
                        description={t('section.ourValue.content')}
                        imageUrl={visionImage}
                        imageAlt={t('section.ourValue.imageAlt', { defaultValue: 'Our values' })}
                    />
                </div>
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
                    buttonText={t('section.ourMission.cta', { defaultValue: 'Explore' })}
                    buttonLink="/"
                    className="full-width"
                    cardFooterClassName="flex-col md:flex-row items-center"
                    buttonClassName="w-fit"
                />
                <ContentCard
                    title={t('section.ourTeam.title')}
                    description={t('section.ourTeam.content')}
                    imageUrl={visionImage}
                    imageAlt={t('section.ourTeam.imageAlt', { defaultValue: 'Our team' })}
                    buttonText={t('section.ourTeam.cta', { defaultValue: 'Explore' })}
                    buttonLink="/"
                    className="full-width md:flex-row"
                    cardFooterClassName="justify-center flex-auto"
                    cardDescriptionClassName="flex-none"
                    buttonClassName="w-fit"
                />
            </div>
        </div>
    );
}
