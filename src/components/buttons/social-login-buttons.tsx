import type { ReactElement } from 'react';
import { Form } from 'react-router';
import uiStrings from '@/temp-ui-string';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/config';

interface SocialLoginButtonsProps {
    redirectPath?: string;
}

export function SocialLoginButtons({ redirectPath }: SocialLoginButtonsProps = {}): ReactElement | null {
    const { site } = useConfig();
    const socialIDPs: string[] = site.features.socialLogin.providers;

    const getProviderIcon = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'apple':
                return '🍎';
            case 'google':
                return '🔍';
            default:
                return '🔑';
        }
    };

    // text template moved to uiStrings.login.continueWithProvider

    if (socialIDPs.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {uiStrings.login.socialOrContinueWith}
                    </span>
                </div>
            </div>

            <div className="grid gap-2">
                {socialIDPs.map((provider) => {
                    return (
                        <Form method="post" key={provider}>
                            <input type="hidden" name="loginMode" value="social" />
                            <input type="hidden" name="provider" value={provider} />
                            {redirectPath && <input type="hidden" name="redirectPath" value={redirectPath} />}
                            <Button type="submit" variant="outline" className="w-full">
                                <span className="mr-2 text-lg">{getProviderIcon(provider)}</span>
                                {uiStrings.login.continueWithProvider.replace('{provider}', provider)}
                            </Button>
                        </Form>
                    );
                })}
            </div>
        </div>
    );
}
