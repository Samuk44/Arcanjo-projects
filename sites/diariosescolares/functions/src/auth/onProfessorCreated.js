// ===== [functions/src/auth/onProfessorCreated.js] =====
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Trigger: Fired when a new professor registration is created
 * Action: Send FCM notification to all active directors
 */
exports.onProfessorCreated = functions.database
  .ref("/cadastrosPendentes/{uid}")
  .onCreate(async (snapshot, context) => {
    const startTime = Date.now();
    const uid = context.params.uid;

    try {
      // Validate snapshot data
      const cadastroData = snapshot.val();
      if (!cadastroData) {
        console.warn("Empty cadastro data for UID:", uid);
        return null;
      }

      const { nome, email, roleSolicitado } = cadastroData;

      if (!nome || !email || !roleSolicitado) {
        console.error("Missing required fields in cadastro:", uid, {
          nome,
          email,
          roleSolicitado,
        });
        return null;
      }

      console.log("Processing new professor registration:", uid, {
        nome,
        roleSolicitado,
      });

      // Fetch all active directors with FCM tokens
      const directorsSnapshot = await admin
        .database()
        .ref("/usuarios")
        .orderByChild("role")
        .equalTo("diretor")
        .once("value");

      const validTokens = [];
      const directorUids = [];

      if (directorsSnapshot.exists()) {
        directorsSnapshot.forEach((userSnap) => {
          const userData = userSnap.val();
          const userUid = userSnap.key;

          // Filter: active status and valid FCM token
          if (
            userData.status === "ativo" &&
            userData.fcmToken &&
            typeof userData.fcmToken === "string"
          ) {
            validTokens.push(userData.fcmToken);
            directorUids.push(userUid);
          }
        });
      }

      if (validTokens.length === 0) {
        console.warn("No active directors with FCM tokens found");
        return null;
      }

      console.log(
        `Found ${validTokens.length} active directors for notification`,
      );

      // Prepare FCM payload
      const message = {
        notification: {
          title: "Novo Cadastro Pendente",
          body: `${nome} solicitou cadastro como ${roleSolicitado}.`,
        },
        data: {
          type: "aprovar_cadastro",
          uid: uid,
          role: roleSolicitado,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "important",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
        },
      };

      // Send multicast notification with batch processing
      const batchSize = 500;
      const failedTokens = [];

      for (let i = 0; i < validTokens.length; i += batchSize) {
        const batchTokens = validTokens.slice(i, i + batchSize);

        try {
          const response = await admin.messaging().sendMulticast({
            tokens: batchTokens,
            notification: message.notification,
            data: message.data,
            android: message.android,
            apns: message.apns,
          });

          console.log(
            `Batch ${Math.floor(i / batchSize) + 1}: Sent ${response.successCount}/${batchTokens.length}`,
          );

          // Collect failed/invalid tokens
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const error = resp.error;
                if (
                  error.code === "messaging/invalid-registration-token" ||
                  error.code === "messaging/registration-token-not-registered"
                ) {
                  failedTokens.push(batchTokens[idx]);
                }
                console.error(
                  `FCM send failed for token:`,
                  error.code,
                  error.message,
                );
              }
            });
          }
        } catch (batchError) {
          console.error(
            `Error sending batch ${Math.floor(i / batchSize) + 1}:`,
            batchError.message,
          );
        }
      }

      // Cleanup invalid tokens from database
      if (failedTokens.length > 0) {
        console.log(`Removing ${failedTokens.length} invalid tokens`);
        for (const invalidToken of failedTokens) {
          try {
            // Find and remove invalid token from directors
            directorsSnapshot.forEach((userSnap) => {
              if (userSnap.val().fcmToken === invalidToken) {
                admin
                  .database()
                  .ref(`/usuarios/${userSnap.key}/fcmToken`)
                  .remove()
                  .catch((err) =>
                    console.error("Error removing invalid token:", err.message),
                  );
              }
            });
          } catch (cleanupError) {
            console.error("Token cleanup error:", cleanupError.message);
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `Notificação enviada para diretores sobre cadastro pendente: ${uid} (${duration}ms)`,
      );

      return {
        success: true,
        uid: uid,
        recipientsCount: validTokens.length,
        duration: duration,
      };
    } catch (error) {
      console.error("Error in onProfessorCreated:", error.message, {
        uid: uid,
        stack: error.stack,
      });
      throw error;
    }
  });

// SGE v2.0 • onProfessorCreated • 2026-05-15
