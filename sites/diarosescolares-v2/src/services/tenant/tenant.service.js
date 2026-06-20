import { db } from "../../firebase/firebase.config.js";
import { ref, get, set } from "firebase/database";
import { Logger } from "../../assets/js/shared/logger.js";

const SCHOOLS = "schools";

const genCode = (len) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
};

export const getSchool = async (schoolId) => {
  if (!schoolId) return null;
  const snap = await get(
    ref(db, `${SCHOOLS}/${schoolId.trim().toUpperCase()}`),
  );
  return snap.exists() ? { id: snap.key, ...snap.val() } : null;
};

export const validateSchool = async (schoolId) => {
  if (!schoolId || typeof schoolId !== "string" || !schoolId.trim()) {
    throw new Error("Código da escola é obrigatório.");
  }
  const id = schoolId.trim().toUpperCase();
  const snap = await get(ref(db, `${SCHOOLS}/${id}`));
  if (!snap.exists()) throw new Error("Escola não encontrada.");
  const data = snap.val();
  if (data.status === "disabled")
    throw new Error("Esta escola está desativada.");
  return { schoolId: id, ...data };
};

export const createSchoolWithOwner = async ({
  directorUid,
  directorEmail,
  schoolName,
  city,
  state,
  phone,
  cnpj,
}) => {
  // Gera um ID e tenta o set diretamente.
  // A rule !data.exists() no Firebase garante que não sobrescreve escola existente.
  // Não fazemos get prévio porque o usuário novo ainda não tem schoolId no RTDB,
  // o que faria a rule de .read bloquear a leitura.
  for (let i = 0; i < 5; i++) {
    const schoolId = genCode(8);
    const schoolRef = ref(db, `${SCHOOLS}/${schoolId}`);

    const payload = {
      id: schoolId,
      name: schoolName,
      city: city || "",
      state: state || "",
      phone: phone || "",
      cnpj: cnpj || "",
      ownerUid: directorUid,
      status: "active",
      members: {
        [directorUid]: true,
      },
      teachers: {},
      guardians: {},
      classes: {},
      invites: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await set(schoolRef, payload);
      Logger.info("school.created", { schoolId, owner: directorUid });
      return { schoolId, schoolData: payload };
    } catch (e) {
      // Se falhou por outro motivo que não colisão, propaga
      if (
        !e.message?.includes("PERMISSION_DENIED") &&
        !e.code?.includes("permission-denied")
      ) {
        throw e;
      }
      // Colisão de ID improvável mas possível — tenta outro
      continue;
    }
  }
  throw new Error("Não foi possível criar a escola. Tente novamente.");
};

export const generateInviteCode = async (schoolId, role, createdBy) => {
  if (!["teacher", "guardian"].includes(role)) {
    throw new Error("Papel de convite inválido.");
  }

  const token = genCode(6);
  const expiresAt = Date.now() + 6 * 60 * 60 * 1000;

  const inviteRef = ref(db, `${SCHOOLS}/${schoolId}/invites/${role}`);
  await set(inviteRef, {
    token,
    schoolId,
    role,
    createdBy,
    expiresAt,
    createdAt: Date.now(),
  });

  return `${schoolId}:${role.toUpperCase()}:${token}`;
};
