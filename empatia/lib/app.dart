// lib/app.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'features/auth/screens/main_screen.dart';
import 'features/auth/screens/login/login.dart';
import 'features/app_colors.dart';

class EmpatiaApp extends StatelessWidget {
  const EmpatiaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Empatia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.dark(
          primary: AppColors.pink,
          secondary: AppColors.yellow,
          surface: AppColors.navy,
        ),
        scaffoldBackgroundColor: AppColors.navy,
        fontFamily: 'Roboto',
        // NavigationBar theme
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: AppColors.navyLight,
          indicatorColor: AppColors.pink.withValues(alpha: 0.15),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(
                color: AppColors.pink,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              );
            }
            return TextStyle(
              color: Colors.white.withValues(alpha: 0.4),
              fontSize: 11,
            );
          }),
        ),
      ),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              backgroundColor: AppColors.navy,
              body: Center(
                child: CircularProgressIndicator(color: AppColors.pink),
              ),
            );
          }
          if (snapshot.hasData) {
            return const MainScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}
