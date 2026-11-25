import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Re-runs `query` whenever the stored data it read changes, and returns its latest result
 * (`undefined` while loading). This is the only place in the UI that knows about live queries.
 */
export function useLiveData<T>(query: () => Promise<T>, dependencies: unknown[] = []): T | undefined {
  return useLiveQuery(query, dependencies);
}
