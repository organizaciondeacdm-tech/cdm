import { useCallback, useState } from 'react';

export function useOptimisticSubmissions(apiAdapter, onError) {
  const [rows, setRows] = useState([]);

  const hydrate = useCallback((items) => setRows(items), []);

  const create = useCallback(async (payload) => {
    const tempId = `optimistic-${Date.now()}`;
    const optimisticRow = {
      _id: tempId,
      ...payload,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setRows((current) => [optimisticRow, ...current]);

    try {
      const created = await apiAdapter.createSubmission(payload);
      if (!created) {
        setRows((current) => current.filter((row) => row._id !== tempId));
        throw new Error("Failed to create submission");
      }
      
      // Handle both immediate creation and queued responses
      if (created.queued) {
        setRows((current) => current.map((row) => row._id === tempId ? { ...row, status: 'queued', _id: created.idempotencyKey || tempId } : row));
      } else {
        // Submission was created successfully
        setRows((current) => current.map((row) => row._id === tempId ? { ...created, status: 'synced' } : row));
      }
    } catch (error) {
      setRows((current) => current.map((row) => row._id === tempId ? { ...row, status: 'failed' } : row));
      onError(error.message);
    }
  }, [apiAdapter, onError]);

  const remove = useCallback(async (id) => {
    const previous = rows;
    setRows((current) => current.filter((item) => item._id !== id));

    try {
      await apiAdapter.deleteSubmission(id);
    } catch (error) {
      setRows(previous);
      onError(error.message);
    }
  }, [apiAdapter, rows, onError]);

  return { rows, hydrate, create, remove };
}
