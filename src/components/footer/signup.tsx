'use client';

import { type FormEvent, type ReactElement, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Signup(): ReactElement {
    const { t } = useTranslation('footer');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (inputRef.current?.value?.trim()) {
                const email = inputRef.current.value;
                // eslint-disable-next-line no-alert
                alert(`Signup email address: ${email}`);
            }
        },
        [inputRef]
    );

    return (
        <>
            <h3 className="text-lg font-semibold">{t('newsletter.title')}</h3>
            <p className="text-sm">{t('newsletter.description')}</p>
            <form onSubmit={handleSubmit} className="flex mt-4 w-full max-w-sm items-center gap-2">
                <Input
                    ref={inputRef}
                    type="email"
                    placeholder={t('newsletter.emailPlaceholder')}
                    className="text-primary-foreground"
                />
                <Button type="submit" variant="outline">
                    {t('newsletter.subscribeButton')}
                </Button>
            </form>
        </>
    );
}
