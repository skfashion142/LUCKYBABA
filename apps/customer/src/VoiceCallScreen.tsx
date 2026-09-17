import React,{useEffect,useRef,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {Button,Card,theme,api,getToken} from '@commerce/mobile-core';
import {mediaDevices,RTCPeerConnection,RTCSessionDescription,RTCIceCandidate} from 'react-native-webrtc';

const API=process.env.EXPO_PUBLIC_API_BASE_URL||(__DEV__?'http://10.0.2.2:4000':'');
if(!API) throw new Error('EXPO_PUBLIC_API_BASE_URL_REQUIRED');
if(!__DEV__ && !/^https:\/\//i.test(API)) throw new Error('PRODUCTION_API_MUST_USE_HTTPS');
const wsUrl=()=>API.replace(/^https?/,API.startsWith('https://')?'wss':'ws')+`/realtime?token=${encodeURIComponent('')}`;

type Props={callId:string;initiator:boolean;onEnded:()=>void;recordingConsent?:boolean};

export default function VoiceCallScreen({callId,initiator,onEnded}:Props){
  const pc=useRef<any>(null); const ws=useRef<WebSocket|null>(null); const localStream=useRef<any>(null);
  const [status,setStatus]=useState('Connecting…'); const [muted,setMuted]=useState(false); const [ready,setReady]=useState(false); const offerSent=useRef(false);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const token=await getToken(); if(!token)throw new Error('SESSION_REQUIRED');
        const conn=new RTCPeerConnection({iceServers:[
          {urls:process.env.EXPO_PUBLIC_STUN_URL||'stun:stun.l.google.com:19302'},
          ...(process.env.EXPO_PUBLIC_TURN_URL?[{urls:process.env.EXPO_PUBLIC_TURN_URL,username:process.env.EXPO_PUBLIC_TURN_USERNAME||'',credential:process.env.EXPO_PUBLIC_TURN_CREDENTIAL||''}]:[]),
        ]});
        pc.current=conn;
        conn.onicecandidate=(e:any)=>{if(e.candidate)ws.current?.send(JSON.stringify({type:'call.signal',callId,data:{kind:'candidate',candidate:e.candidate}}))};
        conn.onconnectionstatechange=()=>{const s=conn.connectionState;setStatus(s==='connected'?'Connected':s==='connecting'?'Connecting…':s==='failed'?'Connection failed':s==='disconnected'?'Reconnecting…':s)};
        localStream.current=await mediaDevices.getUserMedia({audio:true,video:false});
        localStream.current.getTracks().forEach((t:any)=>conn.addTrack(t,localStream.current));
        const socket=new WebSocket(wsUrl().replace('token=','token='+encodeURIComponent(token))); ws.current=socket;
        socket.onopen=()=>{if(!alive)return;setReady(true);setStatus(initiator?'Waiting for dealer to accept…':'Connected to caller…')};
        socket.onmessage=async(e)=>{
          const msg=JSON.parse(e.data); if(msg.callId!==callId)return;
          if(msg.type==='call.status'){if(msg.call?.status==='ACTIVE'&&initiator&&!offerSent.current){const offer=await conn.createOffer({});await conn.setLocalDescription(offer);socket.send(JSON.stringify({type:'call.signal',callId,data:{kind:'description',description:offer}}));offerSent.current=true;setStatus('Connecting to dealer…');return;}if(['ENDED','REJECTED','MISSED','FAILED'].includes(msg.call?.status)){setStatus(msg.call.status);onEnded();return;}}
          if(msg.type!=='call.signal')return;
          const d=msg.data||{};
          if(d.kind==='description'){
            const desc=d.description;
            if(desc?.type==='offer'&&!initiator){await conn.setRemoteDescription(new RTCSessionDescription(desc));const answer=await conn.createAnswer({});await conn.setLocalDescription(answer);socket.send(JSON.stringify({type:'call.signal',callId,data:{kind:'description',description:answer}}));}
            else if(desc?.type==='answer'&&initiator){await conn.setRemoteDescription(new RTCSessionDescription(desc));}
          } else if(d.kind==='candidate'&&d.candidate){try{await conn.addIceCandidate(new RTCIceCandidate(d.candidate));}catch{}}
        };
        socket.onerror=()=>setStatus('Realtime connection error');
      }catch(e:any){if(alive)Alert.alert('Call',e?.message||'Could not start call');onEnded();}
    })();
    return()=>{alive=false;try{ws.current?.send(JSON.stringify({type:'call.end',callId}))}catch{};try{ws.current?.close()}catch{};try{localStream.current?.getTracks()?.forEach((t:any)=>t.stop())}catch{};try{pc.current?.close()}catch{};};
  },[callId,initiator,onEnded]);
  const end=async()=>{try{await api(API,`/v1/customer/calls/${callId}/end`,{method:'POST'})}catch{};onEnded()};
  const toggle=()=>{const tracks=localStream.current?.getAudioTracks?.()||[];const next=!muted;tracks.forEach((t:any)=>t.enabled=!next);setMuted(next)};
  return <View style={st.wrap}><Card><Text style={st.title}>Human Support Call</Text><Text style={st.status}>{status}</Text><View style={st.row}><Button label={muted?'Unmute':'Mute'} secondary disabled={!ready} onPress={toggle}/><Button label="End Call" onPress={end}/></View><Text style={st.note}>Voice calls use encrypted WebRTC media. Keep microphone permission enabled. Call recording is only enabled after explicit consent.</Text></Card></View>;
}
const st=StyleSheet.create({wrap:{flex:1,justifyContent:'center'},title:{fontSize:22,fontWeight:'900',color:theme.text,marginBottom:8},status:{color:theme.accent,fontWeight:'900',marginBottom:14},row:{flexDirection:'row',gap:10},note:{color:theme.muted,lineHeight:19,marginTop:14}});
