import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

export const saveTokenToFirestore = async (userId: string, token: string) => {
  try {
    await setDoc(doc(db, 'userTokens', userId), {
      userId,
      token,
      createdAt: new Date()
    });
    console.log('Token salvo com sucesso no Firestore');
  } catch (error) {
    console.error('Erro ao salvar token no Firestore:', error);
  }
};

export const requestNotificationPermission = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY_HERE' 
      });
      console.log('Token de notificação:', token);
      await saveTokenToFirestore(userId, token);
      return token;
    }
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
  }
};
