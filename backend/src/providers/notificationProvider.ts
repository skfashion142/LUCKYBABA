import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function firebaseApp(){
  if(getApps().length) return getApps()[0];
  const raw=process.env.FCM_SERVICE_ACCOUNT_JSON;
  if(raw){
    const c=JSON.parse(raw);
    return initializeApp({credential:cert(c)});
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS) return initializeApp({credential:applicationDefault()});
  return null;
}

export function notificationsConfigured(){ try{return !!firebaseApp();}catch{return false;} }
export async function sendPush(token:string,title:string,body:string,data:Record<string,string>={}){
  const app=firebaseApp(); if(!app) throw new Error("FCM_NOT_CONFIGURED");
  return getMessaging(app).send({token,notification:{title,body},data,android:{priority:"high"},apns:{payload:{aps:{sound:"default"}}}});
}
