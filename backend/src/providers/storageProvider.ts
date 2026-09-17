import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

function client(){
  const endpoint=process.env.OBJECT_STORAGE_ENDPOINT;
  const region=process.env.OBJECT_STORAGE_REGION || "auto";
  const accessKeyId=process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey=process.env.OBJECT_STORAGE_SECRET_KEY;
  if(!endpoint || !accessKeyId || !secretAccessKey || !process.env.OBJECT_STORAGE_BUCKET) return null;
  return new S3Client({region,endpoint,forcePathStyle:process.env.OBJECT_STORAGE_FORCE_PATH_STYLE!=="false",credentials:{accessKeyId,secretAccessKey}});
}

export function storageConfigured(){ return !!client(); }

export async function putRecording(objectKey:string,data:Buffer,contentType:string){
  if(data.length>MAX_RECORDING_BYTES) throw new Error("RECORDING_TOO_LARGE");
  const s3=client(); if(!s3) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  await s3.send(new PutObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET!,Key:objectKey,Body:data,ContentType:contentType,ServerSideEncryption:process.env.OBJECT_STORAGE_SSE||undefined}));
}

export async function getRecordingUrl(objectKey:string){
  const s3=client(); if(!s3) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  return getSignedUrl(s3,new GetObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET!,Key:objectKey}),{expiresIn:300});
}

export async function getObject(objectKey:string){
  const s3=client(); if(!s3) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const r=await s3.send(new GetObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET!,Key:objectKey}));
  if(!r.Body) throw new Error("RECORDING_NOT_FOUND");
  const chunks:Buffer[]=[]; let total=0;
  for await (const chunk of r.Body as any){ const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk); total+=b.length; if(total>MAX_RECORDING_BYTES) throw new Error("RECORDING_TOO_LARGE"); chunks.push(b); }
  return Buffer.concat(chunks);
}

export async function putText(objectKey:string,text:string){
  const s3=client(); if(!s3) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  await s3.send(new PutObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET!,Key:objectKey,Body:Buffer.from(text,"utf8"),ContentType:"text/plain; charset=utf-8",ServerSideEncryption:process.env.OBJECT_STORAGE_SSE||undefined}));
}


export async function getUploadUrl(objectKey:string,contentType:string,contentLength:number,expiresIn=600){
  const s3=client(); if(!s3) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const command=new PutObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET!,Key:objectKey,ContentType:contentType,ContentLength:contentLength,ServerSideEncryption:process.env.OBJECT_STORAGE_SSE||undefined});
  return getSignedUrl(s3,command,{expiresIn});
}
