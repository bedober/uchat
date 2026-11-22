class ChatItem {
  const ChatItem({
    required this.name,
    required this.message,
    required this.time,
    this.unread = 0,
    this.isGroup = false,
    this.verified = false,
  });

  final String name;
  final String message;
  final String time;
  final int unread;
  final bool isGroup;
  final bool verified;
}
