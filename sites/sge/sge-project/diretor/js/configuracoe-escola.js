import { auth, db, storage } from "../assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const elements = {
  form: document.getElementById("form-escola"),
  btnSave: document.getElementById("btn-save"),
  logoInput: document.getElementById("logo-input"),
  imgPreview: document.getElementById("img-preview"),
  logoPlaceholder: document.getElementById("logo-placeholder"),
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (userSnap.exists() && userSnap.data().role === "diretor") {
      loadEscolaInfo();
    } else {
      window.location.replace("/errors/sem-permissao.html");
    }
  } else {
    window.location.replace("/auth/login.html");
  }
});

async function loadEscolaInfo() {
  try {
    const snap = await getDoc(doc(db, "escola", "info"));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById("escola-nome").value = data.nome || "";
      document.getElementById("escola-cnpj").value = data.cnpj || "";
      document.getElementById("escola-ano").value = data.anoLetivo || 2026;
      document.getElementById("escola-endereco").value = data.endereco || "";
      if (data.logoUrl) {
        elements.imgPreview.src = data.logoUrl;
        elements.imgPreview.classList.remove("hidden");
        elements.logoPlaceholder.classList.add("hidden");
      }
    }
  } catch (err) {
    console.error("Erro ao carregar info:", err);
  }
}

elements.logoInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024)
    return alert("Arquivo muito grande (máx 2MB)");

  const reader = new FileReader();
  reader.onload = (event) => {
    elements.imgPreview.src = event.target.result;
    elements.imgPreview.classList.remove("hidden");
    elements.logoPlaceholder.classList.add("hidden");
  };
  reader.readAsDataURL(file);
};

elements.btnSave.onclick = async () => {
  elements.btnSave.disabled = true;
  elements.btnSave.textContent = "Salvando...";

  try {
    const payload = {
      nome: document.getElementById("escola-nome").value,
      cnpj: document.getElementById("escola-cnpj").value,
      anoLetivo: parseInt(document.getElementById("escola-ano").value),
      endereco: document.getElementById("escola-endereco").value,
      updatedAt: new Date(),
    };

    const file = elements.logoInput.files[0];
    if (file) {
      const storageRef = ref(storage, "escola/logo.png");
      await uploadBytes(storageRef, file);
      payload.logoUrl = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, "escola", "info"), payload);
    alert("Configurações salvas com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("Falha ao salvar configurações.");
  } finally {
    elements.btnSave.disabled = false;
    elements.btnSave.textContent = "Salvar Alterações";
  }
};
