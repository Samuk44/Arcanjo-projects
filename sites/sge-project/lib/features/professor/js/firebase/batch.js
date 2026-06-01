/**
 * @module firebase/batch
 * @description Utilitários para operações em lote no Firebase Realtime Database.
 *   Usa multi-path update (update(ref(db), writes)) para reduzir o número de escritas
 *   a uma única chamada de rede, independente do volume de caminhos.
 */
"use strict";

import { db } from "../../../../assets/js/firebase/config.js";
import {
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * Executa múltiplas escritas em uma única chamada ao Firebase.
 * Paths relativos à raiz do banco (sem barra inicial).
 *
 * @param {Object.<string, any>} writes - Mapa de path absoluto → valor (null remove o nó)
 * @returns {Promise<void>}
 * @throws {Error} Se o Firebase rejeitar a escrita
 */
export async function batchWrite(writes) {
  if (!writes || !Object.keys(writes).length) return;
  await update(ref(db), writes);
}
