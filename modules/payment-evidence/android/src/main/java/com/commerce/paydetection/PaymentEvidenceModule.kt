package com.commerce.paydetection

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Base64
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.RSAKeyGenParameterSpec

class PaymentEvidenceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PaymentEvidence")

    AsyncFunction("status") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("smsRead" to false, "upiNotificationAccess" to false)
      mapOf(
        "smsRead" to (context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED),
        "upiNotificationAccess" to isNotificationAccessEnabled(context)
      )
    }

    AsyncFunction("requestSmsReadPermission") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      if (activity.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) return@AsyncFunction true
      activity.requestPermissions(arrayOf(Manifest.permission.READ_SMS), 18421)
      true
    }

    AsyncFunction("openNotificationAccessSettings") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    AsyncFunction("ensureKey") {
      val alias = "commerce-payment-evidence-v1"
      val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      if (!ks.containsAlias(alias)) {
        val gen = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
          .setAlgorithmParameterSpec(RSAKeyGenParameterSpec(2048, RSAKeyGenParameterSpec.F4))
          .setDigests(KeyProperties.DIGEST_SHA256)
          .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
          .build()
        gen.initialize(spec)
        gen.generateKeyPair()
      }
      val cert = ks.getCertificate(alias)
      mapOf("keyId" to alias, "publicKeyBase64" to Base64.encodeToString(cert.publicKey.encoded, Base64.NO_WRAP))
    }

    AsyncFunction("sign") { payload: String ->
      val alias = "commerce-payment-evidence-v1"
      val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      val key = ks.getKey(alias, null) ?: throw IllegalStateException("EVIDENCE_KEY_NOT_INITIALIZED")
      val signature = Signature.getInstance("SHA256withRSA")
      signature.initSign(key as java.security.PrivateKey)
      signature.update(payload.toByteArray(Charsets.UTF_8))
      Base64.encodeToString(signature.sign(), Base64.NO_WRAP)
    }

    AsyncFunction("collectEvidence") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      val out = mutableListOf<Map<String, Any?>>()
      if (context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
        val uri = android.net.Uri.parse("content://sms/inbox")
        context.contentResolver.query(uri, arrayOf("_id", "body", "date"), null, null, "date DESC")?.use { c ->
          val idIx = c.getColumnIndex("_id")
          val bodyIx = c.getColumnIndex("body")
          var count = 0
          while (c.moveToNext() && count < 50) {
            if (bodyIx < 0) break
            val body = c.getString(bodyIx) ?: continue
            PaymentNotificationListener.parse(body, "SMS", "sms:${if (idIx >= 0) c.getString(idIx) else "unknown"}")?.let { ev ->
              out.add(toMap(ev))
              count++
            }
          }
        }
      }
      PaymentNotificationListener.snapshot().forEach { ev ->
        if (out.none { it["utr"] == ev.utr }) out.add(toMap(ev))
      }
      out.take(50)
    }
  }

  private fun toMap(ev: PaymentEvidenceRecord): Map<String, Any?> = mapOf(
    "source" to ev.source,
    "utr" to ev.utr,
    "amountPaise" to ev.amountPaise,
    "payeeUpiId" to ev.payeeUpiId,
    "occurredAt" to ev.occurredAt,
    "rawReference" to ev.rawReference
  )

  private fun isNotificationAccessEnabled(context: Context): Boolean {
    val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
    return enabled.split(":").any { it.startsWith(context.packageName + "/") }
  }
}
