import { getApps, getApp, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function app(){
  if(getApps().length) return getApp();
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FCM_SERVICE_ACCOUNT_JSON;
  if(raw){ const c=JSON.parse(raw); return initializeApp({credential:cert(c)}); }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS) return initializeApp({credential:applicationDefault()});
  return null;
}

export function firebaseAuthConfigured(){ try{return !!app();}catch{return false;} }
export async function verifyFirebaseIdToken(idToken:string){ const a=app(); if(!a) throw new Error("FIREBASE_AUTH_NOT_CONFIGURED"); return getAuth(a).verifyIdToken(idToken,true); }
