import { ref, get } from "firebase/database";
import { db } from "../firebase/firebase.config.js";
import { getSchoolGuardians } from "./school/school-user.query.service.js";
import {
  createStudent as createStudentRecord,
  updateStudent,
} from "./student/student.service.js";

function normalizeName(value) {
  return String(value || "").trim();
}

function buildStudentFromGuardian(guardian, studentId, studentData) {
  return {
    id: studentId,
    name: normalizeName(studentData?.name) || "Aluno sem nome",
    enrollmentNumber: studentData?.enrollmentNumber || "",
    classId: studentData?.classId || "",
    schoolId: studentData?.schoolId || guardian?.schoolId || "",
    status: studentData?.status || "active",
    guardianUid: guardian?.uid || "",
    guardianName:
      guardian?.displayName || guardian?.name || guardian?.email || "—",
  };
}

export async function getStudentsBySchool(schoolId) {
  if (!schoolId) return [];

  const guardians = await getSchoolGuardians(schoolId).catch(() => []);
  const students = guardians.flatMap((guardian) => {
    const children =
      guardian?.children && typeof guardian.children === "object"
        ? guardian.children
        : {};

    return Object.entries(children).map(([studentId, studentData]) =>
      buildStudentFromGuardian(guardian, studentId, studentData),
    );
  });

  if (students.length > 0) {
    return students.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  const enrollmentsSnap = await get(ref(db, `schoolEnrollments/${schoolId}`));
  if (!enrollmentsSnap.exists()) return [];

  return Object.entries(enrollmentsSnap.val()).map(
    ([enrollmentNumber, enrollment]) => ({
      id: enrollment?.studentId || enrollmentNumber,
      name: "Aluno",
      enrollmentNumber,
      classId: "",
      schoolId,
      status: "active",
      guardianUid: enrollment?.guardianUid || "",
      guardianName: "—",
    }),
  );
}

export const createStudent = createStudentRecord;

export const studentService = {
  createStudent,
  getStudentsBySchool,
  updateStudent,
};
