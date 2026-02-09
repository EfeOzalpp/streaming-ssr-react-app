import React, { useState, useEffect } from 'react';

const ExitButton = ({ onExit }) => {
  const [visible, setVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleClick = () => {
    if (onExit) onExit();
    setIsFadingOut(true);
  };

  useEffect(() => {
    if (isFadingOut) {
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 300); // Match CSS transition duration

      return () => clearTimeout(timeout);
    }
  }, [isFadingOut]);

  if (!visible) return null;

  return (
    <div className="block-g-exit"
      onClick={handleClick}
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.3s ease'
    }} ><h4> Exit </h4> </div>
  );
};

export default ExitButton;
