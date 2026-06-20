import { db } from "../firebase/firebase.config.js";
import { ref, get } from "firebase/database";

async function getActiveUser(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) return null;
  const user = snap.val();
  if (["inactive", "disabled", "blocked"].includes(user.status)) return null;
  return user;
}

export async function canAccessSchool(uid, schoolId) {
  const user = await getActiveUser(uid);
  if (!user) return false;
  return user.schoolId === schoolId;
}

export async function canManageStudent(uid, studentId) {
  const user = await getActiveUser(uid);
  if (!user) return false;

  // Diretor pode gerenciar alunos matriculados na própria escola
  if (user.role === "director") {
    const enrollmentSnap = await get(
      ref(db, `schoolEnrollments/${user.schoolId}`),
    );
    if (!enrollmentSnap.exists()) return false;
    const enrollments = enrollmentSnap.val();
    return Object.values(enrollments).some((e) => e.studentId === studentId);
  }

  // Responsável pode gerenciar apenas seus próprios filhos
  if (user.role === "guardian") {
    const childSnap = await get(ref(db, `users/${uid}/children/${studentId}`));
    return childSnap.exists();
  }

  // Professor pode ver alunos apenas da turma atribuída
  if (user.role === "teacher") {
    const assignmentsSnap = await get(ref(db, `users/${uid}/assignments`));
    if (!assignmentsSnap.exists()) return false;

    const classIds = Object.keys(assignmentsSnap.val());
    for (const classId of classIds) {
      const studentSnap = await get(
        ref(
          db,
          `schools/${user.schoolId}/classes/${classId}/students/${studentId}`,
        ),
      );
      if (studentSnap.exists()) return true;
    }
    return false;
  }

  return false;
}

export async function canAccessClass(uid, schoolId, classId) {
  const user = await getActiveUser(uid);
  if (!user) return false;

  if (user.schoolId !== schoolId) return false;

  if (user.role === "director") return true;

  if (user.role === "teacher") {
    const assignmentSnap = await get(
      ref(db, `users/${uid}/assignments/${classId}`),
    );
    return assignmentSnap.exists();
  }

  return false;
}

export const permissionService = {
  canAccessSchool,
  canManageStudent,
  canAccessClass,
};
