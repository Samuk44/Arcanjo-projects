import {
  getUsersBySchool,
  getSchoolTeachers,
  getSchoolGuardians,
} from "./school/school-user.query.service.js";

export async function getUsersByTenant(schoolId) {
  return getUsersBySchool(schoolId);
}

export async function getTeachersBySchool(schoolId) {
  return getSchoolTeachers(schoolId);
}

export async function getGuardiansBySchool(schoolId) {
  return getSchoolGuardians(schoolId);
}

export const userService = {
  getUsersByTenant,
  getTeachersBySchool,
  getGuardiansBySchool,
};
