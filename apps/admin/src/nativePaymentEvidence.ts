import {requireNativeModule} from'expo-modules-core';
const Native=requireNativeModule('PaymentEvidence');
export const PaymentEvidenceNative={
  async status(){return Native.status()},
  async requestSmsReadPermission(){return Native.requestSmsReadPermission()},
  async openNotificationAccessSettings(){return Native.openNotificationAccessSettings()},
  async ensureKey(){return Native.ensureKey()},
  async sign(payload:string){return Native.sign(payload)},
  async collectEvidence(){return Native.collectEvidence()}
};
