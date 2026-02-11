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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WriteReviewModalContent } from './write-review-modal-content';
import type { WriteReviewFormData } from '@/lib/adapters/product-content-data-types';

const mockFormConfig: WriteReviewFormData = {
    title: 'Write a Review',
    overallRating: { label: 'Overall Rating', required: true, placeholder: 'Select' },
    reviewTitle: { label: 'Review Title', placeholder: 'Summarize your experience', maxCharacters: 250 },
    reviewBody: { label: 'Your Review', placeholder: 'What did you think?', minCharacters: 50, maxCharacters: 2000 },
    recommend: { label: 'Would you recommend?', yesLabel: 'Yes', noLabel: 'No' },
    addPhotos: {
        label: 'Add Photos (Optional)',
        hint: 'Click to upload',
        accept: 'PNG, JPG',
        maxSize: '5MB',
    },
    termsText: 'By submitting you agree to our terms.',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit Review',
};

describe('WriteReviewModalContent', () => {
    const defaultProps = {
        formConfig: mockFormConfig,
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when formConfig is undefined', () => {
        const { container } = render(<WriteReviewModalContent onClose={vi.fn()} formConfig={undefined} />);
        expect(container.firstChild).toBeNull();
        expect(screen.queryByText('Overall Rating')).not.toBeInTheDocument();
    });

    it('renders form with labels from formConfig', () => {
        render(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.getByText('Overall Rating')).toBeInTheDocument();
        expect(screen.getByText('Review Title')).toBeInTheDocument();
        expect(screen.getByLabelText(/Your Review/)).toBeInTheDocument();
        expect(screen.getByText('Would you recommend?')).toBeInTheDocument();
        expect(screen.getByText('Add Photos (Optional)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit Review' })).toBeInTheDocument();
        expect(screen.getByText('By submitting you agree to our terms.')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', async () => {
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('shows rating validation when submit without selecting rating', async () => {
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Please select a rating')).toBeInTheDocument();
    });

    it('calls onClose when form is valid and submitted', async () => {
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} />);
        const oneStar = screen.getByRole('radio', { name: '1 out of 5 stars' });
        await user.click(oneStar);
        await user.type(screen.getByPlaceholderText('What did you think?'), 'A'.repeat(50));
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('shows review validation when body is under min characters', async () => {
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        await user.type(screen.getByPlaceholderText('What did you think?'), 'Too short');
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 50 characters/);
    });

    it('shows title validation when title exceeds max characters', async () => {
        const configWithShortTitleMax: WriteReviewFormData = {
            ...mockFormConfig,
            reviewTitle: { ...mockFormConfig.reviewTitle, maxCharacters: 5 },
        };
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} formConfig={configWithShortTitleMax} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        fireEvent.input(screen.getByLabelText('Review Title'), { target: { value: '123456' } });
        await user.type(screen.getByPlaceholderText('What did you think?'), 'A'.repeat(50));
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/no more than 5 characters/);
    });

    it('shows review validation when body exceeds max characters', async () => {
        const configWithSmallMax: WriteReviewFormData = {
            ...mockFormConfig,
            reviewBody: { ...mockFormConfig.reviewBody, minCharacters: 1, maxCharacters: 10 },
        };
        const user = userEvent.setup();
        render(<WriteReviewModalContent {...defaultProps} formConfig={configWithSmallMax} />);
        await user.click(screen.getByRole('radio', { name: '1 out of 5 stars' }));
        fireEvent.input(screen.getByPlaceholderText('What did you think?'), { target: { value: '12345678901' } });
        await user.click(screen.getByRole('button', { name: 'Submit Review' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/no more than 10 characters/);
    });

    it('renders recommend Yes/No options', () => {
        render(<WriteReviewModalContent {...defaultProps} />);
        expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
    });
});
