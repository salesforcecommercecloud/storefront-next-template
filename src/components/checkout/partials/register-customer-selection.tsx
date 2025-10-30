import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Typography } from '@/components/typography';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import uiStrings from '@/temp-ui-string';

interface RegisterCustomerSelectionProps {
    /** Callback when checkbox state changes - receives boolean value */
    onSaved?: (shouldCreateAccount: boolean) => void;
}

export default function RegisterCustomerSelection({ onSaved }: RegisterCustomerSelectionProps) {
    const [shouldCreateAccount, setShouldCreateAccount] = useState(false);

    // Just track the user's preference, don't call API yet
    const handleCheckboxChange = (checked: boolean) => {
        setShouldCreateAccount(checked);
        onSaved?.(checked); // Pass the boolean preference to parent
    };

    return (
        <ToggleCard title={uiStrings.checkout.payment.saveForFutureUse} editing={true} disableEdit={true}>
            <ToggleCardEdit>
                <div className="flex items-start space-x-3">
                    <Checkbox
                        id="create-account-checkbox"
                        checked={shouldCreateAccount}
                        onCheckedChange={handleCheckboxChange}
                        className="mt-0.5"
                    />
                    <div className="space-y-1">
                        <label
                            htmlFor="create-account-checkbox"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            <Typography variant="small" className="font-medium">
                                {uiStrings.checkout.payment.createAccountForFasterCheckout}
                            </Typography>
                        </label>
                    </div>
                </div>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-2">
                    <Typography variant="small" className="text-muted-foreground">
                        Account Creation
                    </Typography>
                    <Typography variant="p" className="font-medium">
                        {shouldCreateAccount ? 'Account will be created' : 'Continue as guest'}
                    </Typography>
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
