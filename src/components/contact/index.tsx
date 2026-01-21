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
import { type ReactElement, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, Link } from 'react-router';
import { Typography } from '@/components/typography';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const fieldClassName =
    'border-input bg-background text-foreground placeholder:text-muted-foreground shadow-xs h-10 px-3 py-2 text-sm leading-5';

const textAreaClassName = cn('min-h-48 resize-none text-sm leading-5');

export default function Contact(): ReactElement {
    const { t } = useTranslation('aboutUs');
    const { addToast } = useToast();

    //TODO: Support submit function, currently it only shows a mock success toast.
    const handleSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            addToast(t('contact.toast.success'), 'success');
            event.currentTarget.reset(); // Clear the form after successful submission
        },
        [addToast, t]
    );

    return (
        <Card className="max-w-screen-2xl rounded-xl border-0 bg-background px-0 py-6 shadow-none sm:flex-row gap-12">
            <div className="flex-1 p-6">
                <div className="flex flex-col gap-1.5">
                    <Typography variant="h3" className="tracking-tight text-card-foreground">
                        {t('contact.title')}
                    </Typography>
                    <div className="text-sm leading-5 text-muted-foreground">
                        <Typography as="p" className="text-sm leading-5 text-muted-foreground">
                            {t('contact.intro')}
                            <br />
                            <Link to={t('contact.phoneHref')} className="text-primary underline">
                                {t('contact.phoneDisplay')}
                            </Link>
                        </Typography>
                        <Typography as="p" className="mt-4 text-sm leading-5 text-muted-foreground">
                            {t('contact.hours.weekdays')}
                            <br />
                            {t('contact.hours.weekends')}
                        </Typography>
                        <Typography as="p" className="mt-4 text-sm leading-5 text-muted-foreground">
                            {t('contact.cta')}
                        </Typography>
                    </div>
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
                <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Typography as="div" variant="small">
                            {t('contact.form.nameLabel')}
                            <Typography as="span" className="text-destructive">
                                *
                            </Typography>
                        </Typography>
                        <Input
                            id="contact-full-name"
                            name="fullName"
                            required
                            placeholder={t('contact.form.placeholders.fullName')}
                            className={fieldClassName}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Typography as="div" variant="small">
                            {t('contact.form.emailLabel')}
                            <Typography as="span" className="text-destructive">
                                *
                            </Typography>
                        </Typography>
                        <Input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder={t('contact.form.placeholders.email')}
                            className={fieldClassName}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Typography as="div" variant="small">
                            {t('contact.form.label')}
                            <Typography as="span" className="text-destructive">
                                *
                            </Typography>
                        </Typography>
                        <Input
                            id="contact-topic"
                            name="topic"
                            placeholder={t('contact.form.placeholders.topic')}
                            className={fieldClassName}
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Typography as="div" variant="small">
                            {t('contact.form.messageLabel')}
                            <Typography as="span" className="text-destructive">
                                *
                            </Typography>
                        </Typography>
                        <Textarea
                            id="contact-message"
                            name="message"
                            className={textAreaClassName}
                            placeholder={t('contact.form.placeholders.message')}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        {t('contact.form.submit')}
                    </Button>
                </Form>
            </div>
        </Card>
    );
}
