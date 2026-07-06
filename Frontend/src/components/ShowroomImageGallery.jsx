import React, { useState, useEffect } from 'react';
import './ShowroomImageGallery.css';

export default function ShowroomImageGallery({ images, title }) {
  const [mainIdx, setMainIdx] = useState(0);
  const [loadingError, setLoadingError] = useState({});

  const media = Array.isArray(images) && images.length > 0 ? images : ['/placeholder.png'];
  const mainImage = media[mainIdx] || '/placeholder.png';

  const handlePrevious = () => {
    setMainIdx((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setMainIdx((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media.length]);

  const handleImageError = (idx) => {
    setLoadingError((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="showroom-image-gallery">
      <div className="gallery-main">
        {loadingError[mainIdx] ? (
          <div className="gallery-error">Image not available</div>
        ) : (
          <>
            <img
              src={mainImage}
              alt={`${title} - View ${mainIdx + 1}`}
              className="main-image"
              onError={() => handleImageError(mainIdx)}
            />
            {media.length > 1 && (
              <>
                <button
                  className="gallery-nav gallery-nav--prev"
                  onClick={handlePrevious}
                  aria-label="Previous image"
                  title="Previous (← arrow key)"
                >
                  ❮
                </button>
                <button
                  className="gallery-nav gallery-nav--next"
                  onClick={handleNext}
                  aria-label="Next image"
                  title="Next (→ arrow key)"
                >
                  ❯
                </button>
                <div className="gallery-counter">
                  {mainIdx + 1} / {media.length}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="gallery-thumbnails">
          {media.map((img, idx) => (
            <button
              key={idx}
              className={`thumbnail-btn ${idx === mainIdx ? 'active' : ''}`}
              onClick={() => setMainIdx(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={idx === mainIdx}
              title={`Image ${idx + 1}`}
            >
              <img
                src={img}
                alt={`${title} thumbnail ${idx + 1}`}
                className="thumbnail-img"
                onError={() => handleImageError(idx)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
