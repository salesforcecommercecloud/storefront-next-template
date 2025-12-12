import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function StoreLocatorFooter(): ReactElement {
    const { t } = useTranslation('extStoreLocator');
    return (
        <li>
            <Link to="/store-locator" className="hover:underline">
                {t('footer.links.storeLocator')}
            </Link>
        </li>
    );
}
