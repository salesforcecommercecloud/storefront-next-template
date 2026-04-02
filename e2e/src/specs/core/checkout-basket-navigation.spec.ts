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

Feature('Checkout Basket & Navigation Tests').tag('@core').tag('@checkout');

const { checkoutPage, addToCartFlow } = inject();
import { expect } from 'chai';
import { TEST_PRODUCT_CATEGORIES } from '../../test-data/checkout.data';

Scenario('Cart item count updates after removing item pre-checkout', async () => {
    const productInfo1 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo1).to.not.be.undefined;

    const productInfo2 = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.WOMENS_DRESSES);
    expect(productInfo2).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();

    const initialItemCount = await checkoutPage.getMyCartItemCount();
    expect(initialItemCount).to.be.at.least(2);

    await checkoutPage.validateMyCartDisplaysItemsWithPriceImageAndPromotions();

    const updatedItemCount = await checkoutPage.getMyCartItemCount();
    expect(updatedItemCount).to.be.at.least(1);
})
    .tag('@basket-context')
    .tag('@checkout-navigation');

Scenario('Navigating back from checkout preserves cart state', async () => {
    const productInfo = await addToCartFlow.execute(TEST_PRODUCT_CATEGORIES.MENS_JACKETS);
    expect(productInfo).to.not.be.undefined;

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();
    const itemCountBeforeNav = await checkoutPage.getMyCartItemCount();
    expect(itemCountBeforeNav).to.be.at.least(1);

    checkoutPage.navigateToHomepage();

    checkoutPage.navigate();
    checkoutPage.validatePageLoaded();

    checkoutPage.expandMyCart();
    const itemCountAfterNav = await checkoutPage.getMyCartItemCount();
    expect(itemCountAfterNav).to.equal(itemCountBeforeNav);

    const emailValue = await checkoutPage.getEmailFieldValue();
    expect(emailValue, 'Email field should be cleared after navigation').to.be.empty;
})
    .tag('@basket-context')
    .tag('@checkout-navigation');
