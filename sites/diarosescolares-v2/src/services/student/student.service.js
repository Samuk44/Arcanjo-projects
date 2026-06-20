import { db } from "../../firebase/firebase.config.js";
import { ref, set, get, push } from "firebase/database";

export async function createStudent({
  guardianUid,
  name,
  enrollmentNumber,
  schoolId,
  classId,
}) {
  if (!guardianUid || !name || !enrollmentNumber || !schoolId) {
    throw new Error("Campos obrigatórios ausentes para cadastro de aluno.");
  }

  // 1. Validar unicidade da matrícula na escola
  const enrollmentRef = ref(
    db,
    `schoolEnrollments/${schoolId}/${enrollmentNumber}`,
  );
  const enrollmentSnap = await get(enrollmentRef);
  if (enrollmentSnap.exists()) {
    throw new Error("Esta matrícula já está cadastrada nesta escola.");
  }

  // 2. Gerar ID do aluno e salvar dentro do responsável
  const studentRef = push(ref(db, `users/${guardianUid}/children`));
  const studentId = studentRef.key;
  const now = Date.now();

  const studentData = {
    id: studentId,
    name: name.trim(),
    enrollmentNumber: enrollmentNumber.trim(),
    schoolId,
    classId: classId || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // 3. Persistir aluno no responsável + registro de matrícula na escola
  await set(studentRef, studentData);
  await set(enrollmentRef, {
    studentId,
    guardianUid,
    createdAt: now,
  });

  // 4. Se houver turma, registrar referência em schools/{schoolId}/classes/{classId}/students
  if (classId) {
    await set(
      ref(db, `schools/${schoolId}/classes/${classId}/students/${studentId}`),
      {
        name: name.trim(),
        enrollmentNumber: enrollmentNumber.trim(),
        guardianUid,
      },
    );
  }

  return studentData;
}

export async function getGuardianStudents(guardianUid) {
  const snap = await get(ref(db, `users/${guardianUid}/children`));
  if (!snap.exists()) return [];
  return Object.values(snap.val());
}

export async function updateStudent(guardianUid, studentId, data) {
  const studentRef = ref(db, `users/${guardianUid}/children/${studentId}`);
  const snap = await get(studentRef);
  if (!snap.exists()) throw new Error("Aluno não encontrado.");

  const forbidden = ["schoolId", "id", "enrollmentNumber", "createdAt"];
  const updates = { ...data, updatedAt: Date.now() };
  forbidden.forEach((k) => delete updates[k]);

  await set(studentRef, { ...snap.val(), ...updates });
}
