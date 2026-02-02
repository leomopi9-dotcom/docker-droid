package com.dockerandroid.app

import android.content.Context
import android.os.Build
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.*

/**
 * Writes uncaught exception stack traces to the app-specific external storage
 * directory under `crash_logs/` for easy retrieval from device storage.
 */
class CrashHandler(private val ctx: Context) : Thread.UncaughtExceptionHandler {
  private val defaultHandler: Thread.UncaughtExceptionHandler? = Thread.getDefaultUncaughtExceptionHandler()

  override fun uncaughtException(thread: Thread, ex: Throwable) {
    try {
      val sw = StringWriter().also { ex.printStackTrace(PrintWriter(it)) }
      val stamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.US).format(Date())
      val dir = ctx.getExternalFilesDir("crash_logs") ?: ctx.filesDir
      dir?.let { it.mkdirs() }
      val file = File(dir, "crash_${'$'}{stamp}.log")

      val versionName = try {
        val pm = ctx.packageManager
        val info = pm.getPackageInfo(ctx.packageName, 0)
        info.versionName
      } catch (e: Exception) {
        "?"
      }

      val meta = buildString {
        append("package: ${'$'}{ctx.packageName}\n")
        append("version: ${'$'}{versionName}\n")
        append("device: ${'$'}{Build.MANUFACTURER} ${'$'}{Build.MODEL} (SDK ${'$'}{Build.VERSION.SDK_INT})\n")
        append("time: ${'$'}{stamp}\n\n")
      }

      // Write file atomically (best-effort, avoid long blocking work)
      try {
        file.writeText(meta + sw.toString())
        android.util.Log.i("CrashHandler", "Wrote crash log to ${'$'}{file.absolutePath}")
      } catch (e: Exception) {
        android.util.Log.w("CrashHandler", "Failed to write crash log", e)
      }
    } catch (_: Exception) {
      // ignore
    } finally {
      // delegate to default handler so system handles process kill / report
      defaultHandler?.uncaughtException(thread, ex)
    }
  }
}
