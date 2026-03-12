// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJOVkjQZxtt_ZTslNCHOnm88pOa2181e0",
    authDomain: "criczone-web.firebaseapp.com",
    projectId: "criczone-web",
    storageBucket: "criczone-web.firebasestorage.app",
    messagingSenderId: "914667413386",
    appId: "1:914667413386:web:38f0be979d224e4a50b273"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
