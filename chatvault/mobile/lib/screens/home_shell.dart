import 'package:flutter/material.dart';
import '../data/demo_data.dart';
import '../app.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int selected = 0;
  bool hideBalance = true;

  static const tabs = ['Chats', 'Groups', 'Channels', 'Calls', 'Wallet'];

  @override
  Widget build(BuildContext context) {
    final pages = [
      _chats(),
      _groups(),
      _channels(),
      _calls(),
      _wallet(),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text('ChatVault · ${tabs[selected]}'),
        actions: [
          IconButton(
            tooltip: 'Search',
            onPressed: () => _notice('Search will be enabled with the messaging index.'),
            icon: const Icon(Icons.search),
          ),
          IconButton(
            tooltip: 'Profile and settings',
            onPressed: () => _notice('Profile and settings are part of the next implementation stage.'),
            icon: const Icon(Icons.account_circle_outlined),
          ),
        ],
      ),
      body: pages[selected],
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (value) => setState(() => selected = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat), label: 'Chats'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: 'Groups'),
          NavigationDestination(icon: Icon(Icons.campaign_outlined), selectedIcon: Icon(Icons.campaign), label: 'Channels'),
          NavigationDestination(icon: Icon(Icons.call_outlined), selectedIcon: Icon(Icons.call), label: 'Calls'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
        ],
      ),
      floatingActionButton: selected < 3
          ? FloatingActionButton(
              backgroundColor: ChatVaultApp.brand,
              foregroundColor: Colors.white,
              onPressed: () => _notice('Creation flow will be connected to authenticated backend APIs.'),
              child: Icon(selected == 0 ? Icons.add_comment : selected == 1 ? Icons.group_add : Icons.add),
            )
          : null,
    );
  }

  Widget _chats() => ListView.separated(
        itemCount: demoChats.length,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 76),
        itemBuilder: (context, index) {
          final chat = demoChats[index];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: ChatVaultApp.brand.withValues(alpha: .14),
              child: Icon(chat.isGroup ? Icons.groups : Icons.person, color: ChatVaultApp.brand),
            ),
            title: Row(children: [
              Expanded(child: Text(chat.name, style: const TextStyle(fontWeight: FontWeight.w600))),
              Text(chat.time, style: Theme.of(context).textTheme.labelSmall),
            ]),
            subtitle: Row(children: [
              const Icon(Icons.lock_outline, size: 13),
              const SizedBox(width: 4),
              Expanded(child: Text(chat.message, maxLines: 1, overflow: TextOverflow.ellipsis)),
              if (chat.unread > 0) CircleAvatar(
                radius: 10,
                backgroundColor: ChatVaultApp.brand,
                child: Text('${chat.unread}', style: const TextStyle(color: Colors.white, fontSize: 11)),
              ),
            ]),
            onTap: () => _notice('Chat UI preview only. Live E2EE transport is not enabled yet.'),
          );
        },
      );

  Widget _groups() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          _infoBanner('Demo data', 'Member counts are sample display data, not a tested unlimited-capacity service.'),
          for (final group in demoGroups)
            Card(child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.groups)),
              title: Text(group.name),
              subtitle: Text(group.description),
              trailing: Text('${group.members} members'),
              onTap: () => _notice('Group details and Sender Keys are not connected yet.'),
            )),
        ],
      );

  Widget _channels() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          for (final channel in demoChannels)
            Card(child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.campaign)),
              title: Text(channel.name),
              subtitle: Text('${channel.handle} · ${channel.category}'),
              trailing: Text(channel.subscribers),
              onTap: () => _notice('Channel publishing and subscriber encryption are not connected yet.'),
            )),
        ],
      );

  Widget _calls() => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _infoBanner('Calls are not connected', 'The UI is a placeholder. WebRTC signaling, TURN infrastructure and end-to-end media verification must be implemented and tested.'),
          const ListTile(leading: Icon(Icons.call), title: Text('Voice calls'), subtitle: Text('Not configured')),
          const ListTile(leading: Icon(Icons.videocam), title: Text('Video calls'), subtitle: Text('Not configured')),
          const ListTile(leading: Icon(Icons.groups), title: Text('Group calls'), subtitle: Text('Not configured')),
        ],
      );

  Widget _wallet() => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF075E54),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Available balance', style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: Text(hideBalance ? 'UGX ••••••' : 'UGX 0', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold))),
                  IconButton(onPressed: () => setState(() => hideBalance = !hideBalance), color: Colors.white, icon: Icon(hideBalance ? Icons.visibility : Icons.visibility_off)),
                ]),
                const Text('Demo display — no funds or ledger are connected.', style: TextStyle(color: Colors.white70)),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          ListTile(leading: const Icon(Icons.add_circle_outline), title: const Text('Top up with Pesapal'), onTap: () => _notice('Pesapal API v3 merchant credentials and verified IPN are not configured.')),
          ListTile(leading: const Icon(Icons.send), title: const Text('Send money'), onTap: () => _notice('Internal wallet transfers are not enabled.')),
          ListTile(leading: const Icon(Icons.account_balance), title: const Text('Withdraw'), onTap: () => _notice('Payout capability requires merchant approval and backend verification.')),
          ListTile(leading: const Icon(Icons.receipt_long), title: const Text('Transactions'), onTap: () => _notice('No transaction ledger is connected.')),
        ],
      );

  Widget _infoBanner(String title, String body) => Card(
        child: ListTile(
          leading: const Icon(Icons.info_outline),
          title: Text(title),
          subtitle: Text(body),
        ),
      );

  void _notice(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
