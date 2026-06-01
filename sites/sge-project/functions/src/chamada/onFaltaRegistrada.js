// ===== [functions/src/notas/onNotaLancada.js] =====
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Trigger: Fired when a new grade is recorded
 * Action: Send grade notification to parents and update metrics
 */
exports.onNotaLancada = functions.database
  .ref("/notas/{turmaId}/{disciplinaId}/{bimestre}/{avaliacaoId}")
  .onCreate(async (snapshot, context) => {
    const startTime = Date.now();
    const { turmaId, disciplinaId, bimestre, avaliacaoId } = context.params;

    try {
      // Validate snapshot data
      const notaData = snapshot.val();
      if (!notaData) {
        console.warn("Empty nota data for ID:", avaliacaoId);
        return null;
      }

      const {
        nomeAvaliacao,
        peso = 1,
        dataLancamento = new Date().getTime(),
        notas = {},
      } = notaData;

      if (!nomeAvaliacao) {
        console.error("Missing nomeAvaliacao for:", avaliacaoId);
        return null;
      }

      console.log("Processing new grades:", avaliacaoId, {
        turmaId,
        disciplinaId,
        bimestre,
        nomeAvaliacao,
        gradesCount: Object.keys(notas).length,
      });

      // Fetch discipline name
      let disciplinaNome = "Disciplina";
      try {
        const discSnapshot = await admin
          .database()
          .ref(`/disciplinas/${disciplinaId}/nome`)
          .once("value");
        if (discSnapshot.exists()) {
          disciplinaNome = discSnapshot.val();
        }
      } catch (discError) {
        console.warn("Error fetching discipline name:", discError.message);
      }

      // Fetch turma name
      let turmaNome = "Turma";
      try {
        const turmaSnapshot = await admin
          .database()
          .ref(`/turmas/${turmaId}/nome`)
          .once("value");
        if (turmaSnapshot.exists()) {
          turmaNome = turmaSnapshot.val();
        }
      } catch (turmaError) {
        console.warn("Error fetching turma name:", turmaError.message);
      }

      // Fetch alunos IDs
      const alunosSnapshot = await admin
        .database()
        .ref(`/turmas/${turmaId}/alunosIds`)
        .once("value");

      if (!alunosSnapshot.exists()) {
        console.warn("No students found for turma:", turmaId);
        return null;
      }

      const alunosIds = alunosSnapshot.val();
      console.log(`Found ${alunosIds.length} students in turma`);

      // Process notifications for each student
      const notificationPromises = [];

      for (const alunoId of alunosIds) {
        try {
          // Fetch parents IDs
          const paisIdsSnapshot = await admin
            .database()
            .ref(`/alunos/${alunoId}/paisIds`)
            .once("value");

          if (!paisIdsSnapshot.exists()) {
            continue;
          }

          const paisIds = paisIdsSnapshot.val();

          // Send notification to each parent
          for (const paiId of paisIds) {
            notificationPromises.push(
              sendGradeNotification(
                paiId,
                alunoId,
                disciplinaNome,
                nomeAvaliacao,
                avaliacaoId,
                bimestre,
                turmaId,
              ),
            );
          }

          // Update average if this is a graded evaluation
          if (notas[alunoId] !== undefined && notas[alunoId] !== null) {
            try {
              await updateStudentAverage(
                alunoId,
                turmaId,
                disciplinaId,
                bimestre,
                notas[alunoId],
                peso,
              );
            } catch (avgError) {
              console.error("Error updating average:", avgError.message);
            }
          }
        } catch (studentError) {
          console.error(
            "Error processing student for notifications:",
            alunoId,
            studentError.message,
          );
        }
      }

      // Wait for all notifications
      const results = await Promise.allSettled(notificationPromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      // Update metrics
      try {
        await admin
          .database()
          .ref("/metrics/notasLancadas")
          .transaction((current) => (current || 0) + 1);
      } catch (metricsError) {
        console.error("Error updating metrics:", metricsError.message);
      }

      const duration = Date.now() - startTime;
      console.log(
        `Notificações de notas enviadas para turma: ${turmaId} (${duration}ms)`,
        {
          successCount,
          failureCount,
        },
      );

      return {
        success: true,
        avaliacaoId: avaliacaoId,
        successCount: successCount,
        failureCount: failureCount,
        duration: duration,
      };
    } catch (error) {
      console.error("Error in onNotaLancada:", error.message, {
        avaliacaoId: avaliacaoId,
        stack: error.stack,
      });
      throw error;
    }
  });

/**
 * Helper function to send grade notification to a parent
 */
async function sendGradeNotification(
  paiId,
  alunoId,
  disciplinaNome,
  nomeAvaliacao,
  avaliacaoId,
  bimestre,
  turmaId,
) {
  try {
    // Fetch parent data
    const paiSnapshot = await admin
      .database()
      .ref(`/usuarios/${paiId}`)
      .once("value");

    if (!paiSnapshot.exists()) {
      return null;
    }

    const paiData = paiSnapshot.val();
    const { fcmToken, status } = paiData;

    // Skip if parent is inactive or has no token
    if (status !== "ativo" || !fcmToken) {
      return null;
    }

    // Prepare FCM message
    const message = {
      notification: {
        title: "Nova Nota Lançada",
        body: `Nota de ${disciplinaNome} (${nomeAvaliacao}) disponível no boletim.`,
      },
      data: {
        type: "nota",
        avaliacaoId: avaliacaoId,
        disciplinaId: disciplinaNome,
        bimestre: bimestre,
        turmaId: turmaId,
        alunoId: alunoId,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "normal",
        notification: {
          sound: "default",
          channelId: "notas",
        },
      },
      apns: {
        headers: {
          "apns-priority": "5",
        },
      },
    };

    // Send notification
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: message.notification,
      data: message.data,
      android: message.android,
      apns: message.apns,
    });

    console.log("Grade notification sent to parent:", paiId, {
      messageId,
      avaliacaoId,
    });

    return {
      success: true,
      paiId: paiId,
    };
  } catch (error) {
    // Handle invalid tokens
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.warn("Removing invalid FCM token for parent:", paiId);
      await admin.database().ref(`/usuarios/${paiId}/fcmToken`).remove();
    } else {
      console.error("Error sending grade notification:", paiId, error.message);
    }
    throw error;
  }
}

/**
 * Helper function to update student's average grade
 */
async function updateStudentAverage(
  alunoId,
  turmaId,
  disciplinaId,
  bimestre,
  nota,
  peso,
) {
  try {
    const averageRef = admin
      .database()
      .ref(`/boletim/${alunoId}/${turmaId}/${disciplinaId}/${bimestre}`);

    await averageRef.transaction((current) => {
      if (!current) {
        current = {
          media: 0,
          totalPeso: 0,
          notas: [],
        };
      }

      // Calculate weighted average
      current.totalPeso = (current.totalPeso || 0) + peso;
      const newMedia =
        ((current.media || 0) * ((current.totalPeso || 0) - peso) +
          nota * peso) /
        current.totalPeso;

      current.media = parseFloat(newMedia.toFixed(2));
      current.notas = current.notas || [];
      current.notas.push({
        nota: nota,
        peso: peso,
        timestamp: new Date().getTime(),
      });

      return current;
    });

    console.log("Student average updated:", {
      alunoId,
      turmaId,
      disciplinaId,
      bimestre,
    });

    return true;
  } catch (error) {
    console.error("Error updating student average:", error.message);
    throw error;
  }
}

// SGE v2.0 • onNotaLancada • 2026-05-15
