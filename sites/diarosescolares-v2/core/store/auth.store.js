const state = {
  user: null,
  loading: false,
  isAuthenticated: false,
};

const listeners = new Set();

function emit() {
  const snapshot = getState();
  listeners.forEach((fn) => fn(snapshot));
}

export function getState() {
  return {
    user: state.user ? { ...state.user } : null,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated,
  };
}

export function subscribe(fn) {
  listeners.add(fn);

  return () => listeners.delete(fn);
}

export function setUser(user) {
  state.user = user ? { ...user } : null;
  state.isAuthenticated = !!user;
  state.loading = false;
  emit();
}

export function clearUser() {
  state.user = null;
  state.isAuthenticated = false;
  state.loading = false;
  emit();
}

export function setLoading(value) {
  state.loading = !!value;
  emit();
}

export const authStore = {
  getState,
  subscribe,
  setUser,
  clearUser,
  setLoading,
  getUser: () => (state.user ? { ...state.user } : null),
};
