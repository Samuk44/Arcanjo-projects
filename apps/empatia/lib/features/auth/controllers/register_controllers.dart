import "package:flutter/material.dart";

class RegisterController {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  final cpfController = TextEditingController();
  void dispose() {
  emailController.dispose();
  passwordController.dispose();
  confirmPasswordController.dispose();
  cpfController.dispose();
}
}
