package com.uchat.mesh

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.ui.text.style.TextOverflow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Green = Color(0xFF075E54)
private val Accent = Color(0xFF128C7E)
private val Page = Color(0xFFF7F8F8)
private val Muted = Color(0xFF667781)

data class ChatMessage(val text: String, val time: String, val mine: Boolean)
data class ChatThread(val id: Int, val name: String, val preview: String, val time: String, val unread: Int, val color: Color, val messages: List<ChatMessage>)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(7, 94, 84)
        window.navigationBarColor = android.graphics.Color.rgb(255, 255, 255)
        window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        setContent { UChatApp() }
    }
}

@Composable
private fun UChatApp() {
    var selected by remember { mutableStateOf<Int?>(null) }
    var tab by remember { mutableStateOf("Chats") }
    var search by remember { mutableStateOf("") }
    BackHandler(selected != null) { selected = null }

    MaterialTheme(colorScheme = lightColorScheme(primary = Green, secondary = Accent, background = Page)) {
        Column(Modifier.fillMaxSize().background(Page)) {
            Column(Modifier.fillMaxWidth().background(Green).padding(start = 18.dp, end = 12.dp, top = 18.dp, bottom = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("UChat", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    IconButton(onClick = { search = if (search.isEmpty()) " " else "" }) { Icon(Icons.Default.Search, null, tint = Color.White) }
                    IconButton(onClick = { tab = "Settings" }) { Icon(Icons.Default.MoreVert, null, tint = Color.White) }
                }
                if (search.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = search.trimStart(), onValueChange = { search = " " + it }, placeholder = { Text("Search people and chats") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
            }

            Box(Modifier.weight(1f).fillMaxWidth()) {
                when (tab) {
                    "Chats" -> EmptyTab(Icons.Default.Chat, "Your chats will appear here", "Sign in and start a conversation. No sample conversations are shown.")
                    "Calls" -> EmptyTab(Icons.Default.Call, "No calls yet", "Your real call history will appear here when calling is connected.")
                    "Wallet" -> WalletHome()
                    "Communities" -> EmptyTab(Icons.Default.Groups, "Communities", "Your groups and communities will appear here.")
                    else -> EmptyTab(Icons.Default.Settings, "Settings", "Account, privacy, security and notification settings.")
                }
            }

            NavigationBar(containerColor = Color.White, tonalElevation = 6.dp) {
                listOf(
                    Triple("Chats", Icons.Default.Chat, "Chats"),
                    Triple("Calls", Icons.Default.Call, "Calls"),
                    Triple("Wallet", Icons.Default.AccountBalanceWallet, "Wallet"),
                    Triple("Communities", Icons.Default.Groups, "Groups"),
                    Triple("Settings", Icons.Default.Settings, "Settings")
                ).forEach { (destination, icon, label) ->
                    NavigationBarItem(
                        selected = tab == destination,
                        onClick = { tab = destination; selected = null },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, fontSize = 10.sp) },
                        alwaysShowLabel = true,
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent, indicatorColor = Color(0xFFE1F3EF))
                    )
                }
            }
        }
    }
}

@Composable
private fun WalletHome() {
    Column(
        Modifier.fillMaxSize().background(Page).padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(Modifier.size(76.dp).clip(CircleShape).background(Color(0xFFE1F3EF)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Accent, modifier = Modifier.size(38.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text("UChat Wallet", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111B21))
        Spacer(Modifier.height(8.dp))
        Text("Your personal wallet", color = Muted, fontSize = 14.sp)
        Spacer(Modifier.height(18.dp))
        Text("Wallet services are not connected yet.", color = Color(0xFF8A4B08), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text("No balance or transactions are fabricated. Wallet creation, secure recovery, transfers and marketplace payments must be implemented before funds can be used.", color = Muted, fontSize = 13.sp, lineHeight = 19.sp)
    }
}

@Composable
private fun SectionHint(label: String) {
    Text(label, color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 18.dp, top = 18.dp, bottom = 8.dp))
}

@Composable
private fun ChatRow(thread: ChatThread, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).background(Color.White).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(52.dp).clip(CircleShape).background(thread.color), contentAlignment = Alignment.Center) {
            Text(thread.name.take(1).uppercase(), color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(thread.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color(0xFF111B21), modifier = Modifier.weight(1f))
                Text(thread.time, color = if (thread.unread > 0) Accent else Muted, fontSize = 11.sp)
            }
            Spacer(Modifier.height(5.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(thread.preview, color = Muted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                if (thread.unread > 0) {
                    Spacer(Modifier.width(8.dp))
                    Box(Modifier.size(20.dp).clip(CircleShape).background(Accent), contentAlignment = Alignment.Center) { Text(thread.unread.toString(), color = Color.White, fontSize = 10.sp) }
                }
            }
        }
    }
    HorizontalDivider(color = Color(0xFFF0F2F2), thickness = 1.dp, modifier = Modifier.padding(start = 80.dp))
}

@Composable
private fun ConversationScreen(thread: ChatThread, onBack: () -> Unit, onSend: (String) -> Unit) {
    var draft by remember(thread.id) { mutableStateOf("") }
    Column(Modifier.fillMaxSize().background(Color(0xFFECE5DD))) {
        Row(Modifier.fillMaxWidth().background(Green).padding(horizontal = 6.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = Color.White) }
            Box(Modifier.size(38.dp).clip(CircleShape).background(thread.color), contentAlignment = Alignment.Center) { Text(thread.name.take(1), color = Color.White, fontWeight = FontWeight.Bold) }
            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                Text(thread.name, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Text("tap here for contact info", color = Color(0xFFD5E8E4), fontSize = 11.sp)
            }
            IconButton(onClick = {}) { Icon(Icons.Default.Call, "Call", tint = Color.White) }
            IconButton(onClick = {}) { Icon(Icons.Default.MoreVert, "More", tint = Color.White) }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 10.dp, vertical = 12.dp), reverseLayout = false) {
            itemsIndexed(thread.messages) { _, msg ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (msg.mine) Arrangement.End else Arrangement.Start) {
                    Column(Modifier.widthIn(max = 300.dp).padding(vertical = 3.dp).clip(RoundedCornerShape(12.dp)).background(if (msg.mine) Color(0xFFD9FDD3) else Color.White).padding(horizontal = 11.dp, vertical = 8.dp)) {
                        Text(msg.text, color = Color(0xFF111B21), fontSize = 14.sp)
                        Text(msg.time, color = Muted, fontSize = 10.sp, modifier = Modifier.align(Alignment.End).padding(top = 4.dp))
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth().background(Page).padding(horizontal = 7.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = {}) { Icon(Icons.Default.AttachFile, "Attach", tint = Muted) }
            IconButton(onClick = {}) { Icon(Icons.Default.CameraAlt, "Camera", tint = Muted) }
            Row(Modifier.weight(1f).clip(RoundedCornerShape(24.dp)).background(Color.White).padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                BasicTextField(value = draft, onValueChange = { draft = it }, modifier = Modifier.weight(1f), textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF111B21), fontSize = 14.sp), decorationBox = { inner -> if (draft.isEmpty()) Text("Message", color = Muted, fontSize = 14.sp); inner() })
            }
            Spacer(Modifier.width(6.dp))
            IconButton(onClick = { if (draft.isNotBlank()) { onSend(draft.trim()); draft = "" } }) {
                Icon(if (draft.isBlank()) Icons.Default.Mic else Icons.Default.Send, "Send", tint = Accent)
            }
        }
    }
}

@Composable
private fun EmptyTab(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, detail: String) {
    Column(Modifier.fillMaxSize().background(Page), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(icon, null, tint = Accent, modifier = Modifier.size(54.dp))
        Spacer(Modifier.height(14.dp))
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
        Spacer(Modifier.height(5.dp))
        Text(detail, color = Muted, fontSize = 13.sp)
    }
}
