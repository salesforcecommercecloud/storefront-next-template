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
import { type ReactElement } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@/components/link';
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import Signup from './signup';
import { useTranslation } from 'react-i18next';
import LocaleSwitcher from '@/components/locale-switcher';
import CurrencySwitcher from '@/components/currency-switcher';
import logo from '/images/logo.svg';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { stripPathPrefix } from '@salesforce/storefront-next-runtime/site-context';
import type { AppConfig } from '@/types/config';

interface FooterProps {
    variant?: 'full' | 'checkout';
}

export default function Footer({ variant = 'full' }: FooterProps): ReactElement {
    const { t } = useTranslation('footer');
    const location = useLocation();
    const config = useConfig<AppConfig>();

    // Check if we're on the homepage by stripping the site context prefix pattern
    // stripPathPrefix works directly with URL patterns - no need to resolve them first
    const pathWithoutPrefix = stripPathPrefix(location.pathname, config.url?.prefix || '');

    // Homepage is when the path (after removing prefix) is empty or just "/"
    const isHomepage = pathWithoutPrefix === '/';

    if (variant === 'checkout') {
        return (
            <footer className="mt-auto border-t border-border">
                <div className="section-container py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
                        <div>
                            © {t('logoAlt')} {t('address')}
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/privacy" className="hover:text-foreground transition-colors">
                                {t('links.privacyPolicy')}
                            </Link>
                            <Link to="/terms" className="hover:text-foreground transition-colors">
                                {t('links.termsOfUse')}
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="mt-auto">
            {/* Prominent Newsletter Section (Black Background) - Homepage Only */}
            {isHomepage && (
                <div className="section-container">
                    <div className="bg-primary text-primary-foreground py-12 md:py-16">
                        <div className="max-w-2xl mx-auto text-center">
                            <h2 className="text-2xl font-semibold leading-[120%] tracking-[-0.6px] text-primary-foreground mb-3">
                                {t('newsletter.title')}
                            </h2>
                            <p className="text-sm font-normal leading-5 text-primary-foreground mb-6">
                                {t('newsletter.description')}
                            </p>
                            <div className="flex justify-center">
                                <Signup />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Links Section (Light Background) */}
            <div className="bg-footer-background py-12 section-container">
                <div className="text-footer-foreground">
                    {/* Footer Bottom */}
                    <div>
                        <div className="flex flex-col gap-6">
                            {/* Top Row: Logo + Policy Links on Left, Social Media on Right */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                {/* Left: Logo + Policy Links */}
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Link to="/">
                                            <img src={logo} alt={t('logoAlt')} className="h-4 w-auto" />
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-normal leading-5 text-muted-foreground">
                                        <Link to="/accessibility" className="hover:text-foreground transition-colors">
                                            {t('links.accessibility')}
                                        </Link>
                                        <Link to="/privacy" className="hover:text-foreground transition-colors">
                                            {t('links.privacyPolicy')}
                                        </Link>
                                        <Link to="/privacy-choices" className="hover:text-foreground transition-colors">
                                            {t('links.privacyChoices')}
                                        </Link>
                                    </div>
                                </div>

                                {/* Right: Social Media Icons */}
                                <div className="flex items-center gap-4">
                                    <a
                                        href="https://youtube.com/channel/UCSTGHqzR1Q9yAVbiS3dAFHg"
                                        aria-label={t('socialMedia.youtubeLabel')}
                                        className="text-muted-foreground hover:text-foreground transition-colors">
                                        <SiYoutube className="w-5 h-5" />
                                    </a>
                                    <a
                                        href="https://instagram.com/commercecloud"
                                        aria-label={t('socialMedia.instagramLabel')}
                                        className="text-muted-foreground hover:text-foreground transition-colors">
                                        <SiInstagram className="w-5 h-5" />
                                    </a>
                                    <a
                                        href="https://x.com/CommerceCloud"
                                        aria-label={t('socialMedia.xLabel')}
                                        className="text-muted-foreground hover:text-foreground transition-colors">
                                        <SiX className="w-5 h-5" />
                                    </a>
                                    <a
                                        href="https://facebook.com/CommerceCloud/"
                                        aria-label={t('socialMedia.facebookLabel')}
                                        className="text-muted-foreground hover:text-foreground transition-colors">
                                        <SiFacebook className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>

                            {/* Bottom Row: Copyright/Address on Left, Legal Links + Switchers on Right */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-normal leading-5 text-muted-foreground">
                                <div>
                                    © {new Date().getFullYear()} {t('copyright')}
                                </div>
                                <div className="flex items-center gap-4">
                                    <LocaleSwitcher />
                                    <CurrencySwitcher />
                                    <Link to="/privacy" className="hover:text-foreground transition-colors">
                                        {t('links.privacyPolicy')}
                                    </Link>
                                    <Link to="/terms" className="hover:text-foreground transition-colors">
                                        {t('links.termsOfUse')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
