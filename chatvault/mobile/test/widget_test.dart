import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:chatvault/app.dart';

void main() {
  testWidgets('ChatVault opens on Chats and switches tabs', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: ChatVaultApp()));
    expect(find.text('ChatVault · Chats'), findsOneWidget);
    await tester.tap(find.text('Groups'));
    await tester.pumpAndSettle();
    expect(find.text('ChatVault · Groups'), findsOneWidget);
    expect(find.text('UChat Community'), findsOneWidget);
  });
}
