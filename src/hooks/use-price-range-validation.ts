export function usePriceRangeValidation(
    minPrice: string,
    maxPrice: string,
    minAllowed?: number,
    maxAllowed?: number
): { minHasError: boolean; maxHasError: boolean } {
    const parsedMin = parseFloat(minPrice);
    const parsedMax = parseFloat(maxPrice);
    const minNum = isNaN(parsedMin) ? 0 : parsedMin;
    const maxNum = isNaN(parsedMax) ? Infinity : parsedMax;

    // Check if min > max
    const invalidRange = Boolean(minPrice && maxPrice && minNum > maxNum);

    // Check if min is too high
    const minTooHigh = Boolean(minPrice && maxAllowed && minNum > maxAllowed);

    // Check if max is too low
    const maxTooLow = Boolean(maxPrice && minAllowed && maxNum < minAllowed);

    const minHasError = invalidRange || minTooHigh;
    const maxHasError = invalidRange || maxTooLow;

    return { minHasError, maxHasError };
}
