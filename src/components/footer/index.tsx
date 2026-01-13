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
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import Signup from './signup';
import { PluginComponent } from '@/plugins/plugin-component';
import { useTranslation } from 'react-i18next';
import LocaleSwitcher from '@/components/locale-switcher';
import CurrencySwitcher from '@/components/currency-switcher';

export default function Footer(): ReactElement {
    const { t } = useTranslation('footer');

    return (
        <footer data-theme="inverse" className="bg-background/90 py-12 mt-auto border-accent ring-secondary/40">
            <div className="container mx-auto px-4 text-foreground border-secondary/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg/40">
                    {/* Customer Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.customerSupport')}</h3>
                        <ul className="space-y-2">
                            <PluginComponent pluginId="footer.customersupport.start" />
                            <li>
                                <Link to="/contact" className="hover:underline">
                                    {t('links.contactUs')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/shipping" className="hover:underline">
                                    {t('links.shipping')}
                                </Link>
                            </li>
                            <PluginComponent pluginId="footer.customersupport.end" />
                        </ul>
                        <h3 className="text-lg font-semibold my-4">{t('sections.switchLanguage')}</h3>
                        <div className="flex items-center gap-2">
                            <LocaleSwitcher />
                        </div>
                        <h3 className="text-lg font-semibold my-4">{t('sections.switchCurrency')}</h3>
                        <div className="flex items-center gap-2">
                            <CurrencySwitcher />
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.account')}</h3>
                        <ul className="space-y-2">
                            <PluginComponent pluginId="footer.account.start" />
                            <li>
                                <Link to="/orders" className="hover:underline">
                                    {t('links.orderStatus')}
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:underline">
                                    {t('links.signInOrCreateAccount')}
                                </Link>
                            </li>
                            <PluginComponent pluginId="footer.account.end" />
                        </ul>
                    </div>

                    {/* Our Company */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.ourCompany')}</h3>
                        <ul className="space-y-2">
                            <PluginComponent pluginId="footer.ourcompany.start" />
                            <li>
                                <Link to="/about-us" className="hover:underline">
                                    {t('links.aboutUs')}
                                </Link>
                            </li>
                            <PluginComponent pluginId="footer.ourcompany.end" />
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <Signup />

                        <div className="flex mt-6 space-x-3">
                            <a
                                href="https://youtube.com/channel/UCSTGHqzR1Q9yAVbiS3dAFHg"
                                aria-label={t('socialMedia.youtubeLabel')}
                                className="hover:underline">
                                <SiYoutube />
                            </a>
                            <a
                                href="https://instagram.com/commercecloud"
                                aria-label={t('socialMedia.instagramLabel')}
                                className="hover:underline">
                                <SiInstagram />
                            </a>
                            <a
                                href="https://x.com/CommerceCloud"
                                aria-label={t('socialMedia.xLabel')}
                                className="hover:underline">
                                <SiX />
                            </a>
                            <a
                                href="https://facebook.com/CommerceCloud/"
                                aria-label={t('socialMedia.facebookLabel')}
                                className="hover:underline">
                                <SiFacebook />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border/60">
                    <p className="text-center text-muted-foreground text-sm">
                        © {new Date().getFullYear()} {t('copyright')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
