// Firebase Cloud Functions para SGE v2.0
// Versão: 2.0.0

const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
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
 * Em um ambiente de produção, esta função faria uma chamada real a uma API de e-mail.
 */
const sendEmail = async (to, subject, body) => {
  console.log(`[EMAIL_STUB] Enviando e-mail para: ${to}`);
  console.log(`[EMAIL_STUB] Assunto: ${subject}`);
  console.log(`[EMAIL_STUB] Corpo: ${body}`);
  // Simula um atraso para a chamada da API de e-mail
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true, message: "E-mail simulado enviado com sucesso." };
};

/**
 * @function onProfessorCreated
 * @description Triggered when a new professor registration is created in `/cadastrosPendentes/{uid}`.
 * Sends an FCM notification to the director and logs the event.
 */
exports.onProfessorCreated = onValueCreated(
  "/cadastrosPendentes/{uid}",
  async (event) => {
    const snapshot = event.data;
    const uid = event.params.uid;
    const professorData = snapshot.val();

    if (!professorData) {
      console.log(
        `[onProfessorCreated] No data found for new registration ${uid}. Aborting.`,
      );
      return null;
    }

    try {
      console.log(
        `[onProfessorCreated] Novo cadastro pendente detectado para ${professorData.nome} (UID: ${uid}).`,
      );

      // Envia notificação FCM para o diretor (assumindo um token de diretor)
      // Em um cenário real, o token do diretor seria buscado de um local seguro (ex: /diretores/{uid}/fcmToken)
      const directorFcmToken = "YOUR_DIRECTOR_FCM_TOKEN"; // Placeholder
      if (directorFcmToken === "YOUR_DIRECTOR_FCM_TOKEN") {
        console.warn(
          "[onProfessorCreated] FCM Token do diretor não configurado. Notificação não enviada.",
        );
      } else {
        const message = {
          notification: {
            title: "Novo Cadastro de Professor",
            body: `Um novo professor, ${professorData.nome}, aguarda sua aprovação.`,
          },
          token: directorFcmToken,
        };
        await getMessaging().send(message);
        console.log(
          `[onProfessorCreated] Notificação FCM enviada para o diretor sobre ${professorData.nome}.`,
        );
      }

      // Loga o evento no Realtime Database
      await getDatabase().ref(`/logs/cadastros/${uid}`).set({
        timestamp: Date.now(),
        action: "cadastro_pendente",
        professorUid: uid,
        professorNome: professorData.nome,
        status: "notificado_diretor",
      });
      console.log(
        `[onProfessorCreated] Evento de cadastro pendente logado para ${uid}.`,
      );
    } catch (error) {
      console.error(
        `[onProfessorCreated] Erro ao processar novo cadastro ${uid}:`,
        error,
      );
      // Implementar retry automático ou mecanismo de fila de mensagens se necessário
      throw new Error(
        `Failed to process new professor registration: ${error.message}`,
      );
    }
    return null;
  },
);

/**
 * @function onApproval
 * @description Triggered when a user's data is updated in `/usuarios/{uid}`.
 * If `status` changes to 'ativo', sends a welcome email to the professor.
 */
exports.onApproval = onValueUpdated("/usuarios/{uid}", async (event) => {
  const beforeData = event.data.before.val();
  const afterData = event.data.after.val();
  const uid = event.params.uid;

  // Verifica se o status mudou para 'ativo'
  if (
    beforeData.status !== "ativo" &&
    afterData.status === "ativo" &&
    afterData.role === "professor"
  ) {
    try {
      console.log(
        `[onApproval] Professor ${afterData.nome} (UID: ${uid}) aprovado. Enviando e-mail de boas-vindas.`,
      );

      // Set custom claims for RBAC (role) to improve rules performance and security
      try {
        await getAuth().setCustomUserClaims(uid, { role: afterData.role });
        console.log(
          `[onApproval] Custom claims set for ${uid}: role=${afterData.role}`,
        );
      } catch (claimErr) {
        console.error(
          `[onApproval] Failed to set custom claims for ${uid}:`,
          claimErr,
        );
      }

      const subject = "Bem-vindo(a) ao SGE v2.0!";
      const body = `Olá ${afterData.nome},

Seu cadastro como professor no SGE v2.0 foi aprovado! Você já pode acessar o sistema com suas credenciais.

Atenciosamente,
Equipe SGE v2.0`;

      await sendEmail(afterData.email, subject, body);
      console.log(
        `[onApproval] E-mail de boas-vindas enviado para ${afterData.email}.`,
      );

      // Loga o evento
      await getDatabase()
        .ref(`/logs/aprovacoes/${uid}`)
        .set({
          timestamp: Date.now(),
          action: "professor_aprovado",
          professorUid: uid,
          professorNome: afterData.nome,
          aprovadoPor: afterData.aprovadoPor || "sistema",
        });
      console.log(`[onApproval] Evento de aprovação logado para ${uid}.`);
    } catch (error) {
      console.error(
        `[onApproval] Erro ao enviar e-mail de boas-vindas para ${uid}:`,
        error,
      );
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
  return null;
});

/**
 * @function onFaltaRegistrada
 * @description Triggered when a new absence is created in `/chamadas/{turmaId}/{data}/{chamadaId}`.
 * Fetches parents' FCM tokens and sends a multicast notification.
 */
exports.onFaltaRegistrada = onValueCreated(
  "/chamadas/{turmaId}/{data}/{chamadaId}",
  async (event) => {
    const snapshot = event.data;
    const { turmaId, data, chamadaId } = event.params;
    const faltaData = snapshot.val();

    if (!faltaData || !faltaData.alunoUid) {
      console.log(
        `[onFaltaRegistrada] No valid data for absence ${chamadaId}. Aborting.`,
      );
      return null;
    }

    try {
      console.log(
        `[onFaltaRegistrada] Falta registrada para aluno ${faltaData.alunoUid} na turma ${turmaId}.`,
      );

      // Busca os UIDs dos pais do aluno
      const parentUidsSnapshot = await getDatabase()
        .ref(`/alunos/${faltaData.alunoUid}/responsaveis`)
        .once("value");
      const parentUids = parentUidsSnapshot.val()
        ? Object.keys(parentUidsSnapshot.val())
        : [];

      if (parentUids.length === 0) {
        console.log(
          `[onFaltaRegistrada] Nenhum responsável encontrado para o aluno ${faltaData.alunoUid}.`,
        );
        return null;
      }

      // Busca os tokens FCM dos pais
      const fcmTokens = [];
      for (const parentUid of parentUids) {
        const tokenSnapshot = await getDatabase()
          .ref(`/usuarios/${parentUid}/fcmToken`)
          .once("value");
        const token = tokenSnapshot.val();
        if (token) {
          fcmTokens.push(token);
        }
      }

      if (fcmTokens.length === 0) {
        console.log(
          `[onFaltaRegistrada] Nenhum token FCM encontrado para os responsáveis do aluno ${faltaData.alunoUid}.`,
        );
        return null;
      }

      const message = {
        notification: {
          title: "Registro de Falta",
          body: `Seu filho(a) ${faltaData.alunoNome} registrou uma falta na aula de ${faltaData.disciplina}.`,
        },
        tokens: fcmTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(
        `[onFaltaRegistrada] Notificação FCM multicast enviada para ${response.successCount} pais. Erros: ${response.failureCount}.`,
      );

      // Loga o evento
      await getDatabase().ref(`/logs/faltas/${chamadaId}`).set({
        timestamp: Date.now(),
        action: "falta_registrada",
        alunoUid: faltaData.alunoUid,
        alunoNome: faltaData.alunoNome,
        turmaId: turmaId,
        data: data,
        disciplina: faltaData.disciplina,
        notificados: response.successCount,
        erros: response.failureCount,
      });
      console.log(
        `[onFaltaRegistrada] Evento de falta logado para ${chamadaId}.`,
      );
    } catch (error) {
      console.error(
        `[onFaltaRegistrada] Erro ao registrar falta ${chamadaId}:`,
        error,
      );
      throw new Error(
        `Failed to process absence registration: ${error.message}`,
      );
    }
    return null;
  },
);

/**
 * @function onBilheteEnviado
 * @description Triggered when a new message (bilhete) is created in `/bilhetes/{id}`.
 * Notifies the recipient via FCM and updates the message status to 'entregue'.
 */
exports.onBilheteEnviado = onValueCreated("/bilhetes/{id}", async (event) => {
  const snapshot = event.data;
  const bilheteId = event.params.id;
  const bilheteData = snapshot.val();

  if (!bilheteData || !bilheteData.destinatarioUid) {
    console.log(
      `[onBilheteEnviado] No valid data for message ${bilheteId}. Aborting.`,
    );
    return null;
  }

  try {
    console.log(
      `[onBilheteEnviado] Novo bilhete enviado para ${bilheteData.destinatarioUid} (ID: ${bilheteId}).`,
    );

    // Busca o token FCM do destinatário
    const recipientTokenSnapshot = await getDatabase()
      .ref(`/usuarios/${bilheteData.destinatarioUid}/fcmToken`)
      .once("value");
    const recipientToken = recipientTokenSnapshot.val();

    if (recipientToken) {
      const message = {
        notification: {
          title: `Novo Bilhete de ${bilheteData.remetenteNome}`,
          body: bilheteData.assunto,
        },
        data: {
          bilheteId: bilheteId,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        token: recipientToken,
      };
      await getMessaging().send(message);
      console.log(
        `[onBilheteEnviado] Notificação FCM enviada para ${bilheteData.destinatarioUid}.`,
      );
    } else {
      console.log(
        `[onBilheteEnviado] Nenhum token FCM encontrado para o destinatário ${bilheteData.destinatarioUid}.`,
      );
    }

    // Atualiza o status do bilhete para 'entregue'
    await getDatabase()
      .ref(`/bilhetes/${bilheteId}`)
      .update({ status: "entregue", entregueEm: Date.now() });
    console.log(
      `[onBilheteEnviado] Status do bilhete ${bilheteId} atualizado para 'entregue'.`,
    );

    // Loga o evento
    await getDatabase().ref(`/logs/bilhetes/${bilheteId}`).set({
      timestamp: Date.now(),
      action: "bilhete_enviado",
      bilheteId: bilheteId,
      remetenteUid: bilheteData.remetenteUid,
      destinatarioUid: bilheteData.destinatarioUid,
      status: "entregue",
    });
    console.log(
      `[onBilheteEnviado] Evento de bilhete enviado logado para ${bilheteId}.`,
    );
  } catch (error) {
    console.error(
      `[onBilheteEnviado] Erro ao processar bilhete ${bilheteId}:`,
      error,
    );
    throw new Error(`Failed to process message: ${error.message}`);
  }
  return null;
});

/**
 * @function onNotaLancada
 * @description Triggered when a new grade is created in `/notas/{turmaId}/{disciplinaId}/{bimestre}/{avaliacaoId}`.
 * Pushes a notification to parents of students in the relevant class.
 */
exports.onNotaLancada = onValueCreated(
  "/notas/{turmaId}/{disciplinaId}/{bimestre}/{avaliacaoId}",
  async (event) => {
    const snapshot = event.data;
    const { turmaId, disciplinaId, bimestre, avaliacaoId } = event.params;
    const notaData = snapshot.val();

    if (!notaData || !notaData.alunoUid) {
      console.log(
        `[onNotaLancada] No valid data for grade ${avaliacaoId}. Aborting.`,
      );
      return null;
    }

    try {
      console.log(
        `[onNotaLancada] Nova nota lançada para aluno ${notaData.alunoUid} na turma ${turmaId}.`,
      );

      // Busca os UIDs dos pais do aluno
      const parentUidsSnapshot = await getDatabase()
        .ref(`/alunos/${notaData.alunoUid}/responsaveis`)
        .once("value");
      const parentUids = parentUidsSnapshot.val()
        ? Object.keys(parentUidsSnapshot.val())
        : [];

      if (parentUids.length === 0) {
        console.log(
          `[onNotaLancada] Nenhum responsável encontrado para o aluno ${notaData.alunoUid}.`,
        );
        return null;
      }

      // Busca os tokens FCM dos pais
      const fcmTokens = [];
      for (const parentUid of parentUids) {
        const tokenSnapshot = await getDatabase()
          .ref(`/usuarios/${parentUid}/fcmToken`)
          .once("value");
        const token = tokenSnapshot.val();
        if (token) {
          fcmTokens.push(token);
        }
      }

      if (fcmTokens.length === 0) {
        console.log(
          `[onNotaLancada] Nenhum token FCM encontrado para os responsáveis do aluno ${notaData.alunoUid}.`,
        );
        return null;
      }

      const message = {
        notification: {
          title: "Nova Nota Lançada",
          body: `Seu filho(a) ${notaData.alunoNome} recebeu uma nota em ${notaData.disciplina} (${notaData.valor}).`,
        },
        tokens: fcmTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(
        `[onNotaLancada] Notificação FCM multicast enviada para ${response.successCount} pais. Erros: ${response.failureCount}.`,
      );

      // Loga o evento
      await getDatabase().ref(`/logs/notas/${avaliacaoId}`).set({
        timestamp: Date.now(),
        action: "nota_lancada",
        alunoUid: notaData.alunoUid,
        alunoNome: notaData.alunoNome,
        turmaId: turmaId,
        disciplinaId: disciplinaId,
        bimestre: bimestre,
        avaliacaoId: avaliacaoId,
        valor: notaData.valor,
        notificados: response.successCount,
        erros: response.failureCount,
      });
      console.log(
        `[onNotaLancada] Evento de nota lançada logado para ${avaliacaoId}.`,
      );
    } catch (error) {
      console.error(
        `[onNotaLancada] Erro ao lançar nota ${avaliacaoId}:`,
        error,
      );
      throw new Error(`Failed to process grade registration: ${error.message}`);
    }
    return null;
  },
);

// Para `firebase.json` e `package.json` (exemplo)
/*
// firebase.json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}

// package.json (dentro da pasta functions)
{
  "name": "functions",
  "description": "Cloud Functions for Firebase SGE v2.0",
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.11.0", // Verifique a versão mais recente
    "firebase-functions": "^4.5.0" // Verifique a versão mais recente
  },
  "private": true
}
*/
