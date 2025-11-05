import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import uiStrings from '@/temp-ui-string';

/**
 * Props for the PasswordRequirement component
 */
export interface PasswordRequirementProps {
    /** The password string to validate against requirements */
    password: string;
    /** Optional CSS class name for custom styling */
    className?: string;
}

/**
 * Internal interface for defining password requirements
 */
interface Requirement {
    /** Unique identifier for the requirement */
    id: string;
    /** Human-readable description of the requirement */
    text: string;
    /** Function that validates if the password meets this requirement */
    validator: (password: string) => boolean;
}

/**
 * Array of password requirements to validate against
 */
const requirements: Requirement[] = [
    {
        id: 'length',
        text: uiStrings.account.password.requirements.minLength,
        validator: (password) => password.length >= 8,
    },
    {
        id: 'uppercase',
        text: uiStrings.account.password.requirements.hasUppercase,
        validator: (password) => /[A-Z]/.test(password),
    },
    {
        id: 'lowercase',
        text: uiStrings.account.password.requirements.hasLowercase,
        validator: (password) => /[a-z]/.test(password),
    },
    {
        id: 'number',
        text: uiStrings.account.password.requirements.hasNumber,
        validator: (password) => /\d/.test(password),
    },
    {
        id: 'special',
        text: uiStrings.account.password.requirements.hasSpecial,
        validator: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
];

/**
 * PasswordRequirement component that displays real-time password validation requirements.
 *
 * This component shows a checklist of password requirements with visual indicators
 * (check marks for met requirements, X marks for unmet requirements) that update
 * in real-time as the user types their password.
 *
 * @param props - The component props
 * @param props.password - The password string to validate against requirements
 * @param props.className - Optional CSS class name for custom styling
 *
 * @returns JSX element containing the password requirements checklist
 *
 * @example
 * ```tsx
 * import { PasswordRequirement } from '@/components/password-requirements';
 * import { useWatch } from 'react-hook-form';
 *
 * function PasswordForm() {
 *   const password = useWatch({ control, name: 'password' });
 *
 *   return (
 *     <div>
 *       <input type="password" {...register('password')} />
 *       <PasswordRequirement password={password} />
 *     </div>
 *   );
 * }
 * ```
 */
export function PasswordRequirement({ password, className }: PasswordRequirementProps) {
    return (
        <div className={cn('space-y-2', className)}>
            <h4 className="text-sm font-medium text-foreground">{uiStrings.account.password.requirements.title}</h4>
            <div className="space-y-1.5">
                {requirements.map((requirement) => {
                    const isValid = requirement.validator(password);
                    return (
                        <div
                            key={requirement.id}
                            className={cn(
                                'flex items-center gap-2 text-sm transition-colors',
                                isValid ? 'text-primary' : 'text-muted-foreground'
                            )}>
                            {isValid ? (
                                <Check className="h-4 w-4 text-primary" data-testid="check-icon" />
                            ) : (
                                <X className="h-4 w-4 text-muted-foreground" data-testid="x-icon" />
                            )}
                            <span>{requirement.text}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PasswordRequirement;
