import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  undo: () => void;
  redo: () => void;
};

export function useFlowKeyboard({ undo, redo }: Options) {
  const [isLocked, setIsLocked] = useState(false);
  const [spacebarLocked, setSpacebarLocked] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);

  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(true);
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
        return;
      }
      if (e.code === 'KeyL' && !e.repeat) {
        setIsLocked((v) => !v);
        setSpacebarLocked(false);
      }
      if (e.code === 'Space' && !e.repeat && !isLockedRef.current) {
        e.preventDefault();
        setSpacebarLocked(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(false);
      if (e.code === 'Space') setSpacebarLocked(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked((v) => !v);
    setSpacebarLocked(false);
  }, []);

  return { isLocked, spacebarLocked, isShiftHeld, toggleLock };
}
