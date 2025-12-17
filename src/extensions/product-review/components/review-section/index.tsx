import React from 'react';
import ProductReview from '@/extensions/product-review/components/product-review';

type Review = {
  rating: number;
  title: string;
  date: string;
  reviewText: string;
};

type ReviewSectionProps = {
  reviews: Review[];
};

const mockReviews: Review[] = [
  {
    rating: 4.8,
    title: 'Exceeded Expectations',
    date: '2024-05-16',
    reviewText: 'I was a bit hesitant at first, but this product is even better than described! The quality is top notch, and shipping was quick. Highly recommend.',
  },
  {
    rating: 3.7,
    title: 'Good, but could be improved',
    date: '2024-03-04',
    reviewText: 'Functionality is as advertised, but I wish the instructions were clearer. Also, the packaging could be more eco-friendly.',
  },
  {
    rating: 5.0,
    title: 'Perfect for my needs!',
    date: '2024-06-10',
    reviewText: 'Absolutely love it! This is exactly what I was looking for. The material feels premium and the design is sleek.',
  },
  {
    rating: 2.5,
    title: 'Not what I expected',
    date: '2024-04-22',
    reviewText: 'Unfortunately, this didn\'t work as well as I hoped. Customer service was responsive though and issued a refund promptly.',
  },
  {
    rating: 4.1,
    title: 'Solid purchase overall',
    date: '2024-05-01',
    reviewText: 'Works as described with just a few minor issues. Would purchase again for the price.',
  },
];

const ReviewSection: React.FC<ReviewSectionProps> = ({ reviews = mockReviews }) => {
  return (
    <section id="product-reviews">
      <a id="product-reviews-anchor" tabIndex={-1} aria-hidden="true"></a>
      <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl" style={{ marginBottom: 24, textAlign: 'center' }}>
        Product Reviews
      </h2>
      {reviews && reviews.length > 0 ? (    
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          style={{ width: "60vw", margin: "0 auto" }}
        >
          {reviews.map((review, idx) => (
            <ProductReview
              key={idx}
              rating={review.rating}
              title={review.title}
              date={review.date}
              reviewText={review.reviewText}
            />
          ))}
        </div>
      ) : (
        <div style={{ color: '#888', fontSize: 16 }}>No reviews yet.</div>
      )}
    </section>
  );
};

export default ReviewSection;
