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
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerInterests, useCustomerPreferences } from '@/hooks/customer-preferences/use-customer-preferences';
import { useTranslation } from 'react-i18next';
import type { PreferenceValue } from '@/lib/adapters/customer-preferences-types';

export interface InterestsPreferencesSectionProps {
    /** Customer ID for fetching/updating interests and preferences */
    customerId: string;
    /** Callback when data is successfully updated */
    onSuccess?: () => void;
    /** Callback when an error occurs */
    onError?: (error: string) => void;
}

/**
 * Combined Interests & Preferences section component.
 *
 * Features:
 * - Displays interests as removable badges with tabbed dialog for adding more
 * - Displays preferences (Product Categories, Shopping Preferences, Size Preference)
 * - Single card with unified editing experience
 */
export function InterestsPreferencesSection({ customerId, onSuccess, onError }: InterestsPreferencesSectionProps) {
    const { t } = useTranslation('account');
    const [isEditing, setIsEditing] = useState(false);
    const [pendingInterests, setPendingInterests] = useState<string[]>([]);
    const [pendingPreferences, setPendingPreferences] = useState<Record<string, PreferenceValue>>({});
    const [isInterestsDialogOpen, setIsInterestsDialogOpen] = useState(false);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [activeMultiSelectId, setActiveMultiSelectId] = useState<string | null>(null);

    // Interests hook
    const {
        availableInterests,
        interestCategories,
        selectedInterestIds,
        isLoading: isLoadingInterests,
        isSaving: isSavingInterests,
        error: interestsError,
        isEnabled: isInterestsEnabled,
        fetchInterests,
        updateInterests,
    } = useCustomerInterests();

    // Preferences hook
    const {
        availablePreferences,
        preferences,
        isLoading: isLoadingPreferences,
        isSaving: isSavingPreferences,
        error: preferencesError,
        isEnabled: isPreferencesEnabled,
        fetchPreferences,
        updatePreferences,
    } = useCustomerPreferences();

    const isLoading = isLoadingInterests || isLoadingPreferences;
    const isSaving = isSavingInterests || isSavingPreferences;
    const isEnabled = isInterestsEnabled || isPreferencesEnabled;
    const error = interestsError || preferencesError;

    // Set default active tab when categories load
    useEffect(() => {
        if (interestCategories.length > 0 && !activeTabId) {
            setActiveTabId(interestCategories[0].id);
        }
    }, [interestCategories, activeTabId]);

    // Fetch data when component mounts
    useEffect(() => {
        if (customerId && isInterestsEnabled) {
            void fetchInterests(customerId);
        }
    }, [customerId, isInterestsEnabled, fetchInterests]);

    useEffect(() => {
        if (customerId && isPreferencesEnabled) {
            void fetchPreferences(customerId);
        }
    }, [customerId, isPreferencesEnabled, fetchPreferences]);

    // Sync pending state when entering edit mode
    useEffect(() => {
        if (isEditing) {
            setPendingInterests([...selectedInterestIds]);
            setPendingPreferences({ ...preferences });
        }
    }, [isEditing, selectedInterestIds, preferences]);

    // Get all selected interests with their names
    const selectedInterestsWithNames = useMemo(() => {
        const idsToCheck = isEditing ? pendingInterests : selectedInterestIds;
        return availableInterests.filter((interest) => idsToCheck.includes(interest.id));
    }, [isEditing, pendingInterests, selectedInterestIds, availableInterests]);

    // Get the active tab category
    const activeCategory = useMemo(
        () => interestCategories.find((c) => c.id === activeTabId),
        [interestCategories, activeTabId]
    );

    // Get active multi-select preference
    const activeMultiSelect = availablePreferences.find((p) => p.id === activeMultiSelectId);

    // Handlers
    const handleEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleCancel = useCallback(() => {
        setPendingInterests([...selectedInterestIds]);
        setPendingPreferences({ ...preferences });
        setIsEditing(false);
    }, [selectedInterestIds, preferences]);

    const handleSave = useCallback(async () => {
        try {
            await Promise.all([
                updateInterests(customerId, pendingInterests),
                updatePreferences(customerId, pendingPreferences),
            ]);
            setIsEditing(false);
            onSuccess?.();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('interestsPreferences.errorMessage');
            onError?.(errorMessage);
        }
    }, [customerId, pendingInterests, pendingPreferences, updateInterests, updatePreferences, onSuccess, onError, t]);

    // Interest handlers
    const handleRemoveInterest = useCallback((interestId: string) => {
        setPendingInterests((prev) => prev.filter((id) => id !== interestId));
    }, []);

    const handleOpenInterestsDialog = useCallback(() => {
        setIsInterestsDialogOpen(true);
        if (interestCategories.length > 0) {
            setActiveTabId(interestCategories[0].id);
        }
    }, [interestCategories]);

    const handleCloseInterestsDialog = useCallback(() => {
        setIsInterestsDialogOpen(false);
    }, []);

    const handleToggleInterestInDialog = useCallback((interestId: string, checked: boolean) => {
        setPendingInterests((prev) => {
            if (checked) {
                return [...prev, interestId];
            }
            return prev.filter((id) => id !== interestId);
        });
    }, []);

    // Preference handlers
    const handleRemoveMultiSelectItem = useCallback((prefId: string, value: string) => {
        setPendingPreferences((prev) => {
            const current = prev[prefId];
            if (Array.isArray(current)) {
                return {
                    ...prev,
                    [prefId]: current.filter((v) => v !== value),
                };
            }
            return prev;
        });
    }, []);

    const handleToggleMultiSelectItem = useCallback((prefId: string, value: string, checked: boolean) => {
        setPendingPreferences((prev) => {
            const current = prev[prefId];
            const currentArray = Array.isArray(current) ? current : [];
            if (checked) {
                return {
                    ...prev,
                    [prefId]: [...currentArray, value],
                };
            }
            return {
                ...prev,
                [prefId]: currentArray.filter((v) => v !== value),
            };
        });
    }, []);

    const handleSelectButtonGroup = useCallback((prefId: string, value: string) => {
        setPendingPreferences((prev) => ({
            ...prev,
            [prefId]: value,
        }));
    }, []);

    const handleSelectChange = useCallback((prefId: string, value: string) => {
        setPendingPreferences((prev) => ({
            ...prev,
            [prefId]: value,
        }));
    }, []);

    const handleTextGroupChange = useCallback((prefId: string, fieldId: string, value: string) => {
        setPendingPreferences((prev) => {
            const current = prev[prefId];
            const currentRecord = typeof current === 'object' && !Array.isArray(current) ? current : {};
            return {
                ...prev,
                [prefId]: {
                    ...currentRecord,
                    [fieldId]: value,
                },
            };
        });
    }, []);

    // Helper functions
    const getArrayValue = (value: PreferenceValue): string[] => {
        return Array.isArray(value) ? value : [];
    };

    const getTextGroupValue = (value: PreferenceValue): Record<string, string> => {
        return typeof value === 'object' && !Array.isArray(value) ? value : {};
    };

    const getDisplayValue = (pref: { options?: { value: string; label: string }[] }, value: PreferenceValue) => {
        if (pref.options) {
            const option = pref.options.find((o) => o.value === value);
            return option?.label || String(value);
        }
        return String(value);
    };

    if (!isEnabled) {
        return null;
    }

    return (
        <>
            <Card data-testid="interests-preferences-section">
                <CardHeader className="flex flex-row items-start justify-between border-b border-muted-foreground/20 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold">{t('interestsPreferences.title')}</CardTitle>
                        <CardDescription>{t('interestsPreferences.description')}</CardDescription>
                    </div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button
                                data-testid="interests-preferences-save-button"
                                size="sm"
                                onClick={() => void handleSave()}
                                disabled={isSaving}>
                                {isSaving ? t('common.saving') : t('common.save')}
                            </Button>
                            <Button
                                data-testid="interests-preferences-cancel-button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}>
                                {t('common.cancel')}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            data-testid="interests-preferences-edit-button"
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}>
                            {t('common.edit')}
                        </Button>
                    )}
                </CardHeader>

                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-24" />
                                <div className="flex flex-wrap gap-2">
                                    <Skeleton className="h-8 w-24 rounded-md" />
                                    <Skeleton className="h-8 w-20 rounded-md" />
                                </div>
                            </div>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-24 rounded-md" />
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {error && <p className="text-sm text-destructive">{error.message}</p>}

                            {/* ===== INTERESTS SECTION ===== */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('interests.title')}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {selectedInterestsWithNames.length > 0 ? (
                                        selectedInterestsWithNames.map((interest) => (
                                            <span
                                                key={interest.id}
                                                data-testid={`interest-badge-${interest.id}`}
                                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                                                    isEditing
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-primary/10 text-primary'
                                                }`}>
                                                {interest.name}
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveInterest(interest.id)}
                                                        className="ml-0.5 rounded hover:bg-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                                                        aria-label={`Remove ${interest.name}`}>
                                                        <XIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            {t('interests.noneSelected')}
                                        </span>
                                    )}
                                </div>

                                {isEditing && (
                                    <button
                                        type="button"
                                        data-testid="interests-add-more-button"
                                        onClick={handleOpenInterestsDialog}
                                        className="text-sm font-medium text-primary hover:underline">
                                        + {t('interests.addMore')}
                                    </button>
                                )}
                            </div>

                            {/* ===== PREFERENCES SECTION ===== */}
                            {availablePreferences.map((pref) => {
                                const currentValue = isEditing ? pendingPreferences[pref.id] : preferences[pref.id];

                                return (
                                    <div key={pref.id} className="space-y-3">
                                        {/* Multi-select (Product Categories style) */}
                                        {pref.type === 'multi-select' && (
                                            <>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {pref.name}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {getArrayValue(currentValue).length > 0 ? (
                                                        getArrayValue(currentValue).map((val) => {
                                                            const label =
                                                                pref.options?.find((o) => o.value === val)?.label ||
                                                                val;
                                                            return (
                                                                <span
                                                                    key={val}
                                                                    data-testid={`pref-badge-${pref.id}-${val}`}
                                                                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                                                                        isEditing
                                                                            ? 'bg-primary text-primary-foreground'
                                                                            : 'bg-primary/10 text-primary'
                                                                    }`}>
                                                                    {label}
                                                                    {isEditing && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleRemoveMultiSelectItem(
                                                                                    pref.id,
                                                                                    val
                                                                                )
                                                                            }
                                                                            className="ml-0.5 rounded hover:bg-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
                                                                            aria-label={`Remove ${label}`}>
                                                                            <XIcon className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            {t('preferences.noneSelected')}
                                                        </span>
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        data-testid={`pref-${pref.id}-add-more-button`}
                                                        onClick={() => setActiveMultiSelectId(pref.id)}
                                                        className="text-sm font-medium text-primary hover:underline">
                                                        + {t('preferences.addMore')}
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {/* Button Group (Shopping Preferences style) */}
                                        {pref.type === 'button-group' && pref.options && (
                                            <>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {pref.name}
                                                </p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {pref.options.map((option) => {
                                                        const isSelected = currentValue === option.value;
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() =>
                                                                    isEditing &&
                                                                    handleSelectButtonGroup(pref.id, option.value)
                                                                }
                                                                disabled={!isEditing}
                                                                className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : 'border border-input bg-background text-foreground hover:bg-accent'
                                                                } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}>
                                                                {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}

                                        {/* Text Group (Measures style) */}
                                        {pref.type === 'text-group' &&
                                            pref.fields &&
                                            (() => {
                                                const textGroupValue = getTextGroupValue(currentValue);
                                                const hasAnyValue = Object.values(textGroupValue).some(
                                                    (v) => v && v.trim() !== ''
                                                );

                                                return (
                                                    <>
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                            {pref.name}
                                                        </p>
                                                        {isEditing ? (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {pref.fields.map((field) => {
                                                                    const fieldValue = textGroupValue[field.id] || '';
                                                                    return (
                                                                        <div
                                                                            key={field.id}
                                                                            className={
                                                                                field.width === 'full'
                                                                                    ? 'col-span-2'
                                                                                    : 'col-span-1'
                                                                            }>
                                                                            <label
                                                                                htmlFor={`field-${field.id}`}
                                                                                className="mb-1.5 block text-sm font-medium text-foreground">
                                                                                {field.label}
                                                                            </label>
                                                                            <Input
                                                                                id={`field-${field.id}`}
                                                                                type="text"
                                                                                placeholder={field.placeholder}
                                                                                value={fieldValue}
                                                                                onChange={(e) =>
                                                                                    handleTextGroupChange(
                                                                                        pref.id,
                                                                                        field.id,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                disabled={isSaving}
                                                                                className="w-full"
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : hasAnyValue ? (
                                                            <div className="space-y-1">
                                                                {/* Room dimensions: combine width × length */}
                                                                {(textGroupValue.room_width ||
                                                                    textGroupValue.room_length) && (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        <span className="font-medium text-foreground">
                                                                            Room dimensions:
                                                                        </span>{' '}
                                                                        {textGroupValue.room_width || '—'}
                                                                        &quot; × {textGroupValue.room_length || '—'}
                                                                        &quot;
                                                                    </p>
                                                                )}
                                                                {/* Ceiling height */}
                                                                {textGroupValue.ceiling_height && (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        <span className="font-medium text-foreground">
                                                                            Ceiling height:
                                                                        </span>{' '}
                                                                        {textGroupValue.ceiling_height}&quot;
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">
                                                                No measures provided
                                                            </p>
                                                        )}
                                                    </>
                                                );
                                            })()}

                                        {/* Select (Size Preference style) */}
                                        {pref.type === 'select' &&
                                            pref.options &&
                                            (() => {
                                                const hasSelectedValue =
                                                    currentValue &&
                                                    currentValue !== 'no_preference' &&
                                                    currentValue !== '';

                                                // In view mode, hide if no value selected
                                                if (!isEditing && !hasSelectedValue) {
                                                    return null;
                                                }

                                                return isEditing ? (
                                                    <>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {pref.name}
                                                        </p>
                                                        <div className="w-full [&>div]:w-full">
                                                            <NativeSelect
                                                                id={`pref-${pref.id}`}
                                                                value={String(currentValue || '')}
                                                                onChange={(e) =>
                                                                    handleSelectChange(pref.id, e.target.value)
                                                                }
                                                                disabled={isSaving}>
                                                                {pref.options.map((option) => (
                                                                    <NativeSelectOption
                                                                        key={option.value}
                                                                        value={option.value}>
                                                                        {option.label}
                                                                    </NativeSelectOption>
                                                                ))}
                                                            </NativeSelect>
                                                        </div>
                                                        {pref.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {pref.description}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className="font-medium text-foreground">
                                                            Preferred product size:
                                                        </span>{' '}
                                                        {getDisplayValue(pref, currentValue)}
                                                    </p>
                                                );
                                            })()}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabbed Interest Selection Dialog */}
            <Dialog open={isInterestsDialogOpen} onOpenChange={(open) => !open && handleCloseInterestsDialog()}>
                <DialogContent
                    data-testid="interests-dialog"
                    className="sm:max-w-xl max-h-[80vh] flex flex-col"
                    showCloseButton={true}>
                    <DialogHeader className="pb-0">
                        <DialogTitle>{t('interests.addInterestsTitle')}</DialogTitle>
                    </DialogHeader>

                    {/* Tab Navigation */}
                    <div className="border-b border-muted-foreground/20">
                        <div className="flex gap-1 overflow-x-auto">
                            {interestCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    data-testid={`interests-tab-${category.id}`}
                                    onClick={() => setActiveTabId(category.id)}
                                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                                        activeTabId === category.id
                                            ? 'border-b-2 border-primary text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}>
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {activeCategory && (
                            <div className="flex flex-col gap-3">
                                {activeCategory.options.map((interest) => {
                                    const isChecked = pendingInterests.includes(interest.id);
                                    return (
                                        <label
                                            key={interest.id}
                                            htmlFor={`dialog-interest-${interest.id}`}
                                            className="flex items-center justify-between rounded-xl border border-input px-4 py-3.5 cursor-pointer hover:bg-accent transition-colors">
                                            <span className="text-sm font-normal">{interest.name}</span>
                                            <Checkbox
                                                id={`dialog-interest-${interest.id}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) =>
                                                    handleToggleInterestInDialog(interest.id, checked === true)
                                                }
                                                className="size-5 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-muted-foreground/20 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseInterestsDialog}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="button"
                            data-testid="interests-dialog-save-button"
                            onClick={handleCloseInterestsDialog}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Multi-select Preference Dialog */}
            <Dialog open={activeMultiSelectId !== null} onOpenChange={(open) => !open && setActiveMultiSelectId(null)}>
                <DialogContent data-testid="product-categories-dialog" className="sm:max-w-xl" showCloseButton={true}>
                    <DialogHeader>
                        <DialogTitle>
                            {activeMultiSelect?.name
                                ? t('preferences.selectCategory', {
                                      category: activeMultiSelect.name,
                                  })
                                : t('preferences.dialogTitle')}
                        </DialogTitle>
                    </DialogHeader>

                    {activeMultiSelect && (
                        <div className="flex flex-col gap-3 py-2">
                            {activeMultiSelect.options?.map((option) => {
                                const isChecked = getArrayValue(pendingPreferences[activeMultiSelect.id]).includes(
                                    option.value
                                );
                                return (
                                    <label
                                        key={option.value}
                                        htmlFor={`dialog-pref-${option.value}`}
                                        className="flex items-center justify-between rounded-xl border border-input px-4 py-3.5 cursor-pointer hover:bg-accent transition-colors">
                                        <span className="text-sm font-normal">{option.label}</span>
                                        <Checkbox
                                            id={`dialog-pref-${option.value}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) =>
                                                handleToggleMultiSelectItem(
                                                    activeMultiSelect.id,
                                                    option.value,
                                                    checked === true
                                                )
                                            }
                                            className="size-5 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setActiveMultiSelectId(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="button"
                            data-testid="product-categories-dialog-save-button"
                            onClick={() => setActiveMultiSelectId(null)}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * Skeleton component for the interests & preferences section
 */
export function InterestsPreferencesSectionSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between border-b border-muted-foreground/20 pb-4">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-9 w-16" />
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-8 w-24 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-24 rounded-md" />
                                <Skeleton className="h-8 w-20 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default InterestsPreferencesSection;
