/**
 * Módulo de Serviço - Responsável pela obtenção e transformação de dados.
 * Simula as chamadas ao Firebase Realtime Database/Firestore.
 */

// Mock de dados para simular o banco (Isolamento Multi-tenant garantido por escola)
const dbMock = {
  school: {
    id: "esc_09123",
    name: "Colégio Ágora",
    city: "São Paulo",
    state: "SP",
    code: "AGR-992-X",
    status: "active",
  },
  director: {
    name: "Fernanda Martins",
    role: "Diretora Geral",
  },
  stats: {
    students: 423,
    teachers: 28,
    guardians: 390,
    classes: 18,
    attendanceToday: 15,
    attendanceRate: 96.4,
  },
  alerts: [
    {
      id: 1,
      type: "danger",
      title: "Turma sem professor",
      message:
        "O 9º Ano B está sem professor vinculado à disciplina de Física.",
    },
    {
      id: 2,
      type: "warning",
      title: "Alunos sem responsável",
      message:
        "Existem 12 alunos cadastrados sem um responsável vinculado no sistema.",
    },
    {
      id: 3,
      type: "danger",
      title: "Chamada atrasada",
      message: "A chamada do 6º Ano A (Manhã) ainda não foi registrada hoje.",
    },
  ],
  classes: [
    {
      id: "t1",
      name: "6º Ano A",
      grade: "Ensino Fundamental II",
      shift: "Manhã",
      studentsCount: 32,
      teacher: "Carlos Eduardo",
    },
    {
      id: "t2",
      name: "7º Ano B",
      grade: "Ensino Fundamental II",
      shift: "Tarde",
      studentsCount: 28,
      teacher: "Mariana Silva",
    },
    {
      id: "t3",
      name: "1ª Série",
      grade: "Ensino Médio",
      shift: "Manhã",
      studentsCount: 35,
      teacher: "Roberto Alves",
    },
    {
      id: "t4",
      name: "9º Ano B",
      grade: "Ensino Fundamental II",
      shift: "Manhã",
      studentsCount: 30,
      teacher: "Sem Professor",
    },
  ],
  teachers: [
    {
      id: "p1",
      name: "Carlos Eduardo",
      email: "carlos@agora.edu",
      classes: "6º Ano A, 7º Ano A",
      status: "active",
    },
    {
      id: "p2",
      name: "Mariana Silva",
      email: "mariana@agora.edu",
      classes: "7º Ano B",
      status: "active",
    },
    {
      id: "p3",
      name: "Julio Costa",
      email: "julio@agora.edu",
      classes: "Nenhuma",
      status: "pending",
    },
    {
      id: "p4",
      name: "Roberto Alves",
      email: "roberto@agora.edu",
      classes: "1ª Série, 2ª Série",
      status: "active",
    },
  ],
  guardians: [
    {
      id: "r1",
      name: "Marcos Almeida",
      email: "marcos.alm@gmail.com",
      childrenCount: 1,
    },
    {
      id: "r2",
      name: "Patrícia Gomes",
      email: "paty.gomes88@hotmail.com",
      childrenCount: 2,
    },
    {
      id: "r3",
      name: "João Souza",
      email: "jsouza.eng@empresa.com",
      childrenCount: 1,
    },
    {
      id: "r4",
      name: "Ana Lúcia Mendes",
      email: "ana.mendes@outlook.com",
      childrenCount: 3,
    },
  ],
  recentActivity: [
    {
      id: 1,
      type: "attendance",
      text: "Chamada registrada - 1ª Série",
      time: "Há 5 min",
      icon: "success",
    },
    {
      id: 2,
      type: "invite",
      text: "Convite gerado para Professor",
      time: "Há 22 min",
      icon: "accent",
    },
    {
      id: 3,
      type: "alert",
      text: "Ausência notificada a Marcos Almeida",
      time: "Há 45 min",
      icon: "warning",
    },
    {
      id: 4,
      type: "register",
      text: "Novo aluno matriculado: Pedro Silva",
      time: "Há 2 horas",
      icon: "accent",
    },
  ],
};

// Funções de serviço simulando latência de rede
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getSchoolContext = async () => {
  await delay(300);
  return { school: dbMock.school, director: dbMock.director };
};

export const getDashboardStats = async () => {
  await delay(400);
  return dbMock.stats;
};

export const getAlerts = async () => {
  await delay(500);
  return dbMock.alerts;
};

export const getClassesData = async () => {
  await delay(300);
  return dbMock.classes;
};

export const getTeachersData = async () => {
  await delay(300);
  return dbMock.teachers;
};

export const getGuardiansData = async () => {
  await delay(300);
  return dbMock.guardians;
};

export const getTimelineData = async () => {
  await delay(400);
  return dbMock.recentActivity;
};

export const renewSchoolCodeService = async () => {
  await delay(600);
  // Simula a geração de um novo código no back-end
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let newCode = "AGR-";
  for (let i = 0; i < 3; i++)
    newCode += chars.charAt(Math.floor(Math.random() * chars.length));
  newCode += "-" + chars.charAt(Math.floor(Math.random() * chars.length));

  dbMock.school.code = newCode;
  return newCode;
};
