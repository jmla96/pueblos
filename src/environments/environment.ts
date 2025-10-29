import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; 

export const environment = {
  production: false
}; 

export const firebaseConfig = {
  apiKey: "AIzaSyBNTbQhdv05VKhruF9HFULt48cRsZ-evUg",
  authDomain: "pueblo-s.firebaseapp.com",
  databaseURL: "https://pueblo-s-default-rtdb.firebaseio.com",
  projectId: "pueblo-s",
  storageBucket: "pueblo-s.firebasestorage.app",
  messagingSenderId: "296538588081",
  appId: "1:296538588081:web:be5e4af4e7282ea5fd7390",
  measurementId: "G-HXRT7KWL6H"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);