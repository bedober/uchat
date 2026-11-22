import 'package:flutter/material.dart';
import 'screens/home_shell.dart';

class ChatVaultApp extends StatelessWidget {
  const ChatVaultApp({super.key});

  static const Color brand = Color(0xFF00A884);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ChatVault',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: brand,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFEFEAE2),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF075E54),
          foregroundColor: Colors.white,
          centerTitle: false,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: brand,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF111B21),
      ),
      themeMode: ThemeMode.system,
      home: const HomeShell(),
    );
  }
}
