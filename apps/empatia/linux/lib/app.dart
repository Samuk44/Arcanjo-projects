import 'package:empatia/features/auth/screens/register/register.dart';
import 'package:flutter/material.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Empatia',
      theme: ThemeData(primaryColor: Colors.blue),
      home: RegisterScreen(),
    );
  }
}