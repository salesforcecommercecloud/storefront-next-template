import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { SiFacebook, SiInstagram, SiX, SiYoutube } from '@icons-pack/react-simple-icons';
import Signup from './signup';
import uiStrings from '@/temp-ui-string';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';
// @sfdc-extension-line SFDC_EXT_INTERNAL_THEME_SWITCHER
import ThemeSwitcher from '@/extensions/theme-switcher/components/theme-switcher';

export default function Footer(): ReactElement {
    return (
        <footer data-theme="inverse" className="bg-background/90 py-12 mt-auto border-accent ring-secondary/40">
            <div className="container mx-auto px-4 text-foreground border-secondary/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg/40">
                    {/* Customer Support */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{uiStrings.footer.sections.customerSupport}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/contact" className="hover:underline">
                                    {uiStrings.footer.links.contactUs}
                                </Link>
                            </li>
                            <li>
                                <Link to="/shipping" className="hover:underline">
                                    {uiStrings.footer.links.shipping}
                                </Link>
                            </li>
                        </ul>
                        {/* @sfdc-extension-block-start SFDC_EXT_INTERNAL_THEME_SWITCHER */}
                        <h3 className="text-lg font-semibold my-4">{uiStrings.footer.sections.switchThemes}</h3>
                        <div className="flex items-center gap-2">
                            <ThemeSwitcher />
                        </div>
                        {/* @sfdc-extension-block-end SFDC_EXT_INTERNAL_THEME_SWITCHER */}
                    </div>

                    {/* Account */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{uiStrings.footer.sections.account}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/orders" className="hover:underline">
                                    {uiStrings.footer.links.orderStatus}
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:underline">
                                    {uiStrings.footer.links.signInOrCreateAccount}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Our Company */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{uiStrings.footer.sections.ourCompany}</h3>
                        <ul className="space-y-2">
                            {/* @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR */}
                            <li>
                                <Link to="/store-locator" className="hover:underline">
                                    {uiStringsSL.footer.links.storeLocator}
                                </Link>
                            </li>
                            {/* @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR */}
                            <li>
                                <Link to="/about" className="hover:underline">
                                    {uiStrings.footer.links.aboutUs}
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
                                aria-label={uiStrings.footer.socialMedia.youtubeLabel}
                                className="hover:underline">
                                <SiYoutube />
                            </a>
                            <a
                                href="https://instagram.com/commercecloud"
                                aria-label={uiStrings.footer.socialMedia.instagramLabel}
                                className="hover:underline">
                                <SiInstagram />
                            </a>
                            <a
                                href="https://x.com/CommerceCloud"
                                aria-label={uiStrings.footer.socialMedia.xLabel}
                                className="hover:underline">
                                <SiX />
                            </a>
                            <a
                                href="https://facebook.com/CommerceCloud/"
                                aria-label={uiStrings.footer.socialMedia.facebookLabel}
                                className="hover:underline">
                                <SiFacebook />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border/60">
                    <p className="text-center text-muted-foreground text-sm">
                        © {new Date().getFullYear()} Salesforce or its affiliates. All rights reserved. This is a demo
                        store only. Orders made WILL NOT be processed.
                        {uiStrings.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                    </p>
                </div>
            </div>
        </footer>
    );
}
