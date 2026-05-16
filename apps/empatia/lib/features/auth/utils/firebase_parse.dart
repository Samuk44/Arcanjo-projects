// Utilitários de parsing defensivo para dados do Realtime Database (tipos dinâmicos).

int firebaseInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}

bool firebaseBool(dynamic v) {
  if (v == true || v == 1) return true;
  if (v == false || v == 0) return false;
  if (v is String) {
    final s = v.toLowerCase();
    return s == 'true' || s == '1';
  }
  return false;
}

String firebaseString(dynamic v) => v?.toString() ?? '';
