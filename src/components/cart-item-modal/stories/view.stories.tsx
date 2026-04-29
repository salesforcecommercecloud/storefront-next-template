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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CartItemModalView } from '../view';

const meta: Meta<typeof CartItemModalView> = {
    title: 'CART/Cart Item Modal/View',
    component: CartItemModalView,
    tags: ['autodocs'],
    args: {
        open: false,
        dialogTitle: 'Quick Add',
        isLoading: false,
        hasError: false,
        retryLabel: 'Retry',
        loadingLabel: 'Loading product',
        loadErrorLabel: 'Unable to load product',
        mode: 'add',
        currentProduct: null,
        initialQuantity: 1,
        variationValues: {},
        onAttributeChange: () => undefined,
        galleryImages: [],
        isProductASet: false,
        isProductABundle: false,
        onBeforeCartAction: () => undefined,
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
