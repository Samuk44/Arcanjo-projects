import {
  createAttendance,
  updateAttendance,
  removeAttendance,
} from "./attendance.service.js";
import { authStore } from "../../store/auth.store.js";

function getActor() {
  const user = authStore.getUser();
  if (!user) {
    const error = new Error("Sessão inativa.");
    error.code = "unauthenticated";
    throw error;
  }
  return user;
}

export async function submitAttendance({
  classId,
  subjectId,
  date,
  students,
  notes = "",
}) {
  const user = getActor();
  return createAttendance(classId, {
    teacherId: user.uid,
    subjectId,
    schoolId: user.schoolId,
    date,
    students,
    notes,
  });
}

export async function editAttendance(attendanceId, data) {
  getActor();
  return updateAttendance(attendanceId, data);
}

export async function deleteAttendance(attendanceId) {
  getActor();
  return removeAttendance(attendanceId);
}
