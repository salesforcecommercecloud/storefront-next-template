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
import type { ProductContentAdapter } from '@/lib/adapters/product-content-types';
import type {
    BuyNowPayLaterLearnMoreData,
    BuyNowPayLaterMessageData,
    CareInstructionsData,
    EstimatedDeliveryData,
    IngredientsData,
    ProductDescriptionData,
    ReturnsAndWarrantyData,
    ReviewsData,
    SizeGuideData,
    TechSpecsData,
    UsageInstructionsData,
    WriteReviewFormData,
} from '@/lib/adapters/product-content-data-types';

/**
 * Mock size guide data for PDP Size Guide modal.
 * Matches the Size Guide UI: conversion chart, how to measure, and size tips.
 */
const MOCK_SIZE_GUIDE_DATA: SizeGuideData = {
    title: 'Size Guide',
    subtitle: 'Find your perfect fit',
    chart: {
        columns: ['Size', 'US', 'EU', 'UK', 'CM'],
        rows: [
            { size: 'XS', us: 4, eu: 34, uk: 6, cm: 22 },
            { size: 'S', us: 6, eu: 36, uk: 8, cm: 23 },
            { size: 'M', us: 8, eu: 38, uk: 10, cm: 24 },
            { size: 'L', us: 10, eu: 40, uk: 12, cm: 25 },
            { size: 'XL', us: 12, eu: 42, uk: 14, cm: 26 },
        ],
    },
    howToMeasure: [
        {
            step: 1,
            heading: 'Measure Your Body',
            body: 'Use a flexible measuring tape to measure around the fullest part of your body where the garment will sit.',
        },
        {
            step: 2,
            heading: 'Check the Chart',
            body: 'Compare your measurements to our size chart above to find your perfect size match.',
        },
        {
            step: 3,
            heading: 'Consider Fit Preference',
            body: 'If you prefer a looser fit, consider sizing up. For a tighter fit, consider sizing down.',
        },
    ],
    sizeTips: {
        title: 'Size Tips',
        tips: [
            'Measurements are in centimeters (CM)',
            'Sizes may vary slightly between different products',
            "If you're between sizes, we recommend sizing up",
            'For questions about fit, contact our customer service team',
        ],
    },
};

/**
 * Mock returns & warranty data for PDP Returns & Warranty modal.
 * Matches the UI: 30-day returns, 1-year warranty, exchanges, need help.
 */
const MOCK_RETURNS_AND_WARRANTY_DATA: ReturnsAndWarrantyData = {
    title: 'Returns & Warranty',
    returnsPolicy: {
        heading: '30-Day Returns Policy',
        intro: "We want you to love your purchase. If you're not completely satisfied, you can return most items within 30 days of delivery for a full refund or exchange.",
        conditions: [
            'Items must be in original, unworn condition',
            'Original tags and packaging must be included',
            'Items must not show signs of use or damage',
            'Proof of purchase required',
        ],
        howToReturn: [
            'Log into your account and go to Order History',
            'Select the item(s) you wish to return',
            'Print the prepaid return label',
            'Package the item(s) securely and attach the label',
            'Drop off at any authorized carrier location',
        ],
        note: 'Return shipping costs are the responsibility of the customer unless the item is defective or incorrect.',
    },
    warranty: {
        heading: '1-Year Warranty',
        intro: "All products come with a comprehensive 1-year manufacturer's warranty covering defects in materials and workmanship.",
        whatsCovered: [
            'Manufacturing defects',
            'Material defects',
            'Workmanship issues',
            'Premature wear under normal use',
        ],
        whatsNotCovered: [
            'Normal wear and tear',
            'Damage from misuse or accidents',
            'Damage from improper care or cleaning',
            'Modifications or alterations',
        ],
        claimsProcess:
            "To file a warranty claim, contact our customer service team with your order number, photos of the defect, and a description of the issue. We'll review your claim and provide a resolution within 5-7 business days.",
    },
    exchanges: {
        heading: 'Exchanges',
        intro: 'Need a different size or color? We offer hassle-free exchanges within 30 days of purchase. Exchanges are subject to product availability.',
        process:
            "Follow the same return process and specify that you'd like an exchange. We'll process your exchange once we receive your original item.",
    },
    needHelp: {
        intro: 'Our customer service team is here to assist you.',
        email: 'support@marketstreet.com',
        phone: '1-800-123-4567',
    },
};

/**
 * Mock BNPL message for PDP inline display.
 * Pay in 4 interest-free payments of $12.25 with BNPL (no PayPal branding).
 */
const MOCK_BNPL_MESSAGE_DATA: BuyNowPayLaterMessageData = {
    paymentCount: 4,
    amountPerPayment: 12.25,
    providerLabel: 'BNPL',
    learnMoreLabel: 'Learn more',
};

/**
 * Mock BNPL learn more modal content.
 * Uses BNPL (not PayPal) in copy throughout.
 */
const MOCK_BNPL_LEARN_MORE_DATA: BuyNowPayLaterLearnMoreData = {
    title: 'Pay in 4 interest-free payments',
    summary: 'Split your purchase of $49.00 into 4 with no impact on credit score and no late fees.',
    paymentSchedule: {
        amountPerPayment: 12.25,
        totalAmount: 49,
        schedule: ['Today', '2 weeks', '4 weeks', '6 weeks'],
    },
    howItWorks: [
        'Choose BNPL at checkout to pay later with Pay in 4.',
        'Complete your purchase with a 25% down payment.',
        "Use autopay for the rest of your payments. It's easy!",
    ],
    disclosures:
        'Pay in 4 is available to consumers upon approval for purchases of $30 to $1,500. Pay in 4 is currently not available to residents of MO. Offer availability depends on the merchant and also may not be available for certain recurring, subscription services. When applying, a soft credit check may be needed, but will not affect your credit score. You must be 18 years old or older to apply.',
    disclosureLinks: [
        { label: 'Find more disclosures related to Pay in 4' },
        { label: 'See other ways to pay over time' },
    ],
};

/**
 * Mock estimated delivery / Fulfillment & Shipping modal data.
 */
const MOCK_ESTIMATED_DELIVERY_DATA: EstimatedDeliveryData = {
    title: 'Fulfillment & Shipping',
    estimatedDelivery: {
        options: [
            { name: 'Standard Shipping', deliveryTime: '5-7 business days' },
            { name: 'Express Shipping', deliveryTime: '2-3 business days' },
            { name: 'Overnight Shipping', deliveryTime: 'Next business day' },
        ],
        note: 'Delivery estimates are calculated from the date your order ships. Processing time is typically 1-2 business days.',
    },
    shippingOptions: [
        {
            name: 'Standard Shipping',
            deliveryTime: '5-7 business days',
            cost: 5.99,
            condition: 'Free on orders over $50',
        },
        {
            name: 'Express Shipping',
            deliveryTime: '2-3 business days',
            cost: 12.99,
            condition: 'Free on orders over $100',
        },
        {
            name: 'Overnight Shipping',
            deliveryTime: 'Next business day',
            cost: 24.99,
            condition: 'Orders placed before 2 PM EST',
        },
    ],
    internationalShipping: {
        heading: 'International Shipping',
        points: [
            'We ship to over 50 countries worldwide.',
            'International shipping rates and delivery times vary by destination.',
            'International orders may be subject to customs fees and import duties, which are the responsibility of the customer.',
            'Proceed to checkout and enter your shipping address for specific international shipping rates.',
        ],
    },
    orderTracking: {
        heading: 'Order Tracking',
        points: [
            'Once your order ships, you will receive a confirmation email with tracking information.',
            'You can track your order in real-time through our website or mobile app.',
            'If you have questions about your shipment or delivery, please contact our customer service team.',
        ],
    },
};

/**
 * Mock product description (Description section: intro + bulleted features).
 */
const MOCK_PRODUCT_DESCRIPTION_DATA: ProductDescriptionData = {
    heading: 'Description',
    intro: 'Crafted from premium leather with a modern twist on the classic contrast boot silhouette. These ankle boots feature a sleek profile with functional lace-up closure and side zip for easy wear. Perfect for both casual and elevated looks.',
    features: [
        'Premium full-grain leather upper',
        'Cushioned leather insole',
        'Durable rubber outsole',
        'Lace-up front',
        '1.5" heel height',
    ],
};

/**
 * Mock ingredients & materials (Ingredients & Materials collapsible section).
 */
const MOCK_INGREDIENTS_DATA: IngredientsData = {
    heading: 'Ingredients & Materials',
    items: [
        'Premium full-grain leather upper',
        'Cushioned leather insole',
        'Durable rubber outsole',
        'Metal hardware accents',
    ],
};

/**
 * Mock usage instructions (Usage Instructions collapsible section).
 */
const MOCK_USAGE_INSTRUCTIONS_DATA: UsageInstructionsData = {
    heading: 'Usage Instructions',
    content:
        'For best results, condition leather regularly with a quality leather conditioner. Avoid prolonged exposure to water and direct sunlight.',
};

/**
 * Mock care instructions (Care Instructions collapsible section).
 */
const MOCK_CARE_INSTRUCTIONS_DATA: CareInstructionsData = {
    heading: 'Care Instructions',
    items: [
        'Clean with a soft, dry cloth',
        'Use leather conditioner monthly',
        'Store in a cool, dry place',
        'Use shoe trees to maintain shape',
    ],
};

/**
 * Mock tech specs (Technical Specs collapsible section).
 */
const MOCK_TECH_SPECS_DATA: TechSpecsData = {
    heading: 'Technical Specs',
    specs: [
        { key: 'Heel Height', value: '1.5 inches' },
        { key: 'Material', value: 'Full-grain leather' },
        { key: 'Sole', value: 'Rubber' },
        { key: 'Closure', value: 'Lace-up with side zip' },
    ],
};

/**
 * Mock customer reviews (Customer Reviews section for PDP).
 * Matches screenshot: 2 reviews (Name A., Sarah M.) with summary and distribution.
 */
const MOCK_REVIEWS_DATA: ReviewsData = {
    heading: 'Customer Reviews',
    subtitle: '2 reviews for Pure Cube',
    writeReviewButtonLabel: 'Write a Review',
    summary: {
        averageRating: 4.5,
        totalCount: 2,
        basedOnLabel: 'Based on 2 reviews',
        distribution: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 1,
            fiveStars: 1,
        },
    },
    searchPlaceholder: 'Search reviews...',
    sortOptions: ['Most Recent', 'Highest Rating', 'Lowest Rating', 'Most Helpful'],
    defaultSort: 'Most Recent',
    reviews: [
        {
            id: 'review-1',
            authorName: 'Name A.',
            verifiedPurchase: true,
            date: 'June 2022',
            rating: 5,
            headline: 'Excellent quality',
            body: 'Absolutely love this product! The quality is outstanding and it looks even better in person. Highly recommend to anyone looking for premium design.',
            helpfulCount: 24,
            reportLabel: 'Report',
        },
        {
            id: 'review-2',
            authorName: 'Sarah M.',
            verifiedPurchase: true,
            date: 'May 2022',
            rating: 4,
            headline: 'Great design',
            body: 'Beautiful geometric form that fits perfectly in my living space. The craftsmanship is impeccable. Only giving 4 stars because shipping took a bit longer than expected.',
            helpfulCount: 18,
            reportLabel: 'Report',
        },
    ],
};

/**
 * Mock Write a Review form config (submit review modal).
 * No name or email fields.
 */
const MOCK_WRITE_REVIEW_FORM_DATA: WriteReviewFormData = {
    title: 'Write a Review',
    overallRating: {
        label: 'Overall Rating',
        required: true,
        placeholder: 'Select a rating',
    },
    reviewTitle: {
        label: 'Review Title',
        placeholder: 'Summarize your experience',
    },
    reviewBody: {
        label: 'Your Review',
        placeholder: 'What did you like or dislike about this product?',
        minCharacters: 50,
    },
    recommend: {
        label: 'Would you recommend this product?',
        yesLabel: 'Yes',
        noLabel: 'No',
    },
    addPhotos: {
        label: 'Add Photos (Optional)',
        hint: 'Click to upload or drag and drop',
        accept: 'PNG, JPG',
        maxSize: '5MB',
    },
    termsText: 'By submitting this review, you agree to our Terms of Service and Privacy Policy.',
    cancelLabel: 'Cancel',
    submitLabel: 'Submit Review',
};

export interface ProductContentMockAdapterConfig {
    /** Whether the adapter is enabled */
    enabled: boolean;
    /** Simulated delay in ms for async methods (default: 0) */
    mockDelay?: number;
}

/**
 * Simulates network delay for mock API calls
 */
const simulateDelay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a mock Product Content adapter for development.
 *
 * Implements all ProductContentAdapter methods with mock data so PDP modals
 * (Size Guide, Returns & Warranty, BNPL, Estimated Delivery, collapsible content,
 * Shipping Estimates) can be developed and tested. Customers can create
 * implementations with any subset of methods.
 *
 * @param config - Config (enabled, optional mockDelay)
 */
export function createProductContentMockAdapter(config: ProductContentMockAdapterConfig): ProductContentAdapter {
    const mockDelay = config.mockDelay ?? 0;

    return {
        // Could vary data based on productId if provided (e.g. product-specific size charts)
        getSizeGuide: async (_productId?: string): Promise<SizeGuideData> => {
            await simulateDelay(mockDelay);
            return MOCK_SIZE_GUIDE_DATA;
        },
        getReturnsAndWarranty: async (_productId?: string): Promise<ReturnsAndWarrantyData> => {
            await simulateDelay(mockDelay);
            return MOCK_RETURNS_AND_WARRANTY_DATA;
        },
        getBuyNowPayLaterMessageContent: async (_productId?: string): Promise<BuyNowPayLaterMessageData> => {
            await simulateDelay(mockDelay);
            return MOCK_BNPL_MESSAGE_DATA;
        },
        getBuyNowPayLaterLearnMoreContent: async (_productId?: string): Promise<BuyNowPayLaterLearnMoreData> => {
            await simulateDelay(mockDelay);
            return MOCK_BNPL_LEARN_MORE_DATA;
        },
        getEstimatedDelivery: async (_productId?: string): Promise<EstimatedDeliveryData> => {
            await simulateDelay(mockDelay);
            return MOCK_ESTIMATED_DELIVERY_DATA;
        },
        getProductDescription: async (_productId?: string): Promise<ProductDescriptionData> => {
            await simulateDelay(mockDelay);
            return MOCK_PRODUCT_DESCRIPTION_DATA;
        },
        getIngredientsData: async (_productId?: string): Promise<IngredientsData> => {
            await simulateDelay(mockDelay);
            return MOCK_INGREDIENTS_DATA;
        },
        getUsageInstructions: async (_productId?: string): Promise<UsageInstructionsData> => {
            await simulateDelay(mockDelay);
            return MOCK_USAGE_INSTRUCTIONS_DATA;
        },
        getCareInstructions: async (_productId?: string): Promise<CareInstructionsData> => {
            await simulateDelay(mockDelay);
            return MOCK_CARE_INSTRUCTIONS_DATA;
        },
        getTechSpecs: async (_productId?: string): Promise<TechSpecsData> => {
            await simulateDelay(mockDelay);
            return MOCK_TECH_SPECS_DATA;
        },
        getReviews: async (_productId?: string): Promise<ReviewsData> => {
            await simulateDelay(mockDelay);
            return MOCK_REVIEWS_DATA;
        },
        getWriteReviewForm: async (_productId?: string): Promise<WriteReviewFormData> => {
            await simulateDelay(mockDelay);
            return MOCK_WRITE_REVIEW_FORM_DATA;
        },
    };
}
