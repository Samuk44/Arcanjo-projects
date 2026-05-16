// ===== [functions/src/chamada/onFaltaRegistrada.js] =====
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Trigger: Fired when attendance is recorded
 * Action: Send falta (absence) notifications to parents of absent students
 */
exports.onFaltaRegistrada = functions.database
  .ref("/chamadas/{turmaId}/{data}/{chamadaId}")
  .onCreate(async (snapshot, context) => {
    const startTime = Date.now();
    const { turmaId, data } = context.params;
    const chamadaId = context.params.chamadaId;

    try {
      // Validate snapshot data
      const chamadaData = snapshot.val();
      if (!chamadaData) {
        console.warn("Empty chamada data for ID:", chamadaId);
        return null;
      }

      const { alunos = {}, disciplina = "Aula" } = chamadaData;

      // Find absent students (status 'F')
      const alunosFaltosos = Object.entries(alunos)
        .filter(([_, status]) => status === "F")
        .map(([alunoId, _]) => alunoId);

      if (alunosFaltosos.length === 0) {
        console.log("No absent students in this attendance record:", chamadaId);
        return null;
      }

      console.log("Processing faltas for", alunosFaltosos.length, "students:", {
        turmaId,
        data,
        disciplina,
      });

      // Process each absent student
      const notificationPromises = [];

      for (const alunoId of alunosFaltosos) {
        try {
          // Fetch student data
          const alunoSnapshot = await admin
            .database()
            .ref(`/alunos/${alunoId}`)
            .once("value");

          if (!alunoSnapshot.exists()) {
            console.warn("Student not found:", alunoId);
            continue;
          }

          const alunoData = alunoSnapshot.val();
          const { nome: nomeAluno, paisIds = [] } = alunoData;

          if (!nomeAluno) {
            console.warn("Student name not found:", alunoId);
            continue;
          }

          // Update student absence count
          try {
            await admin
              .database()
              .ref(`/alunos/${alunoId}/totalFaltas`)
              .transaction((current) => (current || 0) + 1);
          } catch (countError) {
            console.error("Error updating falta count:", countError.message);
          }

          // Check if student reached absence limit (>25% of classes)
          // This would need to query total classes - simplified here
          let sendAlertLimit = false;
          try {
            const totalFaltasSnapshot = await admin
              .database()
              .ref(`/alunos/${alunoId}/totalFaltas`)
              .once("value");
            const totalFaltas = totalFaltasSnapshot.val() || 0;

            // Assume ~200 classes per year, alert at 50+ absences (>25%)
            if (totalFaltas > 50) {
              sendAlertLimit = true;
            }
          } catch (limitCheckError) {
            console.error(
              "Error checking absence limit:",
              limitCheckError.message,
            );
          }

          // Send notifications to all parents
          if (paisIds.length > 0) {
            for (const paiId of paisIds) {
              notificationPromises.push(
                sendFaltaNotification(
                  paiId,
                  nomeAluno,
                  data,
                  alunoId,
                  turmaId,
                  disciplina,
                  sendAlertLimit,
                ),
              );
            }
          }
        } catch (studentError) {
          console.error(
            "Error processing student:",
            alunoId,
            studentError.message,
          );
        }
      }

      // Wait for all notification promises
      const results = await Promise.allSettled(notificationPromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      const duration = Date.now() - startTime;
      console.log(
        `Notificações de falta enviadas para ${successCount} pais (${duration}ms)`,
        {
          turmaId,
          alunosFaltosos: alunosFaltosos.length,
        },
      );

      return {
        success: true,
        chamadaId: chamadaId,
        absenceCount: alunosFaltosos.length,
        successCount: successCount,
        failureCount: failureCount,
        duration: duration,
      };
    } catch (error) {
      console.error("Error in onFaltaRegistrada:", error.message, {
        chamadaId: chamadaId,
        stack: error.stack,
      });
      throw error;
    }
  });

/**
 * Helper function to send falta notification to a parent
 */
async function sendFaltaNotification(
  paiId,
  nomeAluno,
  data,
  alunoId,
  turmaId,
  disciplina,
  sendAlertLimit,
) {
  try {
    // Fetch parent data
    const paiSnapshot = await admin
      .database()
      .ref(`/usuarios/${paiId}`)
      .once("value");

    if (!paiSnapshot.exists()) {
      console.warn("Parent not found:", paiId);
      return null;
    }

    const paiData = paiSnapshot.val();
    const { fcmToken, status, nome: nomePai } = paiData;

    // Skip if parent is inactive or has no token
    if (status !== "ativo" || !fcmToken) {
      return null;
    }

    // Prepare FCM message
    const message = {
      notification: {
        title: "Falta Registrada",
        body: `Seu filho(a) ${nomeAluno} não compareceu à aula hoje (${data}).`,
      },
      data: {
        type: "falta",
        alunoId: alunoId,
        turmaId: turmaId,
        data: data,
        disciplina: disciplina,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "faltas",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
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

    console.log("Falta notification sent to parent:", paiId, {
      messageId,
      nomeAluno,
    });

    // Send additional alert if limit reached
    if (sendAlertLimit) {
      try {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "⚠️ Alerta de Faltas",
            body: `${nomeAluno} atingiu ${Math.round((100 * 50) / 200)}% de faltas permitidas. Verifique o boletim.`,
          },
          data: {
            type: "falta_alerta",
            alunoId: alunoId,
            timestamp: new Date().toISOString(),
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channelId: "alertas",
            },
          },
        });

        console.log("Absence limit alert sent to parent:", paiId);
      } catch (alertError) {
        console.error("Error sending limit alert:", alertError.message);
      }
    }

    return {
      success: true,
      paiId: paiId,
      alunoId: alunoId,
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
      console.error(
        "Error sending falta notification to parent:",
        paiId,
        error.message,
      );
    }
    throw error;
  }
}

// SGE v2.0 • onFaltaRegistrada • 2026-05-15
