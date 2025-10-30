import type { ReactElement } from 'react';
import { Form, Link } from 'react-router';
import { Input } from '@/components/ui/input';
import { LoginSubmitButton } from '@/components/buttons/login-submit-button';
import uiStrings from '@/temp-ui-string';

interface PasswordlessLoginFormProps {
    error?: string;
    isPasswordlessEnabled: boolean;
    redirectPath?: string;
}

export default function PasswordlessLoginForm({
    error,
    isPasswordlessEnabled,
    redirectPath,
}: PasswordlessLoginFormProps): ReactElement {
    return (
        <Form method="post" className="space-y-6">
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    {uiStrings.login.emailLabel}
                </label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1"
                    placeholder={uiStrings.login.emailPlaceholder}
                />
            </div>

            {/* Hidden input to track login mode */}
            <input type="hidden" name="loginMode" value="passwordless" />

            {/* Hidden input to pass redirect URL */}
            {redirectPath && <input type="hidden" name="redirectPath" value={redirectPath} />}

            <LoginSubmitButton passwordless={true} />

            {/* Toggle to password login if enabled */}
            {isPasswordlessEnabled && (
                <div className="text-center">
                    <Link to="/login?mode=password" className="text-primary hover:text-primary/80 text-sm">
                        {uiStrings.login.loginWithPassword}
                    </Link>
                </div>
            )}

            <div className="text-center">
                <Link to="/reset-password" className="text-sm text-primary hover:text-primary/80">
                    {uiStrings.login.forgotPassword}
                </Link>
            </div>
        </Form>
    );
}
