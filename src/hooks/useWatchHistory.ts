import { useContext } from 'react';
import { WatchHistoryContext } from '../context/WatchHistoryContext';

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
}
