import React from 'react';
import RatingStars from '@/extensions/product-review/components/rating-stars';

type ProductRatingsProps = {
  ratings: number; // Average rating, e.g., 4.3
  totalCount: number; // Total number of reviews
};

const ProductRatings: React.FC<ProductRatingsProps> = ({ ratings = 4.3, totalCount = 201}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <RatingStars ratings={ratings} />
      <a
        href="#product-reviews-anchor"
        style={{
          marginLeft: 12,
          color: '#777',
          fontSize: '1rem',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        ({totalCount} review{totalCount === 1 ? '' : 's'})
      </a>
    </div>
  );
};

export default ProductRatings;
