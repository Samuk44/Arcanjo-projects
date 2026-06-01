/* ==========================================================================
   SGE v2.0 - Firebase Messaging Service Worker
   Gerencia notificações push em background
   ========================================================================== */

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCOug2MkZHwH5rzGXxzlPpVZEu4IHbt0Ck",
  authDomain: "farolescolar.firebaseapp.com",
  databaseURL: "https://farolescolar-default-rtdb.firebaseio.com",
  projectId: "farolescolar",
  storageBucket: "farolescolar.firebasestorage.app",
  messagingSenderId: "31040592917",
  appId: "1:31040592917:web:f90e2f0441c35ed92b421c",
});

const messaging = firebase.messaging();

// Tratamento de notificações recebidas em background
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Notificação recebida em background:", payload);

  const notificationTitle =
    payload.notification?.title || "Diários Escolares";
  const notificationOptions = {
    body: payload.notification?.body || "Você tem uma nova notificação.",
    icon: "/assets/img/logo.png",
    badge: "/assets/img/badge-72.png",
    tag: payload.data?.tag || "sge-notification",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Ao clicar na notificação, abrir a URL correspondente
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// Ativação do Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
