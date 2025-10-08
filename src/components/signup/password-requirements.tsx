'use client';

import { useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import uiStrings from '@/temp-ui-string';

// Password validation functions
import { validatePassword, isPasswordValid } from '@/lib/utils';

interface PasswordRequirementsProps {
    password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
    const validation = validatePassword(password);

    const requirements = [
        { key: 'minLength', text: uiStrings.signup.passwordRequirements.minLength, valid: validation.minLength },
        {
            key: 'hasUppercase',
            text: uiStrings.signup.passwordRequirements.hasUppercase,
            valid: validation.hasUppercase,
        },
        {
            key: 'hasLowercase',
            text: uiStrings.signup.passwordRequirements.hasLowercase,
            valid: validation.hasLowercase,
        },
        { key: 'hasNumber', text: uiStrings.signup.passwordRequirements.hasNumber, valid: validation.hasNumber },
        {
            key: 'hasSpecialChar',
            text: uiStrings.signup.passwordRequirements.hasSpecialChar,
            valid: validation.hasSpecialChar,
        },
    ];

    if (!password) {
        return (
            <div className="space-y-2 mt-2">
                <p className="text-sm font-medium text-foreground">{uiStrings.signup.passwordRequirements.title}</p>
                {requirements.map((req) => (
                    <div key={req.key} className="flex items-center space-x-2">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{req.text}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2 mt-2">
            <p className="text-sm font-medium text-foreground">{uiStrings.signup.passwordRequirements.title}</p>
            {requirements.map((req) => (
                <div key={req.key} className="flex items-center space-x-2">
                    {req.valid ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                        className={`text-sm transition-colors ${req.valid ? 'text-primary' : 'text-muted-foreground'}`}>
                        {req.text}
                    </span>
                </div>
            ))}
        </div>
    );
}

interface SignupFormProps {
    error?: string;
}

export function SignupForm({ error }: SignupFormProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (confirmPassword && e.target.value !== confirmPassword) {
            setShowPasswordMismatch(true);
        } else {
            setShowPasswordMismatch(false);
        }
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
        if (password && e.target.value !== password) {
            setShowPasswordMismatch(true);
        } else {
            setShowPasswordMismatch(false);
        }
    };

    const isFormValid = isPasswordValid(password) && password === confirmPassword && password.length > 0;

    return (
        <>
            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                            {uiStrings.signup.form.firstNameLabel}
                        </label>
                        <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            autoComplete="given-name"
                            required
                            className="mt-1"
                            placeholder={uiStrings.signup.form.firstNamePlaceholder}
                        />
                    </div>
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                            {uiStrings.signup.form.lastNameLabel}
                        </label>
                        <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            autoComplete="family-name"
                            required
                            className="mt-1"
                            placeholder={uiStrings.signup.form.lastNamePlaceholder}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                        {uiStrings.signup.form.emailLabel}
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="mt-1"
                        placeholder={uiStrings.signup.form.emailPlaceholder}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">
                        {uiStrings.signup.form.passwordLabel}
                    </label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={handlePasswordChange}
                        className="mt-1"
                        placeholder={uiStrings.signup.form.passwordPlaceholder}
                    />
                    <PasswordRequirements password={password} />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                        {uiStrings.signup.form.confirmPasswordLabel}
                    </label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        className={`mt-1`}
                        aria-invalid={showPasswordMismatch && confirmPassword ? true : undefined}
                        placeholder={uiStrings.signup.form.confirmPasswordPlaceholder}
                    />
                    {showPasswordMismatch && confirmPassword && (
                        <p className="mt-1 text-sm text-destructive">{uiStrings.signup.passwordsDoNotMatch}</p>
                    )}
                </div>

                <div>
                    <Button
                        type="submit"
                        disabled={!isFormValid}
                        className="w-full"
                        variant={isFormValid ? 'default' : 'secondary'}>
                        {uiStrings.signup.form.createAccountButton}
                    </Button>
                </div>
            </div>
        </>
    );
}
