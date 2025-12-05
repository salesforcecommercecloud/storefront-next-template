import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import Signup from './signup';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-line SFDC_EXT_INTERNAL_THEME_SWITCHER
import ThemeSwitcher from '@/extensions/theme-switcher/components/theme-switcher';
import LocaleSwitcher from '@/components/locale-switcher';

export default function Footer(): ReactElement {
    const { t } = useTranslation('footer');
    // @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
    const { t: tStoreLocator } = useTranslation('extStoreLocator');

    return (
        <footer data-theme="inverse" className="bg-background/90 py-12 mt-auto border-accent ring-secondary/40">
            <div className="container mx-auto px-4 text-foreground border-secondary/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg/40">
                    {/* Customer Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.customerSupport')}</h3>
                        <ul className="space-y-2">
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
                        </ul>
                        {/* @sfdc-extension-block-start SFDC_EXT_INTERNAL_THEME_SWITCHER */}
                        <h3 className="text-lg font-semibold my-4">{t('sections.switchThemes')}</h3>
                        <div className="flex items-center gap-2">
                            <ThemeSwitcher />
                        </div>
                        {/* @sfdc-extension-block-end SFDC_EXT_INTERNAL_THEME_SWITCHER */}
                        <h3 className="text-lg font-semibold my-4">{t('sections.switchLanguage')}</h3>
                        <div className="flex items-center gap-2">
                            <LocaleSwitcher />
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.account')}</h3>
                        <ul className="space-y-2">
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
                        </ul>
                    </div>

                    {/* Our Company */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.ourCompany')}</h3>
                        <ul className="space-y-2">
                            {/* @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR */}
                            <li>
                                <Link to="/store-locator" className="hover:underline">
                                    {tStoreLocator('footer.links.storeLocator')}
                                </Link>
                            </li>
                            {/* @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR */}
                            <li>
                                <Link to="/about" className="hover:underline">
                                    {t('links.aboutUs')}
                                </Link>
                            </li>
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
