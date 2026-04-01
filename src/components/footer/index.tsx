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
import { Suspense, type ReactElement } from 'react';
import { Await } from 'react-router';
import { Link } from '@/components/link';
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import Signup from './signup';
import { UITarget } from '@/targets/ui-target';
import { useTranslation } from 'react-i18next';
import LocaleSwitcher from '@/components/locale-switcher';
import CurrencySwitcher from '@/components/currency-switcher';
import logo from '/images/logo.svg';

interface FooterProps {
    categories?: Promise<ShopperProducts.schemas['Category']>;
}

export default function Footer({ categories }: FooterProps): ReactElement {
    const { t } = useTranslation('footer');

    return (
        <footer className="mt-auto">
            {/* Prominent Newsletter Section (Black Background) */}
            <div className="bg-primary text-primary-foreground py-12 md:py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('newsletter.title')}</h2>
                        <p className="text-base md:text-lg mb-6 opacity-90">{t('newsletter.description')}</p>
                        <div className="flex justify-center">
                            <Signup />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Links Section (Light Background) */}
            <div className="bg-footer-background py-12">
                <div className="container mx-auto px-4 text-footer-foreground">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
                        {/* Column 1: Shop - Dynamic Categories */}
                        <div>
                            <h3 className="text-sm font-semibold mb-4">{t('sections.shop')}</h3>
                            <ul className="space-y-2">
                                <UITarget targetId="footer.customersupport.start" />
                                {categories ? (
                                    <Suspense fallback={null}>
                                        <Await resolve={categories} errorElement={null}>
                                            {(rootCategory) => (
                                                <>
                                                    {rootCategory.categories?.map((category) => (
                                                        <li key={category.id}>
                                                            <Link
                                                                to={`/category/${category.id}`}
                                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                                                {category.name}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </>
                                            )}
                                        </Await>
                                    </Suspense>
                                ) : null}
                                <UITarget targetId="footer.customersupport.end" />
                            </ul>
                        </div>

                        {/* Column 2: Help */}
                        <div>
                            <h3 className="text-sm font-semibold mb-4">{t('sections.help')}</h3>
                            <ul className="space-y-2">
                                <UITarget targetId="footer.account.start" />
                                <li>
                                    <Link
                                        to="/contact"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {t('links.contactUs')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/shipping"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {t('links.shipping')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/orders"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {t('links.orderStatus')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/login"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {t('links.signInOrCreateAccount')}
                                    </Link>
                                </li>
                                <UITarget targetId="footer.account.end" />
                            </ul>
                        </div>

                        {/* Column 3: About */}
                        <div>
                            <h3 className="text-sm font-semibold mb-4">{t('sections.about')}</h3>
                            <ul className="space-y-2">
                                <UITarget targetId="footer.ourcompany.start" />
                                <li>
                                    <Link
                                        to="/about-us"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {t('links.aboutUs')}
                                    </Link>
                                </li>
                                <UITarget targetId="footer.ourcompany.end" />
                            </ul>
                        </div>
                    </div>

                    {/* Footer Bottom */}
                    <div className="mt-12 pt-8 border-t border-border/60">
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
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
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
