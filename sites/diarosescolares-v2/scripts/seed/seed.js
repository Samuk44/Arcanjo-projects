import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://SEU-PROJETO.firebaseio.com",
});

const db = admin.database();

async function seed() {
  const rootRef = db.ref("/");

  await rootRef.set({
    schools: {
      school_1: {
        name: "Escola Central",
        city: "Goiânia",
        state: "GO",
        active: true,
        createdAt: Date.now(),
      },
    },

    users: {
      user_1: {
        name: "Professor João",
        email: "joao@email.com",
        role: "teacher",
        schoolId: "school_1",
        createdAt: Date.now(),
      },
    },

    classes: {
      class_1: {
        name: "9A",
        grade: "9º ano",
        shift: "morning",
        schoolId: "school_1",
        createdAt: Date.now(),
      },
    },

    subjects: {
      subject_1: {
        name: "Matemática",
        schoolId: "school_1",
        createdAt: Date.now(),
      },
    },

    teacherAssignments: {},
  });

  console.log("🔥 Estrutura criada com sucesso!");
}

seed();
