// Firebase Cloud Functions para SGE v2.0
// Versão: 2.1.0

const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onValueCreated,
  onValueUpdated,
} = require("firebase-functions/v2/database");

// Inicializa o Firebase Admin SDK
initializeApp();

// Configurações globais para as funções
setGlobalOptions({ maxInstances: 10, timeoutSeconds: 60 });

/**
 * Simulação de serviço de e-mail transacional (SendGrid, etc.)
 */
const sendEmail = async (to, subject, body) => {
  console.log(`[EMAIL_STUB] Enviando e-mail para: ${to}`);
  console.log(`[EMAIL_STUB] Assunto: ${subject}`);
  console.log(`[EMAIL_STUB] Corpo: ${body}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true, message: "E-mail simulado enviado com sucesso." };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifica se o push deve ser enviado considerando
 * a restrição de horário configurada pelo responsável.
 */
function dentroDoHorarioPermitido(responsavel) {
  if (!responsavel.foraHorario) return true;

  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();

  const [hIni, mIni] = (responsavel.horarioInicio || "22:00")
    .split(":")
    .map(Number);
  const [hFim, mFim] = (responsavel.horarioFim || "07:00")
    .split(":")
    .map(Number);
  const inicio = hIni * 60 + mIni;
  const fim = hFim * 60 + mFim;

  // Janela pode cruzar meia-noite (ex: 22:00 → 07:00)
  if (inicio > fim) {
    return !(horaAtual >= inicio || horaAtual <= fim);
  }
  return !(horaAtual >= inicio && horaAtual <= fim);
}

// ── FUNÇÃO 1: onProfessorCreated ──────────────────────────────────────────────

/**
 * Dispara quando um novo cadastro pendente é criado em /cadastrosPendentes/{uid}.
 * Notifica o diretor via FCM e loga o evento.
 */
exports.onProfessorCreated = onValueCreated(
  "/cadastrosPendentes/{uid}",
  async (event) => {
    const snapshot = event.data;
    const uid = event.params.uid;
    const professorData = snapshot.val();

    if (!professorData) {
      console.log(`[onProfessorCreated] Sem dados para ${uid}. Abortando.`);
      return null;
    }

    try {
      console.log(
        `[onProfessorCreated] Novo cadastro pendente: ${professorData.nome} (${uid})`,
      );

      const directorFcmToken = "YOUR_DIRECTOR_FCM_TOKEN";
      if (directorFcmToken === "YOUR_DIRECTOR_FCM_TOKEN") {
        console.warn(
          "[onProfessorCreated] Token FCM do diretor não configurado.",
        );
      } else {
        await getMessaging().send({
          notification: {
            title: "Novo Cadastro de Professor",
            body: `${professorData.nome} aguarda aprovação.`,
          },
          token: directorFcmToken,
        });
      }

      await getDatabase().ref(`/logs/cadastros/${uid}`).set({
        timestamp: Date.now(),
        action: "cadastro_pendente",
        professorUid: uid,
        professorNome: professorData.nome,
        status: "notificado_diretor",
      });
    } catch (error) {
      console.error(`[onProfessorCreated] Erro:`, error);
      throw new Error(
        `Failed to process new professor registration: ${error.message}`,
      );
    }
    return null;
  },
);

// ── FUNÇÃO 2: onApproval ──────────────────────────────────────────────────────

/**
 * Dispara quando o status de um usuário muda para 'ativo'.
 * Envia e-mail de boas-vindas e define custom claims de role.
 */
exports.onApproval = onValueUpdated("/usuarios/{uid}", async (event) => {
  const beforeData = event.data.before.val();
  const afterData = event.data.after.val();
  const uid = event.params.uid;

  if (
    beforeData.status !== "ativo" &&
    afterData.status === "ativo" &&
    afterData.role === "professor"
  ) {
    try {
      console.log(
        `[onApproval] Professor ${afterData.nome} (${uid}) aprovado.`,
      );

      try {
        await getAuth().setCustomUserClaims(uid, { role: afterData.role });
        console.log(`[onApproval] Custom claims definidos para ${uid}`);
      } catch (claimErr) {
        console.error(`[onApproval] Falha ao definir custom claims:`, claimErr);
      }

      await sendEmail(
        afterData.email,
        "Bem-vindo(a) ao SGE v2.0!",
        `Olá ${afterData.nome},\n\nSeu cadastro foi aprovado! Acesse o sistema com suas credenciais.\n\nEquipe SGE v2.0`,
      );

      await getDatabase()
        .ref(`/logs/aprovacoes/${uid}`)
        .set({
          timestamp: Date.now(),
          action: "professor_aprovado",
          professorUid: uid,
          professorNome: afterData.nome,
          aprovadoPor: afterData.aprovadoPor || "sistema",
        });
    } catch (error) {
      console.error(`[onApproval] Erro:`, error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
  return null;
});

// ── FUNÇÃO 3: onFaltaRegistrada ───────────────────────────────────────────────

/**
 * Dispara quando uma chamada é criada em /chamadas/{chamadaId}.
 *
 * Formato esperado (gerado pelo dashboard-professor.v2.js):
 *   /chamadas/{chamadaId}/
 *     professorId, professorNome, turmaId, turmaNome, disciplina,
 *     data (YYYY-MM-DD), timestamp,
 *     alunos: [ { uid, nome, status: "P"|"F"|"J" } ]
 *
 * Para cada aluno com status "F":
 *   1. Busca responsavelId em /alunos/{uid}/responsavelId
 *   2. Escreve entrega no inbox do pai /entregas/{responsavelId}/{chamadaId}_{uid}
 *   3. Envia push FCM se o pai tiver token e notificações ativas
 */
exports.onFaltaRegistrada = onValueCreated(
  "/chamadas/{chamadaId}",
  async (event) => {
    const chamadaId = event.params.chamadaId;
    const chamada = event.data.val();

    if (!chamada || !Array.isArray(chamada.alunos)) {
      console.log(
        `[onFaltaRegistrada] Chamada ${chamadaId} sem alunos. Abortando.`,
      );
      return null;
    }

    // Filtra apenas os alunos que faltaram
    const alunosFaltosos = chamada.alunos.filter((a) => a.status === "F");

    if (!alunosFaltosos.length) {
      console.log(
        `[onFaltaRegistrada] Chamada ${chamadaId} sem faltas. Nada a notificar.`,
      );
      return null;
    }

    console.log(
      `[onFaltaRegistrada] ${alunosFaltosos.length} falta(s) em ${chamadaId}.`,
    );

    const db = getDatabase();
    const messaging = getMessaging();
    const dataFmt = chamada.data
      ? new Date(chamada.data + "T12:00:00").toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    let notificados = 0;
    let erros = 0;

    for (const aluno of alunosFaltosos) {
      if (!aluno.uid) continue;

      try {
        // 1. Busca responsavelId do aluno
        const alunoSnap = await db.ref(`/alunos/${aluno.uid}`).once("value");
        if (!alunoSnap.exists()) {
          console.warn(
            `[onFaltaRegistrada] Aluno ${aluno.uid} não encontrado no banco.`,
          );
          continue;
        }

        const alunoData = alunoSnap.val();
        const responsavelId = alunoData.responsavelId;

        if (!responsavelId) {
          console.warn(
            `[onFaltaRegistrada] Aluno ${aluno.uid} sem responsavelId.`,
          );
          continue;
        }

        // 2. Busca dados do responsável
        const respSnap = await db
          .ref(`/usuarios/${responsavelId}`)
          .once("value");
        if (!respSnap.exists()) {
          console.warn(
            `[onFaltaRegistrada] Responsável ${responsavelId} não encontrado.`,
          );
          continue;
        }

        const responsavel = respSnap.val();

        // 3. Monta conteúdo
        const entregaId = `${chamadaId}_${aluno.uid}`;
        const titulo = `⚠️ Falta registrada — ${aluno.nome}`;
        const conteudo = `${aluno.nome} faltou em ${chamada.disciplina} em ${dataFmt} (${chamada.turmaNome ?? chamada.turmaId}).`;
        const linkAcao = `/pai/boletim.html?aluno=${aluno.uid}`;

        // 4. Fan-out: escreve no inbox do responsável
        await db.ref(`/entregas/${responsavelId}/${entregaId}`).set({
          lido: false,
          lidoEm: null,
          tipo: "falta",
          titulo,
          conteudo,
          linkAcao,
          alunoId: aluno.uid,
          alunoNome: aluno.nome,
          disciplina: chamada.disciplina ?? "",
          turma: chamada.turmaNome ?? chamada.turmaId ?? "",
          data: chamada.data ?? "",
          chamadaId,
          criadoEm: new Date().toISOString(),
        });

        console.log(
          `[onFaltaRegistrada] Entrega criada: entregas/${responsavelId}/${entregaId}`,
        );

        // 5. Push FCM
        const fcmToken = responsavel.fcmToken;
        const notifAtiva = responsavel.notificacoes?.faltas !== false;
        const horarioOk = dentroDoHorarioPermitido(responsavel);

        if (fcmToken && notifAtiva && horarioOk) {
          try {
            await messaging.send({
              token: fcmToken,
              notification: { title: titulo, body: conteudo },
              data: {
                tipo: "falta",
                chamadaId,
                alunoId: aluno.uid,
                link: linkAcao,
              },
              webpush: {
                notification: {
                  icon: "/assets/img/logo.png",
                  badge: "/assets/img/badge.png",
                  click_action: linkAcao,
                },
                fcmOptions: { link: linkAcao },
              },
            });
            notificados++;
            console.log(
              `[onFaltaRegistrada] Push FCM enviado para ${responsavelId}`,
            );
          } catch (fcmErr) {
            erros++;
            // Token inválido — remove do banco
            if (
              fcmErr.code === "messaging/invalid-registration-token" ||
              fcmErr.code === "messaging/registration-token-not-registered"
            ) {
              console.warn(
                `[onFaltaRegistrada] Token inválido para ${responsavelId}. Removendo.`,
              );
              await db.ref(`/usuarios/${responsavelId}/fcmToken`).remove();
            } else {
              console.error(
                `[onFaltaRegistrada] Erro FCM para ${responsavelId}:`,
                fcmErr.message,
              );
            }
          }
        } else {
          console.log(
            `[onFaltaRegistrada] Push não enviado para ${responsavelId}. ` +
              `Token: ${!!fcmToken}, Notif: ${notifAtiva}, Horário: ${horarioOk}`,
          );
        }
      } catch (alunoErr) {
        erros++;
        console.error(
          `[onFaltaRegistrada] Erro ao processar aluno ${aluno.uid}:`,
          alunoErr,
        );
      }
    }

    // 6. Loga o resultado da chamada
    await db.ref(`/logs/faltas/${chamadaId}`).set({
      timestamp: Date.now(),
      action: "falta_registrada",
      chamadaId,
      turmaId: chamada.turmaId ?? "",
      turmaNome: chamada.turmaNome ?? "",
      disciplina: chamada.disciplina ?? "",
      data: chamada.data ?? "",
      totalFaltas: alunosFaltosos.length,
      notificados,
      erros,
    });

    console.log(
      `[onFaltaRegistrada] Concluído. Notificados: ${notificados}, Erros: ${erros}`,
    );
    return null;
  },
);

// ── FUNÇÃO 4: onBilheteEnviado ────────────────────────────────────────────────

/**
 * Dispara quando um bilhete é criado em /bilhetes/{id}.
 * Notifica o destinatário via FCM e atualiza status para 'entregue'.
 */
exports.onBilheteEnviado = onValueCreated("/bilhetes/{id}", async (event) => {
  const bilheteId = event.params.id;
  const bilheteData = event.data.val();

  if (!bilheteData?.destinatarioUid) {
    console.log(
      `[onBilheteEnviado] Bilhete ${bilheteId} sem destinatário. Abortando.`,
    );
    return null;
  }

  try {
    console.log(
      `[onBilheteEnviado] Bilhete ${bilheteId} para ${bilheteData.destinatarioUid}`,
    );

    const db = getDatabase();
    const tokenSnap = await db
      .ref(`/usuarios/${bilheteData.destinatarioUid}/fcmToken`)
      .once("value");
    const token = tokenSnap.val();

    if (token) {
      await getMessaging().send({
        notification: {
          title: `Novo Bilhete de ${bilheteData.remetenteNome}`,
          body: bilheteData.assunto,
        },
        data: { bilheteId, click_action: "FLUTTER_NOTIFICATION_CLICK" },
        token,
      });
      console.log(
        `[onBilheteEnviado] Push enviado para ${bilheteData.destinatarioUid}`,
      );
    }

    await db.ref(`/bilhetes/${bilheteId}`).update({
      status: "entregue",
      entregueEm: Date.now(),
    });

    await db.ref(`/logs/bilhetes/${bilheteId}`).set({
      timestamp: Date.now(),
      action: "bilhete_enviado",
      bilheteId,
      remetenteUid: bilheteData.remetenteUid,
      destinatarioUid: bilheteData.destinatarioUid,
      status: "entregue",
    });
  } catch (error) {
    console.error(`[onBilheteEnviado] Erro:`, error);
    throw new Error(`Failed to process message: ${error.message}`);
  }
  return null;
});

// ── FUNÇÃO 5: onNotaLancada ───────────────────────────────────────────────────

/**
 * Dispara quando uma nota é criada em /notas/{turmaId}/{disciplinaId}/{bimestre}/{avaliacaoId}.
 * Notifica o responsável do aluno via FCM.
 */
exports.onNotaLancada = onValueCreated(
  "/notas/{turmaId}/{disciplinaId}/{bimestre}/{avaliacaoId}",
  async (event) => {
    const { turmaId, disciplinaId, bimestre, avaliacaoId } = event.params;
    const notaData = event.data.val();

    if (!notaData?.alunoUid) {
      console.log(
        `[onNotaLancada] Sem dados válidos para ${avaliacaoId}. Abortando.`,
      );
      return null;
    }

    try {
      console.log(
        `[onNotaLancada] Nota para aluno ${notaData.alunoUid} na turma ${turmaId}`,
      );

      const db = getDatabase();

      // Busca responsavelId (singular)
      const alunoSnap = await db
        .ref(`/alunos/${notaData.alunoUid}/responsavelId`)
        .once("value");
      const responsavelId = alunoSnap.val();

      if (!responsavelId) {
        console.log(
          `[onNotaLancada] Aluno ${notaData.alunoUid} sem responsavelId.`,
        );
        return null;
      }

      const tokenSnap = await db
        .ref(`/usuarios/${responsavelId}/fcmToken`)
        .once("value");
      const token = tokenSnap.val();

      if (!token) {
        console.log(`[onNotaLancada] Sem token FCM para ${responsavelId}.`);
        return null;
      }

      const response = await getMessaging().sendEachForMulticast({
        notification: {
          title: "Nova Nota Lançada",
          body: `${notaData.alunoNome} recebeu nota em ${notaData.disciplina} (${notaData.valor}).`,
        },
        tokens: [token],
      });

      console.log(
        `[onNotaLancada] FCM: ${response.successCount} enviados, ${response.failureCount} erros.`,
      );

      await db.ref(`/logs/notas/${avaliacaoId}`).set({
        timestamp: Date.now(),
        action: "nota_lancada",
        alunoUid: notaData.alunoUid,
        alunoNome: notaData.alunoNome,
        turmaId,
        disciplinaId,
        bimestre,
        avaliacaoId,
        valor: notaData.valor,
        notificados: response.successCount,
        erros: response.failureCount,
      });
    } catch (error) {
      console.error(`[onNotaLancada] Erro:`, error);
      throw new Error(`Failed to process grade: ${error.message}`);
    }
    return null;
  },
);

// ── FUNÇÃO 6: onEntregaLida ───────────────────────────────────────────────────

/**
 * Dispara quando o pai marca uma entrega como lida.
 * Registra a data/hora da leitura.
 */
exports.onEntregaLida = onValueUpdated(
  "/entregas/{uid}/{entregaId}/lido",
  async (event) => {
    const antes = event.data.before.val();
    const depois = event.data.after.val();

    if (antes === false && depois === true) {
      const { uid, entregaId } = event.params;
      await getDatabase().ref(`/entregas/${uid}/${entregaId}`).update({
        lidoEm: new Date().toISOString(),
      });
      console.log(`[onEntregaLida] Entrega ${entregaId} lida por ${uid}`);
    }
    return null;
  },
);
