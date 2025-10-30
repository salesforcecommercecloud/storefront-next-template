/**
 * Checkout types for component usage
 */
export type CheckoutActionData = {
    success?: boolean;
    step?: string;
    data?: Record<string, unknown>;
    fieldErrors?: Record<string, string>;
    formError?: string;
};
