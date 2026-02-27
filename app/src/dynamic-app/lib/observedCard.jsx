// src/dynamic-app/lib/observedCard.jsx
import React, { useRef } from 'react';
import UIcards from '../components/homepage-UIcards';
import useIntersectionTransform from './shadowObserver';

function ObservedCard({
  data,
  index,
  getShadowRoot,
  pauseAnimation,
  customArrowIcon2,
  imagePriority = false, 
}) {
  const ref = useRef(null);

  useIntersectionTransform(ref, getShadowRoot, pauseAnimation);

  return (
    <div ref={ref} className={`custom-card-${index}`}>
      <UIcards
        title={data.title}
        backgroundColor={data.backgroundColor}
        image1={data.image1}
        image2={data.image2}
        alt1={data.alt1}
        alt2={data.alt2}
        url1={data.url1}
        className={`custom-card-${index}`}
        customArrowIcon2={customArrowIcon2}
        imagePriority={imagePriority} 
      />
    </div>
  );
}

export default ObservedCard;