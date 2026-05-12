importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Los valores de inicialización se obtienen del config principal
// Nota: En producción, estos valores deben coincidir con los de tu firebase-applet-config.json
firebase.initializeApp({
  apiKey: "AIzaSyDyMIVlKcAzkjgP7il63dJKUJqYA_mESNs",
  authDomain: "repartidor-b07ca.firebaseapp.com",
  projectId: "repartidor-b07ca",
  storageBucket: "repartidor-b07ca.firebasestorage.app",
  messagingSenderId: "1059218331953",
  appId: "1:1059218331953:web:7faa0049b333794ba7f810"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/2312/2312215.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
