const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function deleteAllUsers(nextPageToken) {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

    console.log(`Encontrados ${listUsersResult.users.length} usuários...`);

    const uids = listUsersResult.users.map((user) => user.uid);

    if (uids.length > 0) {
      const result = await admin.auth().deleteUsers(uids);

      console.log("Deletados:", result.successCount);
      console.log("Falhas:", result.failureCount);

      if (result.errors.length > 0) {
        console.log(result.errors);
      }
    }

    if (listUsersResult.pageToken) {
      await deleteAllUsers(listUsersResult.pageToken);
    } else {
      console.log("Todos os usuários foram removidos.");
    }
  } catch (err) {
    console.error("ERRO:", err);
  }
}

deleteAllUsers();
