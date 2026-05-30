/* ==========================================================================
   SGE v2.0 - DB MOCK (Realtime Database Simulation)
   Simulação de CRUD e Queries sobre MOCK_DB
   ========================================================================== */

import { MOCK_DB, getMockSnapshot, deepClone } from "./data.js";

const USE_MOCK = true;
const listeners = {};

/**
 * Simula a criação de uma referência
 */
export function ref(db, path = "") {
  return { path, key: path.split("/").pop() };
}

/**
 * Simula a leitura de dados
 */
export async function get(dbRef) {
  console.log(`📖 [MOCK DB] read: ${dbRef.path}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockSnapshot(dbRef.path));
    }, 200);
  });
}

/**
 * Simula a gravação de dados
 */
export async function set(dbRef, data) {
  console.log(`🟢 [MOCK DB] set: ${dbRef.path}`, data);
  return updateMemory(dbRef.path, data);
}

/**
 * Simula a atualização de dados
 */
export async function update(dbRef, data) {
  console.log(`🟡 [MOCK DB] update: ${dbRef.path}`, data);
  const current = getMockSnapshot(dbRef.path).val() || {};
  return updateMemory(dbRef.path, { ...current, ...data });
}

/**
 * Simula a remoção de dados
 */
export async function remove(dbRef) {
  console.log(`🔴 [MOCK DB] remove: ${dbRef.path}`);
  return updateMemory(dbRef.path, null);
}

/**
 * Simula listener em tempo real
 */
export function onValue(dbRef, callback) {
  if (!listeners[dbRef.path]) listeners[dbRef.path] = [];
  listeners[dbRef.path].push(callback);

  // Dispara imediatamente
  get(dbRef).then((snap) => callback(snap));

  return () => {
    listeners[dbRef.path] = listeners[dbRef.path].filter((c) => c !== callback);
  };
}

export function off(dbRef) {
  delete listeners[dbRef.path];
}

/**
 * Helper para atualizar a árvore em memória e notificar listeners
 */
function updateMemory(path, data) {
  return new Promise((resolve) => {
    const parts = path.split("/").filter((p) => p);
    let current = MOCK_DB;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }

    const lastPart = parts[parts.length - 1];
    if (data === null) {
      delete current[lastPart];
    } else {
      current[lastPart] = deepClone(data);
    }

    // Notificar listeners do caminho e caminhos pai
    if (listeners[path]) {
      const snap = getMockSnapshot(path);
      listeners[path].forEach((cb) => cb(snap));
    }

    resolve();
  });
}

// Stubs para Queries (Simulação básica)
export function query(dbRef, ...constraints) {
  return dbRef;
}
export function orderByChild(path) {
  return { type: "orderBy", path };
}
export function equalTo(value) {
  return { type: "equal", value };
}
export function limitToFirst(limit) {
  return { type: "limit", limit };
}

// SGE v2.0 • Mock DB • 2026-05-14
