import { ref, get } from "firebase/database";
import { db } from "../../../firebase/firebase.config.js";
import { authStore } from "../../../store/auth.store.js";
import { getSchoolById } from "../../../services/school/school.query.service.js";
import {
  getUsersBySchool,
  getSchoolTeachers,
  getSchoolGuardians,
} from "../../../services/school/school-user.query.service.js";
import { getMyClasses } from "../../../services/school/class.query.service.js";
import { getAttendanceByDate } from "../../../services/query/attendance.query.service.js";
import { validateInviteCode } from "../../../services/invite/invite.service.js";
import { getAssignmentsBySchool } from "../../../services/query/assignment.query.service.js";
import { generateInviteCode } from "../../../services/tenant/tenant.service.js";

function buildError(message) {
  const error = new Error(message);
  error.code = "director-dashboard-service-error";
  return error;
}

function requireDirectorUser() {
  const user = authStore.getUser();
  if (!user) throw buildError("Sessão inativa.");
  if (user.role !== "director")
    throw buildError("Acesso permitido apenas ao diretor.");
  if (!user.schoolId) throw buildError("Diretor sem escola vinculada.");
  return user;
}

function normalizeText(value, fallback = "—") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function mapStatus(status) {
  const normalized = String(status || "active")
    .trim()
    .toLowerCase();
  if (["disabled", "inactive", "blocked"].includes(normalized))
    return "disabled";
  if (["pending", "awaiting", "approval"].includes(normalized))
    return "pending";
  return "active";
}

function statusLabel(status) {
  if (status === "pending") return "Pendente";
  if (status === "disabled") return "Inativo";
  return "Ativo";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatRemainingTime(milliseconds) {
  if (!milliseconds || milliseconds <= 0) return "Expirado";

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function uniqueById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return [...map.values()];
}

function buildUserName(user) {
  return normalizeText(
    user?.displayName || user?.name || user?.email,
    "Usuário",
  );
}

function flattenGuardianStudents(guardians) {
  return guardians.flatMap((guardian) => {
    const children =
      guardian?.children && typeof guardian.children === "object"
        ? guardian.children
        : {};

    return Object.entries(children).map(([studentId, student]) => ({
      id: studentId,
      name: normalizeText(student?.name, "Aluno sem nome"),
      enrollmentNumber: String(student?.enrollmentNumber || "").trim(),
      classId: String(student?.classId || "").trim(),
      schoolId: student?.schoolId || guardian?.schoolId || "",
      status: mapStatus(student?.status),
      statusLabel: statusLabel(mapStatus(student?.status)),
      guardianUid: guardian?.uid || "",
      guardianName: buildUserName(guardian),
      guardianEmail: guardian?.email || "",
    }));
  });
}

async function getSchoolEnrollments(schoolId) {
  const snap = await get(ref(db, `schoolEnrollments/${schoolId}`));
  if (!snap.exists()) return [];

  return Object.entries(snap.val()).map(([enrollmentNumber, enrollment]) => ({
    id: enrollment?.studentId || enrollmentNumber,
    enrollmentNumber,
    guardianUid: enrollment?.guardianUid || "",
    createdAt: enrollment?.createdAt || null,
  }));
}

async function buildInvite(role, schoolId, school) {
  const invite = school?.invites?.[role];

  if (!invite?.token) {
    return {
      role,
      label: role === "teacher" ? "Professor" : "Responsável",
      code: "",
      expiresAt: null,
      remainingMs: 0,
      remainingLabel: "Não gerado",
      status: "inactive",
      statusLabel: "Não gerado",
    };
  }

  const code = `${schoolId}:${role.toUpperCase()}:${invite.token}`;

  try {
    const validated = await validateInviteCode(code);
    const remainingMs = Math.max(
      0,
      Number(validated.expiresAt || 0) - Date.now(),
    );
    const status =
      remainingMs <= 0
        ? "danger"
        : remainingMs <= 2 * 60 * 60 * 1000
          ? "warning"
          : "success";

    return {
      role,
      label: role === "teacher" ? "Professor" : "Responsável",
      code,
      expiresAt: validated.expiresAt,
      remainingMs,
      remainingLabel: formatRemainingTime(remainingMs),
      status,
      statusLabel:
        remainingMs <= 0
          ? "Expirado"
          : remainingMs <= 2 * 60 * 60 * 1000
            ? "Expirando"
            : "Ativo",
      createdBy: invite?.createdBy || "",
    };
  } catch {
    return {
      role,
      label: role === "teacher" ? "Professor" : "Responsável",
      code,
      expiresAt: invite?.expiresAt || null,
      remainingMs: 0,
      remainingLabel: "Expirado",
      status: "danger",
      statusLabel: "Expirado",
      createdBy: invite?.createdBy || "",
    };
  }
}

function buildAssignmentsIndex(assignments) {
  const byTeacherId = new Map();
  const byClassId = new Map();

  assignments.forEach((assignment) => {
    if (assignment?.teacherId) {
      const current = byTeacherId.get(assignment.teacherId) || [];
      current.push(assignment);
      byTeacherId.set(assignment.teacherId, current);
    }

    if (assignment?.classId) {
      const current = byClassId.get(assignment.classId) || [];
      current.push(assignment);
      byClassId.set(assignment.classId, current);
    }
  });

  return { byTeacherId, byClassId };
}

function buildClassItems(classes, teachersMap, assignmentsByClassId) {
  return classes.map((klass) => {
    const assignments = assignmentsByClassId.get(klass.id) || [];
    const teacherNames = uniqueById(
      assignments.map((assignment) => ({
        id: assignment.teacherId,
        name: buildUserName(teachersMap.get(assignment.teacherId)),
      })),
    );
    const students =
      klass?.students && typeof klass.students === "object"
        ? Object.entries(klass.students).map(([studentId, student]) => ({
            id: studentId,
            name: normalizeText(student?.name, "Aluno"),
            enrollmentNumber: student?.enrollmentNumber || "",
            guardianUid: student?.guardianUid || "",
          }))
        : [];

    const teacherLabel =
      teacherNames.length === 0
        ? "Sem professor"
        : teacherNames.length === 1
          ? teacherNames[0].name
          : `${teacherNames.length} professores`;

    return {
      id: klass.id,
      name: normalizeText(klass.name, "Turma"),
      grade: normalizeText(klass.grade),
      shift: normalizeText(klass.shift),
      status: mapStatus(klass.status),
      statusLabel: statusLabel(mapStatus(klass.status)),
      studentsCount: students.length,
      teacherLabel,
      teacherNames,
      teacherIds: teacherNames.map((teacher) => teacher.id),
      students,
    };
  });
}

function buildTeacherItems(teachers, assignmentsByTeacherId, classesMap) {
  return teachers.map((teacher) => {
    const assignments = assignmentsByTeacherId.get(teacher.uid) || [];
    const assignedClasses = uniqueById(
      assignments
        .map((assignment) => classesMap.get(assignment.classId))
        .filter(Boolean)
        .map((klass) => ({
          id: klass.id,
          name: normalizeText(klass.name),
          grade: normalizeText(klass.grade),
        })),
    );

    const teacherStatus = mapStatus(teacher?.status);

    return {
      id: teacher.uid,
      name: buildUserName(teacher),
      email: normalizeText(teacher?.email),
      status: teacherStatus,
      statusLabel: statusLabel(teacherStatus),
      classCount: assignedClasses.length,
      classesAssigned: assignedClasses,
    };
  });
}

function buildGuardianItems(guardians, classMap) {
  return guardians.map((guardian) => {
    const children =
      guardian?.children && typeof guardian.children === "object"
        ? Object.entries(guardian.children).map(([studentId, child]) => ({
            id: studentId,
            name: normalizeText(child?.name, "Aluno"),
            enrollmentNumber: child?.enrollmentNumber || "",
            classId: child?.classId || "",
            className: classMap.get(child?.classId)?.name || "Sem turma",
          }))
        : [];

    const guardianStatus = mapStatus(guardian?.status);

    return {
      id: guardian.uid,
      name: buildUserName(guardian),
      email: normalizeText(guardian?.email),
      status: guardianStatus,
      statusLabel: statusLabel(guardianStatus),
      childrenCount: children.length,
      children,
    };
  });
}

function buildAlerts({
  invites,
  teacherItems,
  classItems,
  students,
  allUsers,
}) {
  const alerts = [];
  const activeInvite = invites.find(
    (invite) => invite.status === "warning" || invite.status === "danger",
  );

  if (activeInvite) {
    alerts.push({
      id: `invite-${activeInvite.role}`,
      level: activeInvite.status === "danger" ? "danger" : "warning",
      title: `Código de ${activeInvite.label.toLowerCase()} ${activeInvite.status === "danger" ? "expirado" : "expirando"}`,
      description:
        activeInvite.status === "danger"
          ? "Renove o código para manter o cadastro liberado."
          : `Validade restante: ${activeInvite.remainingLabel}.`,
    });
  }

  teacherItems
    .filter((teacher) => teacher.classCount === 0)
    .forEach((teacher) => {
      alerts.push({
        id: `teacher-${teacher.id}`,
        level: "warning",
        title: "Professor sem turma",
        description: `${teacher.name} ainda não possui turma vinculada.`,
      });
    });

  classItems
    .filter((klass) => klass.teacherIds.length === 0)
    .forEach((klass) => {
      alerts.push({
        id: `class-${klass.id}`,
        level: "warning",
        title: "Turma sem professor",
        description: `${klass.name} (${klass.grade}) ainda não tem professor vinculado.`,
      });
    });

  students
    .filter((student) => !student.enrollmentNumber)
    .forEach((student) => {
      alerts.push({
        id: `student-${student.id}`,
        level: "danger",
        title: "Aluno sem matrícula",
        description: `${student.name} está sem número de matrícula registrado.`,
      });
    });

  allUsers
    .filter((user) => mapStatus(user?.status) !== "active")
    .forEach((user) => {
      alerts.push({
        id: `user-${user.uid}`,
        level: "warning",
        title: "Pendência de cadastro",
        description: `${buildUserName(user)} está com status ${statusLabel(mapStatus(user?.status)).toLowerCase()}.`,
      });
    });

  return alerts.slice(0, 12);
}

export async function loadDirectorDashboardData() {
  const user = requireDirectorUser();
  const schoolId = user.schoolId;
  const dateKey = getDateKey();

  const [
    school,
    allUsers,
    teachers,
    guardians,
    classes,
    attendance,
    assignments,
    enrollments,
  ] = await Promise.all([
    getSchoolById(schoolId),
    getUsersBySchool(schoolId),
    getSchoolTeachers(schoolId),
    getSchoolGuardians(schoolId),
    getMyClasses(),
    getAttendanceByDate(schoolId, dateKey).catch(() => []),
    getAssignmentsBySchool(schoolId).catch(() => []),
    getSchoolEnrollments(schoolId),
  ]);

  if (!school) throw buildError("Escola não encontrada.");

  const invites = await Promise.all([
    buildInvite("teacher", schoolId, school),
    buildInvite("guardian", schoolId, school),
  ]);

  const assignmentsIndex = buildAssignmentsIndex(assignments);
  const classMap = new Map(classes.map((klass) => [klass.id, klass]));
  const teachersMap = new Map(
    teachers.map((teacher) => [teacher.uid, teacher]),
  );

  const rawStudents = flattenGuardianStudents(guardians);
  const studentsById = new Map(
    rawStudents.map((student) => [student.id, student]),
  );

  enrollments.forEach((enrollment) => {
    if (!studentsById.has(enrollment.id)) {
      studentsById.set(enrollment.id, {
        id: enrollment.id,
        name: "Aluno",
        enrollmentNumber: enrollment.enrollmentNumber,
        classId: "",
        schoolId,
        status: "active",
        statusLabel: "Ativo",
        guardianUid: enrollment.guardianUid,
        guardianName: "—",
        guardianEmail: "",
      });
    }
  });

  const students = [...studentsById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  const classItems = buildClassItems(
    classes,
    teachersMap,
    assignmentsIndex.byClassId,
  );
  const teacherItems = buildTeacherItems(
    teachers,
    assignmentsIndex.byTeacherId,
    classMap,
  );
  const guardianItems = buildGuardianItems(guardians, classMap);
  const alerts = buildAlerts({
    invites,
    teacherItems,
    classItems,
    students,
    allUsers,
  });

  return {
    school: {
      id: school.id,
      name: normalizeText(school.name, "Escola"),
      city: normalizeText(school.city, ""),
      state: normalizeText(school.state, ""),
      status: mapStatus(school.status),
    },
    director: {
      uid: user.uid,
      name: buildUserName(user),
      email: normalizeText(user.email),
    },
    codeBlock: {
      activeRole: "teacher",
      invites,
    },
    summary: {
      teachers: teacherItems.length,
      guardians: guardianItems.length,
      classes: classItems.length,
      students: students.length,
      attendanceToday: attendance.length,
    },
    lists: {
      classes: classItems,
      teachers: teacherItems,
      guardians: guardianItems,
      students,
      alerts,
    },
    filters: {
      classes: classItems.map((klass) => ({ id: klass.id, label: klass.name })),
      teachers: teacherItems.map((teacher) => ({
        id: teacher.id,
        label: teacher.name,
      })),
      statuses: [
        { id: "active", label: "Ativo" },
        { id: "pending", label: "Pendente" },
        { id: "disabled", label: "Inativo" },
      ],
    },
    meta: {
      dateKey,
      generatedAt: Date.now(),
    },
  };
}

export async function renewDirectorInvite(role = "teacher") {
  const user = requireDirectorUser();
  if (!["teacher", "guardian"].includes(role)) {
    throw buildError("Tipo de convite inválido.");
  }

  await generateInviteCode(user.schoolId, role, user.uid);
  return loadDirectorDashboardData();
}

export const directorDashboardService = {
  loadDirectorDashboardData,
  renewDirectorInvite,
};
