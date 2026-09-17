package com.commerce.paydetection

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList
import java.util.regex.Pattern

data class PaymentEvidenceRecord(
  val source: String,
  val utr: String,
  val amountPaise: Int,
  val payeeUpiId: String?,
  val occurredAt: String?,
  val rawReference: String?
)

class PaymentNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val text = extractText(sbn.notification) ?: return
    parse(text, "UPI_NOTIFICATION", "notification:${sbn.packageName}")?.let { incoming ->
      synchronized(records) {
        records.removeAll { existing -> existing.utr.equals(incoming.utr, ignoreCase = true) }
        records.add(incoming)
        while (records.size > 25) records.removeAt(0)
      }
    }
  }

  private fun extractText(notification: Notification): String? {
    val extras = notification.extras ?: return null
    val lines = listOfNotNull(
      extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
      extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
      extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    )
    return lines.joinToString(" ").takeIf { it.isNotBlank() }
  }

  companion object {
    private val records = CopyOnWriteArrayList<PaymentEvidenceRecord>()
    private val amountPattern = Pattern.compile("(?:₹|INR\\s?|Rs\\.?\\s*)([0-9,]+(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val utrPattern = Pattern.compile("(?:UTR|UPI\\s*(?:REF|REFERENCE)|TXN(?:\\s*ID)?|TRANSACTION\\s*(?:ID|REF)|REF(?:ERENCE)?(?:\\s*NO)?)\\s*[:#-]?\\s*([A-Za-z0-9]{8,32})", Pattern.CASE_INSENSITIVE)
    private val upiPattern = Pattern.compile("[A-Za-z0-9._-]{2,}@[A-Za-z0-9._-]{2,}")

    fun parse(text: String, source: String, reference: String): PaymentEvidenceRecord? {
      val lower = text.lowercase(Locale.US)
      if (!(lower.contains("upi") || lower.contains("paid") || lower.contains("payment") || lower.contains("credited") || lower.contains("received"))) return null
      val um = utrPattern.matcher(text)
      val am = amountPattern.matcher(text)
      if (!um.find() || !am.find()) return null
      val amount = am.group(1).replace(",", "").toDoubleOrNull() ?: return null
      val payee = upiPattern.matcher(text).let { if (it.find()) it.group() else null }
      val occurred = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(Date())
      return PaymentEvidenceRecord(source, um.group(1), Math.round(amount * 100).toInt(), payee, occurred, reference)
    }

    fun snapshot(): List<PaymentEvidenceRecord> = synchronized(records) { records.toList() }
  }
}
