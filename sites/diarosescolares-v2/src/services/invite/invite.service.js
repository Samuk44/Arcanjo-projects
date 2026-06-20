import { db } from "../../firebase/firebase.config.js";
import { ref, get } from "firebase/database";

/**
 * Valida um código de convite em schools/{schoolId}/invites/{role}.
 * O convite é reutilizável durante a validade (não é marcado como usado).
 * @param {string} code  - Código do convite (formato: SCHOOLID:ROLE:TOKEN)
 * @returns {object}     - { schoolId, role, expiresAt, ... }
 */
export const validateInviteCode = async (code) => {
  if (!code || typeof code !== "string") {
    throw new Error("Código de convite é obrigatório.");
  }

  const parts = code.trim().toUpperCase().split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de convite inválido.");
  }

  const [schoolId, role, token] = parts;

  if (!["TEACHER", "GUARDIAN"].includes(role)) {
    throw new Error("Papel do convite inválido.");
  }

  const roleLower = role.toLowerCase();
  const inviteRef = ref(db, `schools/${schoolId}/invites/${roleLower}`);
  const snap = await get(inviteRef);

  if (!snap.exists()) {
    throw new Error("Código de convite inválido.");
  }

  const invite = snap.val();

  if (invite.token !== token) {
    throw new Error("Código de convite inválido.");
  }

  if (Date.now() > invite.expiresAt) {
    throw new Error("Este código de convite expirou (validade de 6 horas).");
  }

  return {
    schoolId,
    role: roleLower,
    expiresAt: invite.expiresAt,
    createdBy: invite.createdBy,
  };
};

/**
 * consumeInvite não remove nem marca o convite como usado — ele é reutilizável.
 * Registra apenas no perfil do usuário quem gerou o convite e quando entrou.
 * A expiração é validada em validateInviteCode.
 */
export const consumeInvite = async (_code, _usedByUid) => {
  // Convite reutilizável: nenhuma escrita necessária no nó do convite.
  // O controle de acesso permanece pela expiresAt.
  return;
};
