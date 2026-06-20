// src/services/school/school.service.js
// CORRIGIDO: getMySchool usa tenant.service.getSchool, não school.query.service (circular)
import { getSchool } from "../tenant/tenant.service.js";
import {
  getSchoolUsers,
  getSchoolTeachers,
  getSchoolGuardians,
} from "./school-user.query.service.js";
import { actor, requireDirector } from "./school-access.service.js";

export async function getMySchool() {
  const u = actor();
  return getSchool(u.schoolId);
}

export async function getMySchoolUsers() {
  const u = requireDirector();
  return getSchoolUsers(u.schoolId);
}

export async function getMySchoolTeachers() {
  const u = requireDirector();
  return getSchoolTeachers(u.schoolId);
}

export async function getMySchoolGuardians() {
  const u = requireDirector();
  return getSchoolGuardians(u.schoolId);
}
