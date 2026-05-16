exports.onLoginAttempt = functions.https.onCall(async (data, context) => {
  const { email } = data;

  // Sempre retornar mensagem genérica
  const genericError = "Credenciais inválidas. Tente novamente.";

  try {
    const userSnapshot = await admin
      .database()
      .ref("usuarios")
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (!userSnapshot.exists()) {
      // Simular delay para prevenir timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      throw new functions.https.HttpsError("invalid-argument", genericError);
    }

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError("invalid-argument", genericError);
  }
});
