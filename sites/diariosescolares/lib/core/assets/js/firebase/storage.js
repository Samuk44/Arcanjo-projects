/* ==========================================================================
   SGE v2.0 - FIREBASE STORAGE
   Upload, Download e Compressão de Imagens via Canvas
   ========================================================================== */

import { storage } from "./config.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

/**
 * Faz upload de um arquivo com validações
 * @param {string} path
 * @param {File} file
 */
export async function uploadFile(path, file) {
  // Validação de tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("O arquivo excede o limite de 5MB.");
  }

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    const errorMap = {
      "storage/unauthorized": "Sem permissão para upload.",
      "storage/quota-exceeded": "Cota de armazenamento excedida.",
      "storage/canceled": "Upload cancelado.",
    };
    throw new Error(errorMap[error.code] || "Erro ao fazer upload.");
  }
}

/**
 * Comprime uma imagem usando Canvas API antes do upload
 * @param {File} file
 * @param {number} maxWidth
 */
export async function compressImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scaleFactor = maxWidth / img.width;

        if (scaleFactor < 1) {
          canvas.width = maxWidth;
          canvas.height = img.height * scaleFactor;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.8,
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Remove um arquivo do storage
 * @param {string} path
 */
export async function deleteFile(path) {
  try {
    await deleteObject(ref(storage, path));
    return true;
  } catch (error) {
    console.error("Erro ao deletar arquivo:", error.message);
    return false;
  }
}

// SGE v2.0 • Firebase Storage • 2026-05-14
export const validateFileUpload = (file, options = {}) => {
  const allowedTypes = options.allowedTypes || ["image/jpeg", "image/png"];
  const maxSize = options.maxSize || 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Tipo de arquivo não permitido");
  }

  if (file.size > maxSize) {
    throw new Error("Arquivo muito grande");
  }

  // Verificar se é um arquivo válido (não vazio)
  if (file.size === 0) {
    throw new Error("Arquivo vazio");
  }

  return true;
};
