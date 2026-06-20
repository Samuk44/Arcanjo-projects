// src/features/teacher/dashboard/dashboard.service.js
// Agrega dados do professor a partir das query layers existentes.
// Nunca lê globalmente — todos os caminhos são filtrados por schoolId/uid.
import { authStore } from "../../../store/auth.store.js";
import { getMyClasses } from "../../../services/query/class.query.service.js";
import { getLatestAttendanceByTeacher, getAttendanceByDate, getAttendanceByClassAndDate } from "../../../services/query/attendance.query.service.js";
import { getTeacherNotifications } from "./notification.query.service.js";
import { ref, get } from "firebase/database";
import { db } from "../../../firebase.js";

function requireTeacher() {
  const user = authStore.getUser();
  if (!user) throw Object.assign(new Error("Sessão inativa."), { code: "unauthenticated" });
  if (user.role !== "teacher") throw Object.assign(new Error("Acesso permitido apenas ao professor."), { code: "forbidden" });
  if (!user.schoolId) throw Object.assign(new Error("Professor sem escola vinculada."), { code: "no-school" });
  return user;
}

function pad(n) { return String(n).padStart(2, "0"); }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function greetingFor(name) {
  const h = new Date().getHours();
  const first = (name || "Professor").split(" ")[0];
  if (h < 12) return `Bom dia, ${first}`;
  if (h < 18) return `Boa tarde, ${first}`;
  return `Boa noite, ${first}`;
}

function formatDatePtBr(dateKey) {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${d} de ${months[parseInt(m, 10) - 1]} de ${y}`;
}

/**
 * Lê os alunos de uma turma a partir de schools/{schoolId}/classes/{classId}/students
 */
async function getStudentsInClass(schoolId, classId) {
  const snap = await get(ref(db, `schools/${schoolId}/classes/${classId}/students`));
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

/**
 * Carrega todos os dados necessários para o dashboard do professor.
 * Retorna objeto estruturado pronto para a view.
 */
export async function loadTeacherDashboard() {
  const user = requireTeacher();
  const { uid, schoolId, name, email } = user;
  const dateKey = todayKey();

  // Busca paralela — todas as queries filtradas por uid/schoolId
  const [classes, recentAttendance, todayAttendance, notifications] = await Promise.all([
    getMyClasses().catch(() => []),
    getLatestAttendanceByTeacher(uid, 15).catch(() => []),
    getAttendanceByDate(schoolId, dateKey).catch(() => []),
    getTeacherNotifications(uid, schoolId).catch(() => []),
  ]);

  // Filtra chamadas de hoje feitas por este professor (schoolId já garantido)
  const myTodayAttendance = todayAttendance.filter(a => a.teacherId === uid);

  // Classes com chamada feita hoje
  const classesWithAttendanceToday = new Set(myTodayAttendance.map(a => a.classId));

  // Para cada turma, enriquecer com dados de alunos e última chamada
  const enrichedClasses = await Promise.all(
    classes.map(async (klass) => {
      const lastAttendance = recentAttendance.find(a => a.classId === klass.id) ?? null;
      const studentIds = await getStudentsInClass(schoolId, klass.id).catch(() => []);
      const doneToday = classesWithAttendanceToday.has(klass.id);
      return {
        ...klass,
        studentCount: studentIds.length,
        lastAttendanceDate: lastAttendance?.date ?? null,
        lastAttendanceDateFormatted: formatDatePtBr(lastAttendance?.date),
        doneToday,
        statusLabel: klass.status === "active" ? "Ativa" : "Inativa",
      };
    })
  );

  // Pendências: turmas sem chamada hoje
  const pendingClasses = enrichedClasses.filter(c => !c.doneToday && c.status !== "inactive");

  // Notificações não lidas
  const unreadNotifications = notifications.filter(n => n.status === "unread");

  // Métricas
  const totalStudents = enrichedClasses.reduce((acc, c) => acc + c.studentCount, 0);
  const attendanceToday = myTodayAttendance.length;

  // Atividade recente (últimas 5 chamadas)
  const recentActivity = recentAttendance
    .filter(a => a.teacherId === uid)
    .slice(0, 5)
    .map(a => {
      const klass = classes.find(c => c.id === a.classId);
      return {
        id: a.id,
        date: a.date,
        dateFormatted: formatDatePtBr(a.date),
        classId: a.classId,
        className: klass?.name ?? "Turma",
        studentCount: Object.keys(a.students || {}).length,
      };
    });

  return {
    user: { uid, name, email, schoolId },
    greeting: greetingFor(name),
    dateFormatted: formatDatePtBr(dateKey),
    dateKey,
    summary: {
      totalClasses: enrichedClasses.length,
      totalStudents,
      attendanceToday,
      pendingCount: pendingClasses.length,
      unreadNotifications: unreadNotifications.length,
    },
    classes: enrichedClasses,
    pendingClasses,
    notifications: notifications.slice(0, 30),
    unreadNotifications,
    recentActivity,
  };
}
