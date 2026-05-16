/* ==========================================================================
   SGE v2.0 - FIREBASE DB (Realtime Database Wrapper)
   CRUD, Queries e Transactions Otimizadas
   ========================================================================== */

import { db } from "./config.js";
import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * Busca dados de um caminho específico
 * @param {string} path
 */
export async function getData(path) {
  try {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error(`Erro ao ler ${path}:`, error.message);
    throw error;
  }
}

/**
 * Sobrescreve dados em um caminho
 * @param {string} path
 * @param {any} data
 */
export async function setData(path, data) {
  try {
    await set(ref(db, path), data);
    return true;
  } catch (error) {
    console.error(`Erro ao gravar em ${path}:`, error.message);
    throw error;
  }
}

/**
 * Atualiza campos específicos sem sobrescrever o nó inteiro
 * @param {string} path
 * @param {Object} data
 */
export async function updateData(path, data) {
  try {
    await update(ref(db, path), data);
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar ${path}:`, error.message);
    throw error;
  }
}

/**
 * Remove um nó do banco de dados
 * @param {string} path
 */
export async function removeData(path) {
  try {
    await remove(ref(db, path));
    return true;
  } catch (error) {
    console.error(`Erro ao remover ${path}:`, error.message);
    throw error;
  }
}

/**
 * Subscreve a mudanças em tempo real
 * @param {string} path
 * @param {Function} callback
 */
export function subscribeToPath(path, callback) {
  const pathRef = ref(db, path);
  onValue(pathRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  // Retorna função de cleanup
  return () => off(pathRef);
}

/**
 * Constrói e executa uma query filtrada
 * @param {string} path
 * @param {Object} filters
 */
export async function buildQuery(path, { orderBy, equal, limit } = {}) {
  try {
    let q = ref(db, path);
    const constraints = [];

    if (orderBy) constraints.push(orderByChild(orderBy));
    if (equal !== undefined) constraints.push(equalTo(equal));
    if (limit) constraints.push(limitToFirst(limit));

    const finalQuery = query(q, ...constraints);
    const snapshot = await get(finalQuery);
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error(`Erro na query em ${path}:`, error.message);
    throw error;
  }
}

/**
 * Executa uma transação atômica
 * @param {string} path
 * @param {Function} updateFn
 */
export async function executeTransaction(path, updateFn) {
  try {
    const result = await runTransaction(ref(db, path), updateFn);
    return result.committed;
  } catch (error) {
    console.error(`Erro na transação em ${path}:`, error.message);
    throw error;
  }
}

// SGE v2.0 • Firebase DB • 2026-05-14
