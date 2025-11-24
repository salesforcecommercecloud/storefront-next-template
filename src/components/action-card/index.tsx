'use client';
import { type ComponentProps, type ReactNode, type Ref, useState } from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Spinner } from '@/components/spinner';
import uiStrings from '@/temp-ui-string';
import { cn } from '@/lib/utils';

export interface ActionCardProps extends ComponentProps<'div'> {
    children?: ReactNode;
    onEdit?: () => void;
    onRemove?: () => void | Promise<unknown>;
    /** Ref for the edit button so that it can be focused on for accessibility */
    editBtnRef?: Ref<HTMLButtonElement>;
    editBtnLabel?: string;
    /** Ref for the edit button so that it can be focused on for accessibility */
    removeBtnRef?: Ref<HTMLButtonElement>;
    removeBtnLabel?: string;
}

/**
 * Card-style container with optional Edit/Remove actions.
 * If onRemove returns a promise, a loading overlay is shown while it resolves.
 */
const ActionCard = ({
    children,
    onEdit,
    onRemove,
    editBtnRef,
    editBtnLabel,
    removeBtnRef,
    removeBtnLabel,
    className,
    ...props
}: ActionCardProps) => {
    const [showLoading, setShowLoading] = useState(false);

    const handleRemove = async () => {
        if (!onRemove) {
            return;
        }
        setShowLoading(true);
        try {
            await onRemove();
        } finally {
            setShowLoading(false);
        }
    };

    return (
        <Card className={cn('relative', className)} {...props}>
            {showLoading && (
                <div className="absolute inset-0 z-10 rounded-xl bg-background/60" data-testid="loading-spinner">
                    <div className="flex h-full w-full items-center justify-center">
                        <Spinner size="md" />
                    </div>
                </div>
            )}
            <CardContent>{children}</CardContent>
            {(onEdit || onRemove) && (
                <CardFooter className="gap-4">
                    {onEdit && (
                        <Button
                            ref={editBtnRef}
                            onClick={onEdit}
                            variant="link"
                            size="sm"
                            className="font-bold"
                            aria-label={editBtnLabel ?? uiStrings.actionCard.edit}>
                            {uiStrings.actionCard.edit}
                        </Button>
                    )}
                    {onRemove && (
                        <Button
                            aria-label={removeBtnLabel ?? uiStrings.actionCard.remove}
                            className="text-destructive hover:text-destructive/80 font-bold"
                            onClick={() => void handleRemove()}
                            ref={removeBtnRef}
                            size="sm"
                            variant="link">
                            {uiStrings.actionCard.remove}
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};

export default ActionCard;
