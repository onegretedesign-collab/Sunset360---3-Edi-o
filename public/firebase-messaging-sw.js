importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC8c7d9YRE11JUYYq2k7MijeCZPz6yxPJY",
  authDomain: "macro-resolver-466413-g9.firebaseapp.com",
  projectId: "macro-resolver-466413-g9",
  storageBucket: "macro-resolver-466413-g9.firebasestorage.app",
  messagingSenderId: "726843013361",
  appId: "1:726843013361:web:adbe3655e1ad6e31529150"
});

const messaging = firebase.messaging();
