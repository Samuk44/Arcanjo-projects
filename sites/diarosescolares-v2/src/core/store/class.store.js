const state = {
  classes: [],
  selected: null,
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
    classes: [...state.classes],
    selected: state.selected ? { ...state.selected } : null,
    loading: state.loading,
    error: state.error,
  };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setClasses(classes) {
  state.classes = Array.isArray(classes) ? [...classes] : [];
  state.loading = false;
  state.error = null;
  emit();
}

export function selectClass(klass) {
  state.selected = klass ? { ...klass } : null;
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

export function clearClasses() {
  state.classes = [];
  state.selected = null;
  state.loading = false;
  state.error = null;
  emit();
}

export const classStore = {
  getState,
  subscribe,
  setClasses,
  selectClass,
  setLoading,
  setError,
  clearClasses,
};
