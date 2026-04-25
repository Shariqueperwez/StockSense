import React, { createContext, useContext, useState } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem('ssMode') || 'trader');

  const setMode = (m) => {
    localStorage.setItem('ssMode', m);
    setModeState(m);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
