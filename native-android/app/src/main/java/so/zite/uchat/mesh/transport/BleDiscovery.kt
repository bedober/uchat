package so.zite.uchat.mesh.transport
import android.Manifest
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
class BleDiscovery(private val context: Context) {
 private val scanner get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter?.bluetoothLeScanner
 private var onPeer: ((String) -> Unit)? = null
 private val callback = object : ScanCallback() {
  override fun onScanResult(callbackType: Int, result: ScanResult) {
   val label = try { result.device.name ?: result.device.address } catch (_: SecurityException) { "Nearby device" }
   onPeer?.invoke(label)
  }
  override fun onScanFailed(errorCode: Int) { onPeer?.invoke("BLE scan failed: $errorCode") }
 }
 fun start(onFound: (String) -> Unit): Boolean {
  val permission = if (Build.VERSION.SDK_INT >= 31) Manifest.permission.BLUETOOTH_SCAN else Manifest.permission.ACCESS_FINE_LOCATION
  if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) return false
  onPeer = onFound
  return try { scanner?.startScan(callback); scanner != null } catch (_: SecurityException) { false }
 }
 fun stop() { try { scanner?.stopScan(callback) } catch (_: SecurityException) { } }
}