package so.zite.uchat.mesh.transport
import android.content.Context
import android.net.wifi.p2p.WifiP2pManager
import android.os.Looper
class WifiDirectDiscovery(context: Context) {
 private val manager = context.applicationContext.getSystemService(Context.WIFI_P2P_SERVICE) as WifiP2pManager
 private val channel = manager.initialize(context.applicationContext, Looper.getMainLooper(), null)
 fun discover(onResult: (Boolean, String) -> Unit) {
  manager.discoverPeers(channel, object : WifiP2pManager.ActionListener {
   override fun onSuccess() = onResult(true, "Wi-Fi Direct discovery started")
   override fun onFailure(reason: Int) = onResult(false, "Wi-Fi Direct discovery failed ($reason)")
  })
 }
}