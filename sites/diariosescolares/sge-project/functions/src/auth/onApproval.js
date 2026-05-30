// ===== [functions/src/auth/onApproval.js] =====
const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Trigger: Fired when a user profile is updated
 * Action: Send approval notification when status changes to 'ativo'
 */
exports.onApproval = functions.database
  .ref("/usuarios/{uid}")
  .onUpdate(async (change, context) => {
    const startTime = Date.now();
    const uid = context.params.uid;

    try {
      // Validate snapshots
      const beforeData = change.before.val();
      const afterData = change.after.val();

      if (!beforeData || !afterData) {
        console.warn("Invalid snapshot data for UID:", uid);
        return null;
      }

      const beforeStatus = beforeData.status;
      const afterStatus = afterData.status;

      // Check if status changed to 'ativo'
      if (beforeStatus === afterStatus || afterStatus !== "ativo") {
        return null;
      }

      console.log("User approval detected:", uid, {
        beforeStatus: beforeStatus,
        afterStatus: afterStatus,
      });

      const userData = afterData;
      const { nome, email, fcmToken, role } = userData;

      // Validate required data
      if (!nome || !email) {
        console.warn(
          "Missing required user data for approval notification:",
          uid,
        );
        return null;
      }

      // Skip notification if no FCM token
      if (!fcmToken || typeof fcmToken !== "string") {
        console.warn("User approved without FCM token:", uid);
        return null;
      }

      console.log("Sending approval notification to user:", uid, {
        nome,
        role,
      });

      // Prepare FCM message
      const message = {
        notification: {
          title: "Conta Aprovada!",
          body: "Seu acesso ao SGE foi liberado. Faça login para continuar.",
        },
        data: {
          type: "welcome",
          role: role || "user",
          uid: uid,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "account",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
        },
        webpush: {
          notification: {
            icon: "https://www.gstatic.com/devrel-devsite/prod/v2210deb8920cd4a55bd580441aa58e7853afc04b39a9d8ac4198e1cd7fbe04ef/firebase/images/favicons/favicon.ico",
          },
        },
      };

      // Send notification
      try {
        const response = await admin.messaging().send({
          token: fcmToken,
          notification: message.notification,
          data: message.data,
          android: message.android,
          apns: message.apns,
          webpush: message.webpush,
        });

        console.log("Approval notification sent successfully:", uid, {
          messageId: response,
        });
      } catch (fcmError) {
        // Handle invalid tokens
        if (
          fcmError.code === "messaging/invalid-registration-token" ||
          fcmError.code === "messaging/registration-token-not-registered"
        ) {
          console.warn("Removing invalid FCM token for user:", uid);
          await admin.database().ref(`/usuarios/${uid}/fcmToken`).remove();
        } else {
          console.error("FCM send error:", fcmError.code, fcmError.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`User status updated to active: ${uid} (${duration}ms)`);

      return {
        success: true,
        uid: uid,
        notificationSent: true,
        duration: duration,
      };
    } catch (error) {
      console.error("Error in onApproval:", error.message, {
        uid: uid,
        stack: error.stack,
      });
      throw error;
    }
  });

// SGE v2.0 • onApproval • 2026-05-15
