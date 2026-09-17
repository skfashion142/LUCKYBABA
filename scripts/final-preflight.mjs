import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const failures = [];
const exists = p => fs.existsSync(path.join(root,p));
const read = p => fs.readFileSync(path.join(root,p),'utf8');

for (const p of [
  'apps/customer/App.tsx','apps/customer/src/VoiceCallScreen.tsx',
  'apps/admin/App.tsx','apps/admin/src/CallPanel.tsx','apps/admin/src/PaymentEvidencePermission.tsx',
  'backend/src/server.ts','backend/src/schema.sql','modules/payment-evidence/android/src/main/java/com/commerce/paydetection/PaymentEvidenceModule.kt',
  'modules/payment-evidence/android/src/main/java/com/commerce/paydetection/PaymentNotificationListener.kt'
]) if (!exists(p)) failures.push(`Missing required file: ${p}`);

for (const p of ['apps/customer/package.json','apps/admin/package.json','backend/package.json','package.json']) {
  try { JSON.parse(read(p)); } catch (e) { failures.push(`Invalid JSON: ${p}`); }
}

const forbidden = /(?:DEVELOPER_EARLY_UPI_KEY\s*=\s*)[^\s#]+|(?:X-Developer-Early-UPI-Key[^\n]*0142)|\b0142\b/i;
for (const p of ['apps/customer/App.tsx','apps/admin/App.tsx','apps/customer/app.config.ts','apps/admin/app.config.ts']) {
  if (forbidden.test(read(p))) failures.push(`Developer unlock secret leaked into mobile/build file: ${p}`);
}
for (const p of ['apps/customer/.env.example','apps/admin/.env.example']) {
  if (exists(p) && forbidden.test(read(p))) failures.push(`Developer unlock secret leaked into environment example: ${p}`);
}

const server = read('backend/src/server.ts');
for (const needle of [
  '/v1/orders/payment-submission', '/v1/admin/payments/:orderId/evidence',
  '/v1/admin/payment-evidence/device/register', '/v1/admin/payment-evidence/device/challenge',
  '/v1/admin/orders/:orderId/release-pickup', '/v1/orders/:orderId/location',
  '/v1/admin/payment-settings/upi/change', '/v1/admin/payment-settings/upi/change/:requestId/unlock',
  '/v1/admin/tutorials', '/v1/admin/notifications/broadcast'
]) if (!server.includes(needle)) failures.push(`Missing backend route: ${needle}`);

if (!server.includes("processing_deadline_at=coalesce(processing_deadline_at,now()+interval '15 minutes')")) failures.push('15-minute payment verification window not armed on Payment Done.');
if (!server.includes('merchant_upi_id')) failures.push('Merchant UPI snapshot missing from order payment model.');
if (!server.includes('status=\'CANCELLED\'')) failures.push('Payment rejection/cancellation path missing.');
if (!server.includes('crypto.verify("sha256"')) failures.push('Signed payment-evidence verification missing.');
if (server.includes('app.use(cors())')) failures.push('Unrestricted CORS usage remains.');

if (!server.includes('PAYMENT_SCREENSHOT_NOT_OWNED')) failures.push('Payment screenshot ownership guard missing.');
if (!server.includes('sizeBytes')) failures.push('Presigned upload content-length guard missing.');
if (!server.includes('REFUND_REQUIRED_BEFORE_CANCELLATION')) failures.push('Verified-payment cancellation safety missing.');
if (!server.includes('NO_ACTIVE_LOCATION')) failures.push('Active-only admin location privacy guard missing.');
if (!server.includes('ADMIN_EMAIL_NOT_VERIFIED')) failures.push('Verified admin identity guard missing.');
if (!exists('backend/migrations/005_autopsy_hardening.sql')) failures.push('Autopsy migration missing.');
if (!server.includes('genericRateLimit(3,60*60*1000')) failures.push('Broadcast spam rate limit missing.');
if (!server.includes('delivered_at=coalesce(delivered_at,now())')) failures.push('Notification delivered-state update missing.');
if (!server.includes('presence.updated')) failures.push('Realtime customer presence lifecycle missing.');
if (!exists('modules/payment-evidence/android/build.gradle')) failures.push('Android payment-evidence module build files missing.');

const customer = read('apps/customer/App.tsx');
const admin = read('apps/admin/App.tsx');
for (const needle of ['ProductCard','SearchInput','CartButton','CheckoutButton','LocationPermission','OrderCompleteButton']) if (!customer.includes(needle)) failures.push(`Customer guide target missing: ${needle}`);
for (const needle of ['DashboardTab','ProductsTab','OrdersTab','ConversationsTab','SettingsTab']) if (!admin.includes(needle)) failures.push(`Admin guide target missing: ${needle}`);

const ts = spawnSync(process.execPath, ['-e', `const ts=require('typescript'),fs=require('fs'),path=require('path');const root=process.argv[1];let bad=0,n=0;function w(d){for(const x of fs.readdirSync(d)){const p=path.join(d,x),s=fs.statSync(p);if(s.isDirectory()&&!['node_modules','.git'].includes(x))w(p);else if(/\\.(ts|tsx)$/.test(x)){n++;const t=fs.readFileSync(p,'utf8');const f=ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);if(f.parseDiagnostics.length){bad+=f.parseDiagnostics.length;console.error(p);}}}}w(root);console.log(JSON.stringify({files:n,syntaxErrors:bad}));process.exitCode=bad?1:0;`, root], {encoding:'utf8'});
if (ts.status !== 0) failures.push('TypeScript/TSX syntax preflight failed.');

if (failures.length) {
  console.error('FINAL PREFLIGHT: FAIL');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('FINAL PREFLIGHT: PASS');
console.log('Required structure, route presence, payment policy, secret isolation, guide targets and TS/TSX parsing checks passed.');
