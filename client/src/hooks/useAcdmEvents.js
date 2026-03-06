import { useEffect } from 'react';

export const ACDM_EVENTS = {
  RELOAD_REQUEST: 'acdm:data:reload-request',
  LOADED: 'acdm:data:loaded',
  ERROR: 'acdm:data:error',
  MUTATION: 'acdm:data:mutation'
};

export const emitAcdmEvent = (type, detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
};

export const useAcdmEvent = (type, handler) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof handler !== 'function') return undefined;

    const listener = (event) => handler(event?.detail, event);
    window.addEventListener(type, listener);

    return () => {
      window.removeEventListener(type, listener);
    };
  }, [type, handler]);
};
