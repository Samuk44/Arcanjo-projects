import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://diarios-escolares-default-rtdb.firebaseio.com",
});

const db = admin.database();
const auth = admin.auth();
