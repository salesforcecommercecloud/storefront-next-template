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

import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { SeoMeta } from '.';

function getMeta(name: string) {
    return document.head.querySelector(`meta[name="${name}"]`);
}

describe('SeoMeta', () => {
    describe('title', () => {
        test('renders title with site name suffix', () => {
            render(<SeoMeta title="Classic Jacket" />);
            expect(document.title).toBe('Classic Jacket | Storefront Next: Market Street');
        });

        test('renders raw title without suffix when rawTitle is set', () => {
            render(<SeoMeta title="Custom Page Title" rawTitle />);
            expect(document.title).toBe('Custom Page Title');
        });

        test('renders site name as fallback when no title is provided', () => {
            render(<SeoMeta />);
            expect(document.title).toBe('Storefront Next: Market Street');
        });
    });

    describe('description', () => {
        test('renders meta description', () => {
            render(<SeoMeta description="A premium leather jacket." />);
            const meta = getMeta('description');
            expect(meta).toBeInTheDocument();
            expect(meta).toHaveAttribute('content', 'A premium leather jacket.');
        });

        test('does not render meta description when not provided', () => {
            render(<SeoMeta title="Test" />);
            expect(getMeta('description')).not.toBeInTheDocument();
        });
    });

    describe('noIndex', () => {
        test('renders robots noindex when set', () => {
            render(<SeoMeta title="Secret Page" noIndex />);
            const meta = getMeta('robots');
            expect(meta).toBeInTheDocument();
            expect(meta).toHaveAttribute('content', 'noindex');
        });

        test('does not render robots meta when noIndex is not set', () => {
            render(<SeoMeta title="Public Page" />);
            expect(getMeta('robots')).not.toBeInTheDocument();
        });
    });

    describe('siteName', () => {
        test('uses custom site name in title suffix', () => {
            render(<SeoMeta title="Products" siteName="My Store" />);
            expect(document.title).toBe('Products | My Store');
        });

        test('uses custom site name as fallback when no title provided', () => {
            render(<SeoMeta siteName="My Store" />);
            expect(document.title).toBe('My Store');
        });
    });

    describe('twitter card', () => {
        test('renders twitter card tags', () => {
            render(
                <SeoMeta
                    title="Jacket"
                    description="Nice jacket"
                    twitter={{ cardType: 'summary_large_image', image: 'https://img.example.com/jacket.jpg' }}
                />
            );

            expect(getMeta('twitter:card')).toHaveAttribute('content', 'summary_large_image');
            expect(getMeta('twitter:title')).toHaveAttribute('content', 'Jacket');
            expect(getMeta('twitter:description')).toHaveAttribute('content', 'Nice jacket');
            expect(getMeta('twitter:image')).toHaveAttribute('content', 'https://img.example.com/jacket.jpg');
        });

        test('defaults twitter card type to summary', () => {
            render(<SeoMeta title="Page" twitter={{}} />);
            expect(getMeta('twitter:card')).toHaveAttribute('content', 'summary');
        });

        test('omits twitter image when not provided', () => {
            render(<SeoMeta title="Page" twitter={{}} />);
            expect(getMeta('twitter:image')).not.toBeInTheDocument();
        });

        test('does not render twitter tags when twitter prop is omitted', () => {
            render(<SeoMeta title="Page" />);
            expect(getMeta('twitter:card')).not.toBeInTheDocument();
            expect(getMeta('twitter:title')).not.toBeInTheDocument();
        });
    });
});
