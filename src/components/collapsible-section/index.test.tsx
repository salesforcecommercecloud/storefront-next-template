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

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import CollapsibleSection from '.';

describe('CollapsibleSection', () => {
    describe('label', () => {
        test('renders the label text in the summary', () => {
            render(<CollapsibleSection label="Description:">content</CollapsibleSection>);

            expect(screen.getByText('Description:')).toBeInTheDocument();
        });
    });

    describe('children', () => {
        test('renders child content inside the details element', () => {
            render(
                <CollapsibleSection label="Section">
                    <p>Child content here</p>
                </CollapsibleSection>
            );

            expect(screen.getByText('Child content here')).toBeInTheDocument();
        });
    });

    describe('defaultOpen', () => {
        test('is closed by default when defaultOpen is not provided', () => {
            const { container } = render(<CollapsibleSection label="Section">content</CollapsibleSection>);

            expect(container.querySelector('details')).not.toHaveAttribute('open');
        });

        test('is closed when defaultOpen is false', () => {
            const { container } = render(
                <CollapsibleSection label="Section" defaultOpen={false}>
                    content
                </CollapsibleSection>
            );

            expect(container.querySelector('details')).not.toHaveAttribute('open');
        });

        test('is open when defaultOpen is true', () => {
            const { container } = render(
                <CollapsibleSection label="Section" defaultOpen>
                    content
                </CollapsibleSection>
            );

            expect(container.querySelector('details')).toHaveAttribute('open');
        });
    });

    describe('className', () => {
        test('applies the group class by default', () => {
            const { container } = render(<CollapsibleSection label="Section">content</CollapsibleSection>);

            expect(container.querySelector('details')).toHaveClass('group');
        });

        test('merges custom className with the group class', () => {
            const { container } = render(
                <CollapsibleSection label="Section" className="mt-6 custom-class">
                    content
                </CollapsibleSection>
            );

            const details = container.querySelector('details');
            expect(details).toHaveClass('group');
            expect(details).toHaveClass('mt-6');
            expect(details).toHaveClass('custom-class');
        });
    });

    describe('chevron icon', () => {
        test('renders a chevron icon inside the summary', () => {
            const { container } = render(<CollapsibleSection label="Section">content</CollapsibleSection>);

            const svg = container.querySelector('summary svg');
            expect(svg).toBeInTheDocument();
        });
    });
});
