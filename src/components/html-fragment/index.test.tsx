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
import { createRoutesStub } from 'react-router';
import HtmlFragment from '.';
import { HTML_CONTENT_STYLES } from './styles';

const renderHtmlFragment = (props: React.ComponentProps<typeof HtmlFragment>) => {
    const Stub = createRoutesStub([
        {
            path: '/test',
            Component: () => <HtmlFragment {...props} />,
        },
    ]);
    return render(<Stub initialEntries={['/test']} />);
};

describe('HtmlFragment', () => {
    test('renders a label when provided', () => {
        renderHtmlFragment({ content: 'Some content', label: 'Description:' });

        expect(screen.getByText('Description:')).toBeInTheDocument();
        expect(screen.getByText('Description:')).toHaveClass('font-semibold');
    });

    test('does not render a label when omitted', () => {
        const { container } = renderHtmlFragment({ content: 'Some content' });

        expect(screen.queryByText('Description:')).not.toBeInTheDocument();
        expect(container.querySelectorAll('.font-semibold')).toHaveLength(0);
    });

    test('renders plain text content', () => {
        renderHtmlFragment({ content: 'A premium quality product.' });

        expect(screen.getByText('A premium quality product.')).toBeInTheDocument();
    });

    test('renders HTML content', () => {
        renderHtmlFragment({
            content: '<ul><li>Premium cotton blend</li><li>Machine washable</li></ul>',
            contentType: 'bulleted-list',
        });

        expect(screen.getByText('Premium cotton blend')).toBeInTheDocument();
        expect(screen.getByText('Machine washable')).toBeInTheDocument();
    });

    test('applies plain-text styles by default', () => {
        const { container } = renderHtmlFragment({ content: 'Some text', label: 'Label' });

        const wrapper = container.querySelector('.flex.flex-col.gap-3');
        const contentDiv = wrapper?.querySelector(':scope > div:last-child');
        expect(contentDiv).toBeInTheDocument();
        expect(contentDiv?.className).toBe(HTML_CONTENT_STYLES['plain-text']);
    });

    test('applies bulleted-list styles when contentType is bulleted-list', () => {
        const { container } = renderHtmlFragment({
            content: '<ul><li>Item</li></ul>',
            contentType: 'bulleted-list',
            label: 'Label',
        });

        const wrapper = container.querySelector('.flex.flex-col.gap-3');
        const contentDiv = wrapper?.querySelector(':scope > div:last-child');
        expect(contentDiv).toBeInTheDocument();
        expect(contentDiv?.className).toBe(HTML_CONTENT_STYLES['bulleted-list']);
    });

    test('applies table-2-column styles when contentType is table-2-column', () => {
        const { container } = renderHtmlFragment({
            content: '<table><tr><td>Key:</td><td>Value</td></tr></table>',
            contentType: 'table-2-column',
            label: 'Specs',
        });

        const wrapper = container.querySelector('.flex.flex-col.gap-3');
        const contentDiv = wrapper?.querySelector(':scope > div:last-child');
        expect(contentDiv).toBeInTheDocument();
        expect(contentDiv?.className).toBe(HTML_CONTENT_STYLES['table-2-column']);
    });

    test('className override takes precedence over contentType', () => {
        const customClassName = 'custom-class text-lg';
        const { container } = renderHtmlFragment({
            content: '<ul><li>Item</li></ul>',
            contentType: 'bulleted-list',
            className: customClassName,
        });

        const contentDiv = container.querySelector('.custom-class');
        expect(contentDiv).toBeInTheDocument();
        expect(contentDiv).toHaveClass('text-lg');
    });

    test('renders empty content gracefully', () => {
        const { container } = renderHtmlFragment({ content: '' });

        const wrapper = container.querySelector('.flex.flex-col.gap-3');
        const contentDiv = wrapper?.querySelector(':scope > div:last-child');
        expect(contentDiv?.textContent).toBe('');
    });

    test('renders plain text when contentType is bulleted-list', () => {
        renderHtmlFragment({
            content: 'Just a plain string, no list markup',
            contentType: 'bulleted-list',
        });

        expect(screen.getByText('Just a plain string, no list markup')).toBeInTheDocument();
    });

    test('renders plain text when contentType is table-2-column', () => {
        renderHtmlFragment({
            content: 'Just a plain string, no table markup',
            contentType: 'table-2-column',
        });

        expect(screen.getByText('Just a plain string, no table markup')).toBeInTheDocument();
    });
});
