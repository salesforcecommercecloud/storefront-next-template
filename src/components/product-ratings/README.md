# Product Ratings Components

A collection of components for displaying product ratings and review distributions.

## Components

### StarIcon

Basic star icon component used in ratings displays.

```tsx
import { StarIcon } from '@/components/product-ratings';

<StarIcon opacity={1} filled={true} className="w-4 h-4" />
```

### StarRating

Displays a star rating with customizable labels and review count.

```tsx
import { StarRating } from '@/components/product-ratings';

<StarRating
  rating={4.5}
  reviewCount={123}
  showRatingLabel={true}
  showReviewCountLabel={true}
  starSize="sm"
/>
```

### StarRatingDistribution

Displays a single rating distribution row with star label, icon, percentage bar, and review count.

```tsx
import { StarRatingDistribution } from '@/components/product-ratings';

<StarRatingDistribution
  rating={5}
  reviewCount={120}
  totalReviews={200}
/>
```

**Props:**
- `rating` - Star rating value (1-5)
- `reviewCount` - Number of reviews for this rating
- `totalReviews` - Total number of reviews (for percentage calculation)

**Layout:**
```
[5] ⭐ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] [60%]
    ^  ^  ^                                              ^
    |  |  |                                              |
    |  |  +-- Percentage bar (yellow filled, gray unfilled) 
    |  +-- StarIcon
    +-- Star rating label                    Percentage --+
```

**Styling:**
- Container: `flex items-center gap-2 text-sm`
- Labels: `text-muted-foreground` (semantic token, inherits `text-sm` from container)
- Star icon: `w-4 h-4`
- Percentage bar: `h-2`, uses `bg-rating` (semantic token) for filled portion and `bg-muted-foreground/30` for unfilled
- Percentage bar scales with container width using `flex-1`
- Percentage label: `w-12 tabular-nums` (fixed width for perfect alignment, supports "100%")

**Why percentage instead of review count?**
- ✅ **Perfect alignment**: All percentage labels have the same width ("5%" and "100%" align perfectly)
- ✅ **Consistent bar widths**: All percentage bars (filled + unfilled) have identical total width
- ✅ **Better UX**: Percentage is more meaningful than raw count in this context
- ✅ **Accessible**: Review count is still announced in the aria-label for screen readers

**Accessibility:**
- Focusable with `tabIndex={0}` for keyboard navigation
- Comprehensive `aria-label` announces: rating and percentage
- Visual elements marked with `aria-hidden="true"` to prevent duplication
- Translatable via i18n key: `product:rating.distributionAriaLabel`
- Screen reader announcement: "5 stars: 60 percent of reviews"

### StarRatingDistributions

Stacks rating distributions for all star ratings (5 to 1).

```tsx
import { StarRatingDistributions } from '@/components/product-ratings';

const distributions = [
  { rating: 5, count: 120 },
  { rating: 4, count: 50 },
  { rating: 3, count: 20 },
  { rating: 2, count: 8 },
  { rating: 1, count: 2 },
];

<StarRatingDistributions distributions={distributions} />
```

**Props:**
- `distributions` - Array of rating distribution data with `rating` (1-5) and `count` properties

**Features:**
- Automatically displays all ratings from 5 to 1
- Missing ratings are shown with 0 count
- Calculates percentages automatically based on total reviews
- Stacks distributions with `gap-1.5`

**Accessibility:**
- Uses `role="group"` for semantic grouping
- Group labeled with `aria-label` including total review count
- Each child distribution is individually focusable
- Tab key navigation through all rating levels
- Translatable via i18n key: `product:rating.distributionsAriaLabel`
- Screen reader announcement on focus: "Star rating distribution, 200 total reviews"

## Complete Example

```tsx
import {
  StarRating,
  StarRatingDistributions,
  type RatingDistributionData
} from '@/components/product-ratings';

export function ProductReviews() {
  const distributions: RatingDistributionData[] = [
    { rating: 5, count: 120 },
    { rating: 4, count: 50 },
    { rating: 3, count: 20 },
    { rating: 2, count: 8 },
    { rating: 1, count: 2 },
  ];

  const totalReviews = distributions.reduce((sum, d) => sum + d.count, 0);
  const averageRating = distributions.reduce(
    (sum, d) => sum + d.rating * d.count,
    0
  ) / totalReviews;

  return (
    <div className="space-y-4">
      {/* Overall rating */}
      <StarRating
        rating={averageRating}
        reviewCount={totalReviews}
        showRatingLabel={true}
        showReviewCountLabel={true}
        starSize="lg"
      />

      {/* Rating distribution */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3">Rating Distribution</h3>
        <StarRatingDistributions distributions={distributions} />
      </div>
    </div>
  );
}
```

## Storybook

View component examples and documentation:

```bash
pnpm storybook
```

Navigate to:
- Components/Product Ratings/Star Rating Distribution
- Components/Product Ratings/Star Rating Distributions

**Available Stories:**
- **StarRatingDistribution**:
  - Default, High/Low Percentage, Zero Reviews
  - Large Review Count (1,234), Very Large (12,345), Extremely Large (123,456)
  - Multiple Distributions, Width Comparisons
- **StarRatingDistributions**:
  - Default, Highly/Poorly Rated, Sparse, Empty
  - Large Review Counts (10,000+), Very Large (100,000+)
  - Width Comparisons

The large review count stories demonstrate the `min-w-8` flexibility for handling enterprise-scale review volumes.

## Internationalization

The components use translatable accessibility labels from the `product:rating` namespace:

**English (en-US):**
```json
{
  "product": {
    "rating": {
      "distributionAriaLabel": "{{rating}} stars: {{percentage}} percent of reviews",
      "distributionsAriaLabel": "Star rating distribution, {{total}} total reviews"
    }
  }
}
```

**Italian (it-IT):**
```json
{
  "product": {
    "rating": {
      "distributionAriaLabel": "{{rating}} stelle: {{percentage}} percento delle recensioni",
      "distributionsAriaLabel": "Distribuzione delle valutazioni in stelle, {{total}} recensioni totali"
    }
  }
}
```

## Percentage Calculation

Percentages are calculated dynamically from review counts:

```typescript
const percentage = totalReviews > 0 ? (reviewCount / totalReviews) * 100 : 0;
```

**Rounding:**
- **Visual display**: Uses exact percentage value for accurate bar width
- **Screen reader**: Rounds to 0 decimals using `toFixed(0)` for cleaner announcements
- Example: 45.7% displays as 45.7% wide bar, announced as "46 percent"

**Precision:**
- Percentages may not sum to exactly 100% due to rounding
- This is acceptable per industry standards (e.g., Nielsen, Pew Research)
- Visual accuracy is prioritized over mathematical precision
- Small discrepancies (±1%) are normal and expected

## Testing

Run tests:

```bash
# Unit tests
pnpm test src/components/product-ratings/star-rating-distribution.test.tsx
pnpm test src/components/product-ratings/star-rating-distributions.test.tsx

# All product-ratings tests
pnpm test src/components/product-ratings/
```

## Accessibility Testing

These components follow WCAG 2.2 guidelines and industry best practices:

- ✅ Keyboard navigation (Tab key to move between distributions)
- ✅ Screen reader support with descriptive aria-labels
- ✅ Focus indicators for keyboard users
- ✅ Semantic HTML with proper ARIA roles
- ✅ Translatable accessibility labels

**Screen Reader Behavior:**
1. When focusing on the wrapper: "Star rating distribution, 200 total reviews, group"
2. When focusing on a distribution: "5 stars: 60 percent of reviews"
3. Tab through each rating level (5 to 1) for complete breakdown
4. Total review count announced once at the wrapper level (avoids repetition)

## Color System

The components use semantic design tokens for consistent theming:

**Semantic Tokens:**
- **Labels**: `text-muted-foreground` - Secondary text that adapts to light/dark theme
- **Unfilled elements**: `bg-muted-foreground/30` - Muted background with 30% opacity
- **Rating indicator**: `text-rating` / `bg-rating` - Yellow color (#FACC15) specifically for star ratings

**Rating Token Definition:**
The `--rating` token is defined in `app.css`:
```css
/* Light mode */
--rating: #facc15; /* yellow-400 */
--rating-foreground: #ffffff;

/* Dark mode */
--rating: #facc15; /* same yellow-400 for consistency */
--rating-foreground: #18181b;
```

**Why a dedicated `--rating` token?**
- ✅ **Semantic meaning**: Clearly indicates rating/quality indicators in the design system
- ✅ **Single source of truth**: Both `StarIcon` and percentage bars use the same token
- ✅ **Theme consistency**: Can be adjusted across the entire app from one location
- ✅ **Universal convention**: Yellow universally represents star ratings across platforms
- ✅ **Future flexibility**: Easy to adjust if brand guidelines change

The rating color remains consistent across light/dark modes because yellow (#FACC15) has good contrast in both contexts.
