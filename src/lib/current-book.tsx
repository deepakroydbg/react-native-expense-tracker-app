import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

type CurrentBook = { id: string; name: string } | null;

type CurrentBookContextValue = {
  currentBook: CurrentBook;
  setCurrentBook: (book: CurrentBook) => void;
};

const STORAGE_KEY = 'mykhata.current-book';

const CurrentBookContext = createContext<CurrentBookContextValue | null>(null);

export function CurrentBookProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBookState] = useState<CurrentBook>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setCurrentBookState(JSON.parse(stored));
      })
      .catch(() => {});
  }, []);

  const setCurrentBook = (book: CurrentBook) => {
    setCurrentBookState(book);
    if (book) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(book)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <CurrentBookContext.Provider value={{ currentBook, setCurrentBook }}>
      {children}
    </CurrentBookContext.Provider>
  );
}

export function useCurrentBook(): CurrentBookContextValue {
  const ctx = useContext(CurrentBookContext);
  if (!ctx) throw new Error('useCurrentBook must be used within CurrentBookProvider');
  return ctx;
}
