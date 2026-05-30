/* ==========================================================================
   SGE v2.0 - MOCK DATA
   Árvore de Dados Realista para Desenvolvimento Offline
   ========================================================================== */

// 🔁 MOCK: Estrutura espelha o Realtime Database
export const MOCK_DB = {
  usuarios: {
    uid_diretor_01: {
      nome: "Dr. Ricardo Oliveira",
      email: "diretor@escola.edu.br",
      role: "diretor",
      plano: "completo",
      status: "ativo",
      cpf: "123.456.789-00",
      escolaId: "esc_01",
    },
    uid_professor_01: {
      nome: "Profa. Ana Souza",
      email: "professor@escola.edu.br",
      role: "professor",
      plano: "simples",
      status: "ativo",
      disciplinas: ["Matemática", "Física"],
      turmas: ["6A", "7B", "1EM-A"],
    },
    uid_pai_01: {
      nome: "Carlos Mendes",
      email: "pai@escola.edu.br",
      role: "pai",
      plano: "simples",
      status: "ativo",
      filhos: ["aluno_01", "aluno_02"],
    },
  },
  turmas: {
    "6A": { nome: "6º Ano A", turno: "Manhã", sala: "101" },
    "7B": { nome: "7º Ano B", turno: "Tarde", sala: "202" },
    "1EM-A": { nome: "1º EM A", turno: "Manhã", sala: "303" },
  },
  alunos: {
    aluno_01: {
      nome: "Lucas Mendes",
      ra: "2024001",
      turma: "6A",
      status: "ativo",
    },
    aluno_02: {
      nome: "Julia Mendes",
      ra: "2024002",
      turma: "1EM-A",
      status: "ativo",
    },
  },
  chamadas: {
    ch_01: {
      turma: "6A",
      disciplina: "Matemática",
      data: "2026-05-14",
      professorId: "uid_professor_01",
      presencas: { aluno_01: true },
    },
  },
  notas: {
    aluno_01: {
      Matemática: { b1: 8.5, b2: 7.0, b3: 0, b4: 0 },
    },
  },
  bilhetes: {
    b_01: {
      titulo: "Reunião de Pais",
      conteudo: "Convidamos para a reunião no dia 20/05.",
      data: "2026-05-10",
      destinatarios: ["6A"],
    },
  },
  notificacoes: {
    uid_pai_01: {
      n_01: {
        titulo: "Falta Registrada",
        corpo: "Lucas faltou na aula de Matemática.",
        lida: false,
      },
    },
  },
};

/**
 * Retorna um snapshot compatível com a API do Firebase
 * @param {string} path
 */
export function getMockSnapshot(path) {
  const parts = path.split("/").filter((p) => p);
  let data = MOCK_DB;
  for (const part of parts) {
    data = data ? data[part] : undefined;
  }

  return {
    exists: () => data !== undefined && data !== null,
    val: () => deepClone(data),
    forEach: (callback) => {
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
          callback({
            key,
            val: () => deepClone(value),
            exists: () => true,
          });
        });
      }
    },
    key: parts[parts.length - 1] || null,
  };
}

/**
 * Evita mutação acidental dos dados de mock
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj));
}

// SGE v2.0 • Mock Data • 2026-05-14
