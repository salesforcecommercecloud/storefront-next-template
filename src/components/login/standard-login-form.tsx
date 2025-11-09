import { type ReactElement, useRef } from 'react';
import { Form, Link } from 'react-router';
import { Input } from '@/components/ui/input';
import { FormSubmitButton } from '@/components/buttons/form-submit-button';
import uiStrings from '@/temp-ui-string';

interface StandardLoginFormProps {
    error?: string;
    isPasswordlessEnabled: boolean;
    returnUrl?: string | null;
    action?: string | null;
    actionParams?: string | null;
}

export default function StandardLoginForm({
    error,
    isPasswordlessEnabled,
    returnUrl,
    action,
    actionParams,
}: StandardLoginFormProps): ReactElement {
    const formRef = useRef<HTMLFormElement>(null);

    return (
        <Form method="post" action="/login" className="space-y-6" ref={formRef}>
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

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    {uiStrings.login.passwordLabel}
                </label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1"
                    placeholder={uiStrings.login.passwordPlaceholder}
                />
            </div>

            {/* Hidden input to track login mode */}
            <input type="hidden" name="loginMode" value="password" />

            {/* Preserve returnUrl, action, and actionParams for redirect after login */}
            {/* Always include these as hidden inputs if they exist in props - they come from URL query params */}
            {returnUrl ? <input type="hidden" name="returnUrl" value={returnUrl} /> : null}
            {action ? <input type="hidden" name="action" value={action} /> : null}
            {actionParams ? <input type="hidden" name="actionParams" value={actionParams} /> : null}

            <FormSubmitButton defaultText={uiStrings.login.signIn} submittingText={uiStrings.login.signingIn} />
            {isPasswordlessEnabled && (
                <div className="text-center">
                    <Link to="/login?mode=passwordless" className="text-primary hover:text-primary/80 text-sm">
                        {uiStrings.login.loginWithoutPassword}
                    </Link>
                </div>
            )}

            <div className="text-center space-y-2">
                <Link to="/forgot-password" className="block text-sm text-primary hover:text-primary/80">
                    {uiStrings.login.forgotPassword}
                </Link>
                <p className="text-sm text-muted-foreground">
                    {uiStrings.login.noAccountQuestion}
                    <Link to="/signup" className="font-medium text-primary hover:underline">
                        {uiStrings.login.signUp}
                    </Link>
                </p>
            </div>
        </Form>
    );
}
