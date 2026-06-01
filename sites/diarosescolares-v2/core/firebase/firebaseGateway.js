import { db } from "./config.js";
import { ref, get, set, update, remove, push } from "firebase/database";

export const firebaseGateway = {
  get: (path) => get(ref(db, path)),
  set: (path, value) => set(ref(db, path), value),
  update: (path, value) => update(ref(db, path), value),
  remove: (path) => remove(ref(db, path)),
  push: (path) => push(ref(db, path)),
};
