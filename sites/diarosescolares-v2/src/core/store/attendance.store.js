const state = {
  records: [],
  loading: false,
  error: null,
};

const listeners = new Set();

function emit() {
  const snapshot = getState();
  listeners.forEach((fn) => fn(snapshot));
}

export function getState() {
  return {
    records: [...state.records],
    loading: state.loading,
    error: state.error,
  };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setRecords(records) {
  state.records = Array.isArray(records) ? [...records] : [];
  state.loading = false;
  state.error = null;
  emit();
}

export function setLoading(value) {
  state.loading = !!value;
  emit();
}

export function setError(err) {
  state.error = err || null;
  state.loading = false;
  emit();
}

export function clearRecords() {
  state.records = [];
  state.loading = false;
  state.error = null;
  emit();
}

export const attendanceStore = {
  getState,
  subscribe,
  setRecords,
  setLoading,
  setError,
  clearRecords,
};
