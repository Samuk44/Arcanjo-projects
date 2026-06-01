import { ref, get } from "firebase/database";
import { db } from "../../firebase.js";

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export function normalizeText(value) {
  return isString(value) ? value.trim() : "";
}

export function createError(message, code = "query-service-error") {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function readNode(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function readIndexIds(indexPath) {
  const value = await readNode(indexPath);
  if (!value || !isObject(value)) {
    return [];
  }
  return Object.keys(value);
}

export async function readManyByIds(basePath, ids, mapper) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];

  const items = await Promise.all(
    uniqueIds.map(async (id) => {
      const value = await readNode(`${basePath}/${id}`);
      return value ? mapper(id, value) : null;
    }),
  );

  return items.filter(Boolean);
}

export function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function sortByName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
}

export function sortByCreatedAtDesc(a, b) {
  const aTime = Number(a?.createdAt || 0);
  const bTime = Number(b?.createdAt || 0);
  return bTime - aTime;
}

export function sortByDateDesc(a, b) {
  const aDate = String(a?.date || "");
  const bDate = String(b?.date || "");

  if (aDate !== bDate) {
    return bDate.localeCompare(aDate);
  }

  return sortByCreatedAtDesc(a, b);
}

export function mapChildrenObjectToList(value, itemMapper) {
  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value)
    .map(([id, item]) => itemMapper(id, item))
    .filter(Boolean);
}
