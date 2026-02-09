// src/dynamic-app/components/sortBy.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getPreloadedDynamicApp, ensureImagesPreload } from '../preload-dynamic-app';
import { useStyleInjection } from '../../state/providers/style-injector';
import sortByCss from '../../styles/dynamic-app/sortByStyles.css?raw';

const options = [
  { value: 'random',   label: 'Randomized' },
  { value: 'titleAsc', label: 'A to Z' },
  { value: 'titleDesc',label: 'Z to A' },
];

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function localSort(data, mode) {
  if (!Array.isArray(data)) return [];
  switch (mode) {
    case 'titleAsc':
      return [...data].sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
    case 'titleDesc':
      return [...data].sort((a, b) => (b?.title || '').localeCompare(a?.title || ''));
    case 'random':
    default:
      return shuffleArray(data);
  }
}

function SortBy({
  onFetchItems,
  customArrowIcon,
  colorMapping,
  getRoot = () => document,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('random');

  // force re-shuffle even when already on "random"
  const [randomTick, setRandomTick] = useState(0);

  const [baseItems, setBaseItems] = useState([]);
  const [items, setItems] = useState([]);

  const dropdownRef = useRef(null);

  // inject CSS into shadow root (or document)
  useStyleInjection(sortByCss, 'dynamic-app-style-sortby');

  const handleOptionClick = (value) => {
    setSelectedValue(value);
    if (value === 'random') setRandomTick(t => t + 1); // re-shuffle on every click
    setIsOpen(false);
  };

  const handleClickOutside = (e) => {
    const root = typeof getRoot === 'function' ? getRoot() : document;
    const pauseButton = root.querySelector?.('.lottie-container');
    const target = e.target;
    if (
      dropdownRef.current &&
      target &&
      !dropdownRef.current.contains(target) &&
      (!pauseButton || !pauseButton.contains(target))
    ) {
      setIsOpen(false);
    }
  };

  // click-outside listener bound to the same root as the UI
  useEffect(() => {
    const root = typeof getRoot === 'function' ? getRoot() : document;
    root.addEventListener?.('mousedown', handleClickOutside);
    return () => root.removeEventListener?.('mousedown', handleClickOutside);
  }, [getRoot]);

  // 1) Get images from preload cache (or ensure preload if empty)
  useEffect(() => {
    let cancelled = false;
    const cached = getPreloadedDynamicApp();

    if (cached.images?.length) {
      if (!cancelled) setBaseItems(cached.images);
    } else {
      ensureImagesPreload()
        .then((images) => { if (!cancelled) setBaseItems(images || []); })
        .catch(() => { if (!cancelled) setBaseItems([]); });
    }

    return () => { cancelled = true; };
  }, []);

   // Some cards next to each other look bad due their colors, so here are some functions to prevent those undesirable lists.
  function constrainedShuffle(
    items,
    {
      getKey = (it) => String(it?.alt1 ?? '').trim(),
      forbiddenPairs = [],
      maxTries = 200,
      distance = 2,
    } = {}
  ) {
    const forbid = new Map();
    for (const [a0, b0] of forbiddenPairs) {
      const a = String(a0).trim();
      const b = String(b0).trim();
      if (!forbid.has(a)) forbid.set(a, new Set());
      if (!forbid.has(b)) forbid.set(b, new Set());
      forbid.get(a).add(b);
      forbid.get(b).add(a);
    }

    function violates(order) {
      for (let i = 0; i < order.length; i++) {
        const ka = getKey(order[i]);
        if (!ka) continue;

        for (let d = 1; d <= distance; d++) {
          const kb = getKey(order[i + d]);
          if (!kb) continue;
          if (forbid.get(ka)?.has(kb)) return true;
        }
      }
      return false;
    }

    for (let t = 0; t < maxTries; t++) {
      const shuffled = shuffleArray(items);
      if (!violates(shuffled)) return shuffled;
    }

    return shuffleArray(items);
  }

  // Derive items whenever base or sort option changes
  useEffect(() => {
    let derived = [];
      if (selectedValue === 'random') {
        derived = constrainedShuffle(baseItems, {
          getKey: (it) => String(it?.alt1 ?? '').trim(),
          forbiddenPairs: [
            ['Javi Ortiz', 'Yiner Xu'],
            ['Janhvi Gokalgandhi', 'Efe Ozalp'],
            ['Jawad Naik', 'Andrew Adamides'],
            ['Harry Liao', 'Jawad Naik'],
            ['Andrew Adamides', 'Harry Liao']
        ],
          maxTries: 200,
          distance: 2,
        });
      } else {
        derived = localSort(baseItems, selectedValue);
      }
    setItems(derived);
    onFetchItems?.(derived);
  }, [baseItems, selectedValue, randomTick, onFetchItems]);

  // Responsive index logic for color sampling
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const itemIndex = screenWidth >= 1025 ? 2 : screenWidth >= 768 ? 1 : 0;

  const convertHexToRGBA = (hex, alpha) => {
    const h = (hex || '#ffffff').replace('#', '');
    const r = parseInt(h.slice(0, 2) || 'ff', 16);
    const g = parseInt(h.slice(2, 4) || 'ff', 16);
    const b = parseInt(h.slice(4, 6) || 'ff', 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const borderItemColor = useMemo(() => {
    const alt = items[itemIndex]?.alt1;
    const color = Array.isArray(colorMapping?.[alt]) ? colorMapping[alt][2] : '#ffffff';
    return convertHexToRGBA(color, 0.8);
  }, [items, colorMapping, itemIndex]);

  const boxShadowItemColor = useMemo(() => {
    const alt = items[itemIndex]?.alt1;
    return Array.isArray(colorMapping?.[alt]) ? colorMapping[alt][3] : '#ffffff';
  }, [items, colorMapping, itemIndex]);

  return (
    <div className="sort-by-container">
      <div className="sort-container"><p>Sort by:</p></div>
      <div className="sort-container2">
        <div
          className="custom-dropdown"
          ref={dropdownRef}
          style={{
            border: `solid 1.6px ${borderItemColor}`,
            boxShadow: `0 1px 8px rgba(0,0,0,0.1), 0 22px 8px rgba(0,0,0,0.08), 12px 12px ${boxShadowItemColor}`,
          }}
        >
          <div className="custom-select" onClick={() => setIsOpen(!isOpen)}>
            <div className="selected-value">
              <h5>{options.find(opt => opt.value === selectedValue)?.label}</h5>
            </div>
            <span className={`custom-arrow ${isOpen ? 'open' : ''}`}>
              {customArrowIcon && <div dangerouslySetInnerHTML={{ __html: customArrowIcon }} />}
            </span>
          </div>

          {isOpen && (
            <div
              className="options-container"
              style={{ border: `solid 1.6px ${borderItemColor}`, borderTop: 'none' }}
            >
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`option ${option.value === selectedValue ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SortBy;
