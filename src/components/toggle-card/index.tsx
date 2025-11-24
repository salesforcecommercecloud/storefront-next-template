'use client';

import { type ComponentProps, createContext, type ReactNode, type Ref, useContext, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';

type ToggleCardContextValue = {
    editing: boolean;
    disabled: boolean;
};

const ToggleCardContext = createContext<ToggleCardContextValue | undefined>(undefined);

export type ToggleCardProps = ComponentProps<'div'> & {
    id?: string;
    title?: ReactNode;
    description?: ReactNode;
    editing?: boolean;
    disabled?: boolean;
    disableEdit?: boolean;
    onEdit?: () => void;
    editLabel?: ReactNode;
    editAction?: string;
    onEditActionClick?: () => void;
    isLoading?: boolean;
    children?: ReactNode;
};

export function ToggleCard({
    id,
    title,
    description,
    editing = false,
    disabled = false,
    disableEdit = false,
    onEdit,
    editLabel,
    editAction,
    isLoading = false,
    onEditActionClick,
    children,
    className,
    ...props
}: ToggleCardProps) {
    const titleRef = useRef<HTMLDivElement | null>(null);

    const contextValue = useMemo<ToggleCardContextValue>(() => ({ editing, disabled }), [editing, disabled]);

    const showHeaderContentGap = editing || (!editing && !disabled);

    return (
        <ToggleCardContext.Provider value={contextValue}>
            <Card
                className={`relative ${showHeaderContentGap ? 'gap-4' : 'gap-0'} ${className ?? ''}`}
                data-testid={id ? `sf-toggle-card-${id}` : undefined}
                aria-disabled={disabled && !editing ? true : undefined}
                {...props}>
                <CardHeader className={!description ? 'grid-rows-1 items-center' : undefined}>
                    <CardTitle
                        ref={titleRef as unknown as Ref<HTMLDivElement>}
                        tabIndex={0}
                        className={disabled && !editing ? 'text-muted-foreground' : undefined}>
                        {title}
                    </CardTitle>
                    {description ? <CardDescription>{description}</CardDescription> : null}
                    {/* Actions */}
                    <CardAction className={!description ? 'row-span-1 self-center' : undefined}>
                        {!editing && !disabled && onEdit && !disableEdit ? (
                            <Button
                                className="cursor-pointer font-bold"
                                variant="link"
                                size="sm"
                                onClick={() => {
                                    if (onEdit) {
                                        onEdit();
                                    }
                                }}
                                aria-label={typeof editLabel === 'string' ? editLabel : 'Edit'}>
                                {editLabel ?? 'Edit'}
                            </Button>
                        ) : null}

                        {editing && editAction && onEditActionClick ? (
                            <Button
                                className="cursor-pointer font-bold"
                                variant="link"
                                size="sm"
                                onClick={onEditActionClick}
                                aria-label={editAction}>
                                {editAction}
                            </Button>
                        ) : null}
                    </CardAction>
                </CardHeader>

                <CardContent data-testid={id ? `sf-toggle-card-${id}-content` : undefined}>{children}</CardContent>

                {isLoading ? (
                    <div className="absolute inset-0 z-10 rounded-xl bg-background/60">
                        <div className="flex h-full w-full items-center justify-center">
                            <Spinner size="md" />
                        </div>
                    </div>
                ) : null}
            </Card>
        </ToggleCardContext.Provider>
    );
}

export function ToggleCardEdit({ children }: { children?: ReactNode }) {
    const ctx = useContext(ToggleCardContext);
    if (!ctx) return null;
    return ctx.editing ? <>{children}</> : null;
}

export function ToggleCardSummary({ children }: { children?: ReactNode }) {
    const ctx = useContext(ToggleCardContext);
    if (!ctx) return null;
    // Show summary when not editing (regardless of disabled state for single page layout)
    return !ctx.editing ? <>{children}</> : null;
}
