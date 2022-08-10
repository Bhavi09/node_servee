import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCzcL2tbGCwhyMqknMikDPRbBjhmQrTJxQ",
    authDomain: "shareweb-f5a70.firebaseapp.com",
    projectId: "shareweb-f5a70",
    storageBucket: "shareweb-f5a70.appspot.com",
    messagingSenderId: "621514402820",
    appId: "1:621514402820:web:6078aebee46678dcb59951",
    measurementId: "G-NCN90V2CC9"
  };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export {db as db};

