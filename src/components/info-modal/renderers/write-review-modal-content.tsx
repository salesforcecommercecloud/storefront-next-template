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

import { type ReactElement, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StarRating } from '@/components/product-ratings/star-rating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Typography } from '@/components/typography';
import { cn } from '@/lib/utils';
import type { WriteReviewFormData } from '@/lib/adapters/product-content-data-types';

const VALIDATION_ORANGE = '#f97316';

/**
 * Custom validation popup (no native HTML5 popup): white background, grey border,
 * exclamation inside orange square (same orange as HTML5 alert), dark text, speech-bubble pointer.
 */
function FieldValidationPopup({ id, message }: { id?: string; message: string }): ReactElement {
    return (
        <div
            id={id}
            role="alert"
            className="relative mt-2 w-max max-w-[280px] flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-lg">
            {/* Pointer border */}
            <span
                className="absolute -top-2 left-5 h-0 w-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-border"
                aria-hidden
            />
            {/* Pointer fill */}
            <span
                className="absolute -top-[7px] left-5 h-0 w-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-background"
                aria-hidden
            />
            {/* Exclamation inside orange square (design-specified; high contrast on orange) */}
            <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold text-primary-foreground"
                style={{ backgroundColor: VALIDATION_ORANGE }}
                aria-hidden>
                !
            </span>
            <span>{message}</span>
        </div>
    );
}

/**
 * Handler for submit review. Implementation to be added in a separate WI.
 */
function handleSubmitReview(): void {
    // No-op for now; will be implemented in a separate work item.
}

export function WriteReviewModalContent({
    onClose,
    formConfig,
}: {
    onClose?: () => void;
    formConfig?: WriteReviewFormData;
}): ReactElement | null {
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewBody, setReviewBody] = useState('');
    const [recommend, setRecommend] = useState<boolean | null>(null);
    const [isUploadZoneHovered, setIsUploadZoneHovered] = useState(false);
    const [showRatingValidation, setShowRatingValidation] = useState(false);
    const [showReviewValidation, setShowReviewValidation] = useState(false);
    const [showTitleValidation, setShowTitleValidation] = useState(false);

    const formRef = useRef<HTMLFormElement>(null);
    const ratingSectionRef = useRef<HTMLDivElement>(null);
    const ratingGroupRef = useRef<HTMLFieldSetElement>(null);
    const reviewBodyRef = useRef<HTMLTextAreaElement>(null);
    const { t } = useTranslation('writeReview');

    const minReviewLength = formConfig?.reviewBody?.minCharacters ?? 50;
    const maxReviewLength = formConfig?.reviewBody?.maxCharacters;
    const maxTitleLength = formConfig?.reviewTitle?.maxCharacters;
    const displayRating = hoverRating ?? selectedRating;

    const handleStarClick = useCallback((value: number) => {
        setSelectedRating(value);
        setShowRatingValidation(false);
    }, []);

    const reviewTitleTrimmed = reviewTitle.trim();
    const reviewBodyTrimmed = reviewBody.trim();
    const reviewBodyInvalid =
        reviewBody.length > 0 &&
        (reviewBodyTrimmed.length < minReviewLength ||
            (typeof maxReviewLength === 'number' && reviewBodyTrimmed.length > maxReviewLength));
    const reviewTitleInvalid = typeof maxTitleLength === 'number' && reviewTitleTrimmed.length > maxTitleLength;

    const handleFormSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = formRef.current;
            const textarea = reviewBodyRef.current;
            if (!form) return;

            // Clear custom validity so we can re-validate
            if (textarea) textarea.setCustomValidity('');

            // Require overall rating - show custom popup and scroll to rating so user sees the alert
            if (selectedRating <= 0) {
                setShowRatingValidation(true);
                setShowReviewValidation(false);
                setShowTitleValidation(false);
                if (typeof ratingSectionRef.current?.scrollIntoView === 'function') {
                    ratingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                ratingGroupRef.current?.focus();
                return;
            }

            const titleOverMax = typeof maxTitleLength === 'number' && reviewTitleTrimmed.length > maxTitleLength;
            if (titleOverMax) {
                setShowTitleValidation(true);
                setShowRatingValidation(false);
                setShowReviewValidation(false);
                form.querySelector<HTMLInputElement>('#write-review-title')?.focus();
                return;
            }

            if (reviewBodyTrimmed.length < minReviewLength) {
                setShowReviewValidation(true);
                setShowTitleValidation(false);
                setShowRatingValidation(false);
                if (textarea) textarea.focus();
                return;
            }
            const bodyOverMax = typeof maxReviewLength === 'number' && reviewBodyTrimmed.length > maxReviewLength;
            if (bodyOverMax) {
                setShowReviewValidation(true);
                setShowTitleValidation(false);
                setShowRatingValidation(false);
                if (textarea) textarea.focus();
                return;
            }
            handleSubmitReview();
            onClose?.();
        },
        [
            onClose,
            reviewBodyTrimmed.length,
            reviewTitleTrimmed.length,
            selectedRating,
            minReviewLength,
            maxReviewLength,
            maxTitleLength,
        ]
    );

    const handleCancel = useCallback(() => {
        onClose?.();
    }, [onClose]);

    const handleReviewTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setReviewTitle(e.target.value);
        setShowTitleValidation(false);
    }, []);

    const handleReviewBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setReviewBody(e.target.value);
        setShowReviewValidation(false);
        e.target.setCustomValidity('');
    }, []);

    const reviewValidationMessage = !showReviewValidation
        ? null
        : reviewBodyTrimmed.length === 0
          ? t('validation.reviewRequired')
          : reviewBodyTrimmed.length < minReviewLength
            ? t('validation.reviewMinLength', { count: minReviewLength })
            : typeof maxReviewLength === 'number' && reviewBodyTrimmed.length > maxReviewLength
              ? t('validation.reviewMaxLength', { count: maxReviewLength })
              : t('validation.reviewRequired');

    if (!formConfig) return null;

    return (
        <form ref={formRef} onSubmit={handleFormSubmit} noValidate>
            <div className="space-y-6 p-6">
                {/* Overall Rating - accessible radiogroup */}
                <div ref={ratingSectionRef} className="space-y-2">
                    <Label className="text-foreground" id="rating-label">
                        {formConfig.overallRating.label} <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                        <fieldset
                            ref={ratingGroupRef}
                            role="radiogroup"
                            aria-labelledby="rating-label"
                            aria-required
                            aria-invalid={showRatingValidation}
                            aria-describedby={showRatingValidation ? 'rating-validation-message' : undefined}
                            className="border-0 p-0 m-0 min-w-0"
                            onKeyDown={(e) => {
                                const currentValue = selectedRating || 1;
                                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    handleStarClick(Math.max(1, currentValue - 1));
                                } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    handleStarClick(Math.min(5, currentValue + 1));
                                }
                            }}>
                            <div className="relative flex items-center">
                                <StarRating
                                    rating={displayRating}
                                    reviewCount={0}
                                    showRatingLabel={false}
                                    starSize="lg"
                                    className="pointer-events-none"
                                />
                                <div className="absolute top-0 left-0 z-10 flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={selectedRating === value}
                                            aria-label={`${value} out of 5 stars`}
                                            tabIndex={
                                                selectedRating === value || (selectedRating === 0 && value === 1)
                                                    ? 0
                                                    : -1
                                            }
                                            className="h-6 w-6 shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            onMouseEnter={() => setHoverRating(value)}
                                            onMouseLeave={() => setHoverRating(null)}
                                            onClick={() => handleStarClick(value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleStarClick(value);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                        {selectedRating > 0 ? (
                            <Typography variant="muted" as="span" className="text-sm">
                                {selectedRating} out of 5 stars
                            </Typography>
                        ) : null}
                    </div>
                    {showRatingValidation && (
                        <FieldValidationPopup id="rating-validation-message" message={t('validation.ratingRequired')} />
                    )}
                </div>

                {/* Review Title */}
                <div className="space-y-2">
                    <Label htmlFor="write-review-title" className="text-foreground">
                        {formConfig.reviewTitle.label}
                    </Label>
                    <Input
                        id="write-review-title"
                        type="text"
                        placeholder={formConfig.reviewTitle.placeholder}
                        value={reviewTitle}
                        onChange={handleReviewTitleChange}
                        maxLength={formConfig.reviewTitle.maxCharacters}
                        aria-invalid={reviewTitleInvalid || showTitleValidation}
                        aria-describedby={showTitleValidation ? 'title-validation-message' : undefined}
                        className={cn('w-full', (reviewTitleInvalid || showTitleValidation) && 'border-destructive')}
                    />
                    {showTitleValidation && maxTitleLength != null && (
                        <FieldValidationPopup
                            id="title-validation-message"
                            message={t('validation.titleMaxLength', { count: maxTitleLength })}
                        />
                    )}
                </div>

                {/* Your Review (mandatory) */}
                <div className="space-y-2">
                    <Label htmlFor="write-review-body" className="text-foreground">
                        {formConfig.reviewBody.label} <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                        ref={reviewBodyRef}
                        id="write-review-body"
                        placeholder={formConfig.reviewBody.placeholder}
                        value={reviewBody}
                        onChange={handleReviewBodyChange}
                        rows={4}
                        maxLength={formConfig.reviewBody.maxCharacters}
                        aria-invalid={reviewBodyInvalid || showReviewValidation}
                        aria-describedby={showReviewValidation ? 'review-validation-message' : undefined}
                        className={cn(
                            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                            (reviewBodyInvalid || showReviewValidation) && 'border-destructive'
                        )}
                    />
                    <p className="mt-2 text-[0.75rem] text-muted-foreground">
                        {t('minCharactersHint', { count: minReviewLength })}
                    </p>
                    {showReviewValidation && reviewValidationMessage && (
                        <>
                            <FieldValidationPopup id="review-validation-message" message={reviewValidationMessage} />
                            <p id="review-validation-inline" className="mt-2 text-sm text-destructive">
                                {reviewValidationMessage}
                            </p>
                        </>
                    )}
                </div>

                {/* Would you recommend? */}
                <div className="space-y-2">
                    <Label className="text-foreground">{formConfig.recommend.label}</Label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="recommend"
                                checked={recommend === true}
                                onChange={() => setRecommend(true)}
                                className="border-input text-primary focus:ring-ring"
                            />
                            <span className="text-sm">{formConfig.recommend.yesLabel}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="recommend"
                                checked={recommend === false}
                                onChange={() => setRecommend(false)}
                                className="border-input text-primary focus:ring-ring"
                            />
                            <span className="text-sm">{formConfig.recommend.noLabel}</span>
                        </label>
                    </div>
                </div>

                {/* Add Photos (Optional) - dotted border, blue on hover */}
                <div className="space-y-2">
                    <Label className="text-foreground">{formConfig.addPhotos.label}</Label>
                    <div
                        role="button"
                        tabIndex={0}
                        onMouseEnter={() => setIsUploadZoneHovered(true)}
                        onMouseLeave={() => setIsUploadZoneHovered(false)}
                        onFocus={() => setIsUploadZoneHovered(true)}
                        onBlur={() => setIsUploadZoneHovered(false)}
                        className={cn(
                            'mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                            isUploadZoneHovered ? 'border-primary bg-primary/5' : 'border-muted-foreground/40'
                        )}>
                        <svg
                            className="h-10 w-10 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <Typography variant="muted" className="text-sm">
                            {formConfig.addPhotos.hint}
                        </Typography>
                        <Typography variant="muted" className="text-xs">
                            {formConfig.addPhotos.accept} up to {formConfig.addPhotos.maxSize}
                        </Typography>
                    </div>
                </div>

                <Typography variant="muted" className="text-xs">
                    {formConfig.termsText}
                </Typography>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-0 border-t border-border">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="hover:bg-muted hover:text-foreground hover:border-border">
                    {formConfig.cancelLabel}
                </Button>
                <Button type="submit">{formConfig.submitLabel}</Button>
            </div>
        </form>
    );
}
