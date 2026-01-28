/**
 * Custom hooks for API calls with loading/error states
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for making API calls with loading and error states
 * @param {Function} apiCall - The API function to call
 * @param {Array} deps - Dependencies that trigger refetch when changed
 * @param {Object} options - Options { immediate: boolean, onSuccess: Function, onError: Function }
 */
export const useApiCall = (apiCall, deps = [], options = {}) => {
  const { immediate = true, onSuccess, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      setData(result);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  return { data, loading, error, execute, setData };
};

/**
 * Hook for paginated API calls with cursor-based pagination
 * @param {Function} apiCall - The API function that accepts (cursor) param
 * @param {Object} options - Options { pageSize: number }
 */
export const usePaginatedApi = (apiCall, options = {}) => {
  const { pageSize = 20 } = options;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(cursor);
      const newItems = result.data || result.items || result;
      setItems(prev => [...prev, ...newItems]);
      setCursor(result.nextCursor || null);
      setHasMore(!!result.nextCursor && newItems.length === pageSize);
    } catch (err) {
      setError(err.message || 'Failed to load more');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [apiCall, cursor, hasMore, loading, pageSize]);

  const refresh = useCallback(async () => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(null);
      const newItems = result.data || result.items || result;
      setItems(newItems);
      setCursor(result.nextCursor || null);
      setHasMore(!!result.nextCursor && newItems.length === pageSize);
    } catch (err) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [apiCall, pageSize]);

  // Initial load
  useEffect(() => {
    refresh();
  }, []);

  return {
    items,
    loading,
    initialLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    setItems,
  };
};

/**
 * Hook for mutations (POST, PUT, DELETE)
 * @param {Function} apiCall - The API mutation function
 * @param {Object} options - Options { onSuccess: Function, onError: Function }
 */
export const useMutation = (apiCall, options = {}) => {
  const { onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError]);

  return { mutate, loading, error };
};

export default {
  useApiCall,
  usePaginatedApi,
  useMutation,
};
