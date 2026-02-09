// src/dynamic-app/components/navigation.jsx
import React, { useState, useEffect } from 'react';
import fetchGallery from '../lib/fetchGallery';
import { useStyleInjection } from '../../state/providers/style-injector'; 
import navCss from '../../styles/dynamic-app/navigation.css?raw';

const Navigation = ({ activeColor, customArrowIcon, customArrowIcon2, isInShadow = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasShownScrollHint, setHasShownScrollHint] = useState(false);

  useStyleInjection(navCss, 'dynamic-app-style-nav');

  const toggleMenu = () => {
    if (isInShadow) return; // no nav in shadow mock
    setIsOpen((prev) => !prev);
  };
  const handleCloseMenu = () => setIsOpen(false);

  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    // Always visible if near the top
    if (currentScrollY <= 5) {
      setIsScrollingUp(true);
    } else {
      setIsScrollingUp(currentScrollY < lastScrollY);
    }

    setIsScrolled(currentScrollY > window.innerHeight * 0.1);
    setLastScrollY(currentScrollY);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', isOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const images = await fetchGallery();
        setGalleryImages(images);
      } catch (error) {
        console.error('Error fetching gallery images:', error);
      }
    };
    fetchImages();
  }, []);

  useEffect(() => {
    if (window.innerWidth > 1024) {
      const galleryContainer = document.querySelector('.image-container-g');
      const handleHorizontalScroll = (e) => {
        if (galleryContainer) {
          e.preventDefault();
          galleryContainer.scrollLeft += e.deltaY;
        }
      };
      if (galleryContainer) {
        galleryContainer.addEventListener('wheel', handleHorizontalScroll);
      }
      return () => {
        if (galleryContainer) {
          galleryContainer.removeEventListener('wheel', handleHorizontalScroll);
        }
      };
    }
  }, []);

  useEffect(() => {
    const gallery = document.querySelector('.image-container-g');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    if (!gallery || !scrollIndicator) return;

    const updateScrollIndicator = () => {
      if (window.innerWidth > 1024) {
        const scrollWidth = gallery.scrollWidth - gallery.clientWidth;
        const scrollLeft = gallery.scrollLeft;
        const percentage = scrollWidth > 0 ? Math.max(2, (scrollLeft / scrollWidth) * 100) : 2;
        scrollIndicator.style.setProperty('--progress-dimension', `${percentage}%`);
      } else {
        const scrollHeight = gallery.scrollHeight - gallery.clientHeight;
        const scrollTop = gallery.scrollTop;
        if (scrollHeight > 0) {
          const normalPercentage = 100 - (scrollTop / scrollHeight) * 100;
          const reversedPercentage = Math.min(100, Math.max(2, 100 - normalPercentage));
          scrollIndicator.style.setProperty('--progress-dimension', `${reversedPercentage}%`);
        } else {
          scrollIndicator.style.setProperty('--progress-dimension', '2%');
        }
      }
    };

    updateScrollIndicator();
    gallery.addEventListener('scroll', updateScrollIndicator);

    return () => {
      gallery.removeEventListener('scroll', updateScrollIndicator);
    };
  }, []);

  useEffect(() => {
    if (isOpen && !hasShownScrollHint) {
      setShowScrollHint(true);
      const fadeOutTimeout = setTimeout(() => {
        const hintElement = document.querySelector('.scroll-hint');
        if (hintElement) hintElement.style.opacity = '0';
      }, 3000);
      const removeTimeout = setTimeout(() => {
        setShowScrollHint(false);
        setHasShownScrollHint(true);
      }, 4000);

      return () => {
        clearTimeout(fadeOutTimeout);
        clearTimeout(removeTimeout);
      };
    }
  }, [isOpen, hasShownScrollHint]);

  const hexToRgba = (hex, alpha = 0.1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const adjustBrightness = (hex, multiplier) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.floor(r * multiplier)));
    g = Math.min(255, Math.max(0, Math.floor(g * multiplier)));
    b = Math.min(255, Math.max(0, Math.floor(b * multiplier)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const darkenedColor = adjustBrightness(activeColor, 0.55);
  const edgeColor = adjustBrightness(activeColor, 0.8);

  return (
   <nav className={`navigation ${isScrollingUp ? 'visible' : 'hidden'} ${isInShadow ? 'navigation--shadow' : ''}`}>
      <div
        className={`top-bar-items ${isOpen ? 'menu-open' : ''}`}
        style={{
          background: isOpen
            ? 'transparent'
            : isScrolled
            ? hexToRgba(activeColor, 0.8)
            : 'transparent',
          backdropFilter: isScrolled && !isOpen ? 'blur(5px)' : 'none',
        }}
      >
        <div className="site-title">
          <h-title className="title">
            <a href="/" className="homepage-link">DMI</a>
          </h-title>
        </div>
        <div className="menu-icon" onClick={toggleMenu}>
          <div className={`hamburger ${isOpen ? 'open' : ''}`}></div>
        </div>
      </div>

      <div className={`menu-item ${isOpen ? 'open' : ''}`}>
        <div className="menu-item-1" onClick={handleCloseMenu}></div>
        <div className="menu-item-2" style={{ '--darkenedColor': darkenedColor, '--darkerColor': edgeColor }}>
          <div className="menu-nav">
            <div className="nav-item">
              <a href="/dynamic-theme" className="nav-link">
                <div className="name"><h4>What is DMI?</h4></div>
                {customArrowIcon2 && (
                  <div className="arrow1" dangerouslySetInnerHTML={{ __html: customArrowIcon2 }} />
                )}
              </a>
            </div>
            <div className="nav-item">
              <a href="/dynamic-theme" className="nav-link">
                <h4>Case Studies</h4>
                {customArrowIcon2 && (
                  <div className="arrow1" dangerouslySetInnerHTML={{ __html: customArrowIcon2 }} />
                )}
              </a>
            </div>
          </div>

          <div className="gallery-wrapper">
            <div className="scroll-indicator"></div>
            <div className="gallery-container">
              {showScrollHint && (
                <div className="scroll-hint">
                  <h5>Scroll to explore</h5>
                  <span
                    className="arrow2"
                    dangerouslySetInnerHTML={{ __html: customArrowIcon }}
                  ></span>
                </div>
              )}
              <div className="image-container-g">
                {galleryImages.map((img, index) => (
                  <img
                    key={index}
                    src={img.url}
                    alt={img.alt}
                    draggable="false"
                    className={`gallery-image image-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
