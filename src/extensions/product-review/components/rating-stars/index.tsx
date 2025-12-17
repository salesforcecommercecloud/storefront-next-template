import React from 'react';

type RatingStarsProps = {
  ratings: number; // from 0 to 5
};

const MAX_STARS = 5;

const Star = ({ filled }: { filled: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? "#FFD700" : "none"}
    stroke="#FFD700"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: 2 }}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    {!filled && (
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill="none"
      />
    )}
  </svg>
);

const RatingStars: React.FC<RatingStarsProps> = ({ ratings }) => {
  // Allow ratings like 3.5, round to nearest half if you want half-stars in future
  // For now, we'll fill stars if their index < ratings (rounded down)
  const filledStars = Math.floor(ratings);
  const starsArray = Array.from({ length: MAX_STARS }, (_, i) => i);

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {starsArray.map((idx) => (
        <Star key={idx} filled={idx < filledStars} />
      ))}
      <span style={{ marginLeft: 8, color: '#555' }}>{ratings.toFixed(1)} / {MAX_STARS}</span>
    </div>
  );
};

export default RatingStars;
