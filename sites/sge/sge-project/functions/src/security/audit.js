exports.securityAudit = functions.database
  .ref("/logs/{logId}")
  .onCreate(async (snapshot, context) => {
    const log = snapshot.val();

    // Detectar padrões suspeitos
    const suspiciousPatterns = [
      "multiple_failed_logins",
      "unauthorized_access_attempt",
      "mass_data_export",
      "unusual_time_access",
    ];

    if (suspiciousPatterns.includes(log.type)) {
      // Enviar alerta para admin
      await admin
        .database()
        .ref("alerts")
        .push({
          severity: "high",
          message: `Atividade suspeita detectada: ${log.type}`,
          timestamp: admin.database.ServerValue.TIMESTAMP,
          userId: log.userId,
        });
    }
  });
