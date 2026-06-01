exports.realtimeSecurityMonitor = functions.database
  .ref("/usuarios/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();

    // Detectar mudanças suspeitas
    if (before.role !== after.role && after.role === "diretor") {
      // Alertar tentativa de escalonamento de privilégio
      await admin.database().ref("alerts").push({
        type: "privilege_escalation_attempt",
        userId: context.params.userId,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    }
  });
