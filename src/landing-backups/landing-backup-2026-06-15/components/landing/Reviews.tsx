'use client';

interface Review {
  name: string;
  role: string;
  text: string;
  rating: number;
}

const reviews: Review[] = [
  {
    name: 'Sofia Martinez',
    role: 'Literature Student',
    text: 'Finally, I can read books in their original language without struggling. The translations maintain the poetic beauty that gets lost in traditional translations.',
    rating: 5,
  },
  {
    name: 'Marco Rossi',
    role: 'Book Enthusiast',
    text: 'I\'m learning Italian and this app is incredible. I can read contemporary novels at my pace, with instant translations helping me understand context.',
    rating: 5,
  },
  {
    name: 'Yuki Tanaka',
    role: 'Reader',
    text: 'The synchronization across devices is seamless. Start reading on my phone during commute, continue on tablet at home. Perfect experience.',
    rating: 5,
  },
  {
    name: 'Emma Thompson',
    role: 'Book Club Organizer',
    text: 'Our international book club finally found the perfect solution. We can all read the same books in our native languages simultaneously.',
    rating: 5,
  },
  {
    name: 'Ahmed Al-Mansouri',
    role: 'Researcher',
    text: 'Access to academic literature in Arabic without compromising the original meaning. This changes everything for my research workflow.',
    rating: 5,
  },
  {
    name: 'Lucia Verdi',
    role: 'Avid Reader',
    text: 'The offline reading feature is game-changing. I can read during flights without worrying about internet. Quality never suffers.',
    rating: 5,
  },
];

export function Reviews() {

  return (
    <section className="reviews-section" style={{ padding: '120px 0', background: 'var(--ink)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '60px', textAlign: 'center' }}>
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: '#C4826E',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}
        >
          What Users Say
        </span>
        <h2
          className="reviews-heading"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--parchment)',
            marginBottom: '24px',
          }}
        >
          Loved by Readers Worldwide
        </h2>
      </div>
      </div>

      {/* Scrolling container */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
        }}
      >
        <div
          className="reviews-track"
          style={{
            display: 'flex',
            gap: '32px',
            animation: 'scroll 60s linear infinite',
            width: 'max-content',
          }}
        >
          {/* First set */}
          {reviews.map((review, index) => (
            <div
              key={`first-${index}`}
              className="review-card"
              style={{
                width: '380px',
                flexShrink: 0,
                padding: '32px',
                backgroundColor: '#212D27',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array(review.rating)
                  .fill(null)
                  .map((_, i) => (
                    <span key={i} style={{ fontSize: '16px', color: '#D4A574' }}>
                      ★
                    </span>
                  ))}
              </div>

              {/* Text */}
              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'var(--parchment)',
                  margin: 0,
                  flex: 1,
                }}
              >
                &quot;{review.text}&quot;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(178,80,50,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#C4826E',
                  }}
                >
                  {review.name[0]}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--parchment)',
                      fontSize: '16px',
                    }}
                  >
                    {review.name}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: 'rgba(247, 245, 242, 0.5)',
                    }}
                  >
                    {review.role}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Second set (duplicate for seamless loop) */}
          {reviews.map((review, index) => (
            <div
              key={`second-${index}`}
              className="review-card"
              style={{
                width: '380px',
                flexShrink: 0,
                padding: '32px',
                backgroundColor: '#212D27',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array(review.rating)
                  .fill(null)
                  .map((_, i) => (
                    <span key={i} style={{ fontSize: '16px', color: '#D4A574' }}>
                      ★
                    </span>
                  ))}
              </div>

              {/* Text */}
              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'var(--parchment)',
                  margin: 0,
                  flex: 1,
                }}
              >
                &quot;{review.text}&quot;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(178,80,50,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#C4826E',
                  }}
                >
                  {review.name[0]}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--parchment)',
                      fontSize: '16px',
                    }}
                  >
                    {review.name}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: 'rgba(247, 245, 242, 0.5)',
                    }}
                  >
                    {review.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gradient fade overlay */}
        <div
          className="reviews-gradient"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            background: `linear-gradient(to right,
              var(--ink) 0%,
              transparent 100px,
              transparent calc(100% - 100px),
              var(--ink) 100%)`,
          }}
        />
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-380px * ${reviews.length} - 32px * ${reviews.length}));
          }
        }

        /* Tablet: 640px - 1023px */
        @media (min-width: 640px) and (max-width: 1023px) {
          .reviews-section {
            padding: 90px 0 !important;
          }
          .reviews-heading {
            font-size: 36px !important;
          }
          .review-card {
            width: 320px !important;
            padding: 28px !important;
          }
          .reviews-track {
            animation-duration: 50s !important;
          }
          .reviews-gradient {
            background: linear-gradient(to right,
              var(--ink) 0%,
              transparent 60px,
              transparent calc(100% - 60px),
              var(--ink) 100%) !important;
          }
        }

        /* Mobile: <640px */
        @media (max-width: 639px) {
          .reviews-section {
            padding: 60px 0 !important;
          }
          .reviews-heading {
            font-size: 28px !important;
          }
          .review-card {
            width: 280px !important;
            padding: 24px !important;
          }
          .reviews-track {
            animation-duration: 40s !important;
            gap: 20px !important;
          }
          .reviews-gradient {
            background: linear-gradient(to right,
              var(--ink) 0%,
              transparent 40px,
              transparent calc(100% - 40px),
              var(--ink) 100%) !important;
          }
        }
      `}</style>
    </section>
  );
}
