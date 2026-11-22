package so.zite.uchat.mesh.transport

import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager

data class RadioStatus(val bluetoothLe: Boolean, val wifiDirect: Boolean, val wifiAware: Boolean, val wifiEnabled: Boolean)
object RadioCapabilities {
 fun inspect(context: Context): RadioStatus {
  val pm = context.packageManager
  val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
  return RadioStatus(
   pm.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE),
   pm.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT),
   pm.hasSystemFeature(PackageManager.FEATURE_WIFI_AWARE),
   wifi.isWifiEnabled
  )
 }
}