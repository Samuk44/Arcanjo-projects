import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Smoke: MaterialApp monta sem erros', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Empatia')),
        ),
      ),
    );
    expect(find.text('Empatia'), findsOneWidget);
  });
}
