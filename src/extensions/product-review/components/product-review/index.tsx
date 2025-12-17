import React from 'react';
import RatingStars from '@/extensions/product-review/components/rating-stars';

type ProductReviewProps = {
  rating: number; // rating value from 0 to 5
  title: string; // title of the review
  date: string; // date of the review
  reviewText: string; // text of the review
};

const ProductReview: React.FC<ProductReviewProps> = ({ rating = 4.3, title = 'Review Title', date = '2025-01-01', reviewText = 'This is a review' }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 'bold', margin: 0, marginRight: 12 }}>{title}</h3>
        <RatingStars ratings={rating} />
      </div>
      <p style={{ marginBottom: 12, color: '#555', fontSize: 14 }}>{date}</p>
      <div style={{ marginTop: 12, color: '#222', fontSize: 16, lineHeight: 1.5 }}>
        {reviewText}
      </div>
    </div>
  );
};

export default ProductReview;
