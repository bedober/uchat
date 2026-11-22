package so.zite.uchat.mesh

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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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
    val initial = listOf(
        ChatThread(1, "UChat Team", "Welcome to UChat 👋", "12:42", 2, Color(0xFF1B8A78), listOf(
            ChatMessage("Welcome to UChat!", "12:40", false),
            ChatMessage("Your chats will appear here.", "12:41", false),
            ChatMessage("Great, let's get started.", "12:42", true)
        )),
        ChatThread(2, "Alex Morgan", "Are we still meeting today?", "11:18", 1, Color(0xFF547DA5), listOf(
            ChatMessage("Hey! Are we still meeting today?", "11:17", false)
        )),
        ChatThread(3, "Family Group", "Mum: Have a good day ❤️", "Yesterday", 0, Color(0xFFB8794C), listOf(
            ChatMessage("Good morning everyone", "08:10", false),
            ChatMessage("Have a good day ❤️", "08:12", false)
        )),
        ChatThread(4, "Sam", "Photo", "Yesterday", 0, Color(0xFF8064A2), listOf(
            ChatMessage("Sent you a photo", "19:20", false)
        ))
    )
    var threads by remember { mutableStateOf(initial) }
    var selected by remember { mutableStateOf<Int?>(null) }
    var tab by remember { mutableStateOf("Chats") }
    var search by remember { mutableStateOf("") }
    BackHandler(selected != null) { selected = null }
    val active = threads.firstOrNull { it.id == selected }

    MaterialTheme(colorScheme = lightColorScheme(primary = Green, secondary = Accent, background = Page)) {
        if (active != null) {
            ConversationScreen(active, onBack = { selected = null }, onSend = { value ->
                val stamp = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
                threads = threads.map { thread ->
                    if (thread.id == active.id) thread.copy(preview = value, time = stamp, messages = thread.messages + ChatMessage(value, stamp, true)) else thread
                }
            })
        } else {
            Column(Modifier.fillMaxSize().background(Page)) {
                Column(Modifier.fillMaxWidth().background(Green).padding(start = 18.dp, end = 12.dp, top = 18.dp, bottom = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("UChat", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        IconButton(onClick = { search = if (search.isEmpty()) " " else "" }) { Icon(Icons.Default.Search, null, tint = Color.White) }
                        IconButton(onClick = { tab = "Settings" }) { Icon(Icons.Default.MoreVert, null, tint = Color.White) }
                    }
                    if (search.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(value = search.trimStart(), onValueChange = { search = " " + it }, placeholder = { Text("Search chats") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color.White, unfocusedBorderColor = Color.LightGray))
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        listOf("Chats", "Calls", "Groups", "Settings").forEach { item ->
                            Text(item.uppercase(), color = if (tab == item) Color.White else Color(0xFFB9D7D2), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, modifier = Modifier.clickable { tab = item }.padding(horizontal = 8.dp, vertical = 8.dp))
                        }
                    }
                }
                when (tab) {
                    "Chats" -> {
                        LazyColumn(Modifier.weight(1f)) {
                            item { SectionHint("MESSAGES") }
                            items(threads.filter { search.trim().isEmpty() || it.name.contains(search.trim(), true) || it.preview.contains(search.trim(), true) }) { thread ->
                                ChatRow(thread) { selected = thread.id }
                            }
                        }
                        FloatingActionButton(onClick = { tab = "Groups" }, containerColor = Accent, contentColor = Color.White, modifier = Modifier.align(Alignment.End).padding(16.dp)) { Icon(Icons.Default.Chat, "New chat") }
                    }
                    "Calls" -> EmptyTab(Icons.Default.Call, "No calls yet", "Your recent calls will appear here.")
                    "Groups" -> EmptyTab(Icons.Default.Groups, "Start a group", "Group conversations will appear here.")
                    else -> EmptyTab(Icons.Default.Settings, "Settings", "Profile, privacy, notifications and account settings.")
                }
            }
        }
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
