import '../models/chat_item.dart';

const demoChats = <ChatItem>[
  ChatItem(name: 'Amina N.', message: 'The documents are ready.', time: '09:42', unread: 2, verified: true),
  ChatItem(name: 'Daniel K.', message: 'Voice message · 0:18', time: '09:15'),
  ChatItem(name: 'Family', message: 'Mum: See you on Sunday', time: 'Yesterday', unread: 4, isGroup: true),
  ChatItem(name: 'Sarah W.', message: 'Thank you!', time: 'Yesterday'),
  ChatItem(name: 'Work Team', message: 'Meeting moved to 14:00', time: 'Mon', isGroup: true, unread: 1),
  ChatItem(name: 'Brian O.', message: 'Photo', time: 'Mon'),
  ChatItem(name: 'Campus Friends', message: 'You: Sounds good', time: 'Sun', isGroup: true),
  ChatItem(name: 'Grace M.', message: 'Call me when free', time: 'Sat'),
  ChatItem(name: 'Peter T.', message: 'Location shared', time: 'Fri'),
  ChatItem(name: 'Moses L.', message: 'Good morning', time: 'Thu'),
];

class DemoGroup {
  const DemoGroup(this.name, this.members, this.description);
  final String name;
  final int members;
  final String description;
}

const demoGroups = <DemoGroup>[
  DemoGroup('UChat Community', 5000, 'Community announcements and discussion'),
  DemoGroup('Friends Circle', 18, 'Friends and family'),
  DemoGroup('Builders Hub', 64, 'Technology, projects and collaboration'),
];

class DemoChannel {
  const DemoChannel(this.name, this.handle, this.subscribers, this.category);
  final String name;
  final String handle;
  final String subscribers;
  final String category;
}

const demoChannels = <DemoChannel>[
  DemoChannel('Uganda Tech News', '@ugtechnews', '12.4K', 'News'),
  DemoChannel('Afrobeats Daily', '@afrobeatsdaily', '8.1K', 'Music'),
];
