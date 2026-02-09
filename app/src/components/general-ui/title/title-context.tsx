// src/components/general-iu/title/title-context.tsx
import React, { createContext, useContext, useState } from 'react';

export const TitleContext = createContext<{
  activeTitle: string;
  setActiveTitle: (t: string) => void;
}>({ activeTitle: '', setActiveTitle: () => {} });

export const TitleProvider = ({ children }) => {
  const [activeTitle, setActiveTitle] = useState('');
  return (
    <TitleContext.Provider value={{ activeTitle, setActiveTitle }}>
      {children}
    </TitleContext.Provider>
  );
};

export const useActiveTitle = () => useContext(TitleContext);
