package com.siege.uchat

import android.annotation.SuppressLint
import android.app.Activity
import android.content.*
import android.net.ConnectivityManager
import android.net.NetworkInfo
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.graphics.Color
import android.graphics.Bitmap
import android.view.Gravity
import android.content.ActivityNotFoundException
import java.io.File

class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var progress: ProgressBar
    private lateinit var status: TextView
    private lateinit var offlineBanner: TextView
    private var uploadCallback: ValueCallback<Array<Uri>>? = null
    private val uploadRequest = 701
    private val liveUrl = "https://uchat.zite.so"
    private lateinit var archiveFile: File
    private var showingOfflineView = false
    private var receiverRegistered = false

    private val connectivityReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            refreshConnectionState()
        }
    }

    private fun hasInternet(): Boolean {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        @Suppress("DEPRECATION")
        val info: NetworkInfo? = cm.activeNetworkInfo
        @Suppress("DEPRECATION")
        return info?.isConnected == true
    }

    private fun refreshConnectionState() {
        if (!::web.isInitialized) return
        if (hasInternet()) {
            offlineBanner.visibility = View.GONE
            if (showingOfflineView) {
                showingOfflineView = false
                status.text = "Connecting to UChat…"
                status.visibility = View.VISIBLE
                web.loadUrl(liveUrl)
            }
        } else {
            offlineBanner.visibility = View.VISIBLE
            if (!showingOfflineView) showOfflineView()
        }
    }

    private fun showOfflineView() {
        showingOfflineView = true
        progress.visibility = View.GONE
        status.visibility = View.GONE
        if (archiveFile.exists() && archiveFile.length() > 0L) {
            web.loadUrl(Uri.fromFile(archiveFile).toString())
        } else {
            val html = """
                <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="theme-color" content="#0c101c"><style>
                *{box-sizing:border-box}body{margin:0;background:#0c101c;color:#fff;font:16px Arial,sans-serif;
                min-height:100vh;display:grid;place-items:center;text-align:center;padding:28px}
                main{max-width:360px}h2{font-size:25px;margin-bottom:10px}p{color:#b8c1d5;line-height:1.5}
                button{background:#6d5dfc;color:white;border:0;border-radius:12px;padding:13px 22px;font-size:16px}
                </style></head><body><main><h2>You're offline</h2>
                <p>UChat needs an internet connection for the latest messages. Connect to the internet and try again.</p>
                <button onclick="location.href='$liveUrl'">Try again</button></main></body></html>
            """.trimIndent()
            web.loadDataWithBaseURL(liveUrl, html, "text/html", "UTF-8", null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        archiveFile = File(filesDir, "uchat-last-page.mhtml")
        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(12, 16, 28)) }
        web = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { max = 100 }
        status = TextView(this).apply {
            text = "Connecting to UChat…"; textSize = 18f; setTextColor(Color.WHITE); gravity = Gravity.CENTER
        }
        offlineBanner = TextView(this).apply {
            text = "Offline view • Showing the last saved page"
            textSize = 12f; setTextColor(Color.WHITE); setBackgroundColor(Color.rgb(75, 55, 145))
            gravity = Gravity.CENTER; setPadding(8, 10, 8, 10); visibility = View.GONE
        }
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        root.addView(progress, FrameLayout.LayoutParams(-1, 5, Gravity.TOP))
        root.addView(status, FrameLayout.LayoutParams(-1, -1))
        root.addView(offlineBanner, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))
        setContentView(root)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = true
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host ?: return true
                if (uri.scheme == "https" && (host == "uchat.zite.so" || host.endsWith(".uchat.zite.so"))) return false
                if (uri.scheme == "https" || uri.scheme == "tel" || uri.scheme == "mailto") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}
                    return true
                }
                return true
            }
            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                if (!showingOfflineView) {
                    status.text = "Connecting to UChat…"
                    status.visibility = View.VISIBLE
                    progress.visibility = View.VISIBLE
                }
            }
            override fun onPageFinished(view: WebView, url: String) {
                status.visibility = View.GONE
                progress.visibility = View.GONE
                CookieManager.getInstance().flush()
                if (!showingOfflineView && url.startsWith(liveUrl)) {
                    web.saveWebArchive(archiveFile.absolutePath, false) { path ->
                        if (path != null) archiveFile = File(path)
                    }
                }
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && !hasInternet()) showOfflineView()
                else if (request.isForMainFrame) {
                    status.text = "Unable to load UChat. Tap to retry."
                    status.setOnClickListener { web.loadUrl(liveUrl) }
                    status.visibility = View.VISIBLE
                }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (!showingOfflineView) {
                    progress.progress = newProgress
                    progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
                }
            }
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                uploadCallback?.onReceiveValue(null); uploadCallback = callback
                return try { startActivityForResult(params.createIntent(), uploadRequest); true }
                catch (_: ActivityNotFoundException) { uploadCallback = null; false }
            }
        }
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState)
            refreshConnectionState()
        } else if (hasInternet()) {
            web.loadUrl(liveUrl)
        } else {
            refreshConnectionState()
        }
    }

    override fun onResume() {
        super.onResume()
        if (!receiverRegistered) {
            @Suppress("DEPRECATION")
            registerReceiver(connectivityReceiver, IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION))
            receiverRegistered = true
        }
        refreshConnectionState()
    }

    override fun onPause() {
        if (receiverRegistered) {
            unregisterReceiver(connectivityReceiver)
            receiverRegistered = false
        }
        super.onPause()
    }

    @Deprecated("Deprecated")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == uploadRequest) {
            uploadCallback?.onReceiveValue(if (resultCode == RESULT_OK && data != null)
                FileChooserParams.parseResult(resultCode, data) else null)
            uploadCallback = null
        }
    }
    override fun onSaveInstanceState(outState: Bundle) {
        web.saveState(outState); super.onSaveInstanceState(outState)
    }
    @Deprecated("Deprecated")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
    override fun onDestroy() {
        if (::web.isInitialized) { web.stopLoading(); web.destroy() }
        super.onDestroy()
    }
}
