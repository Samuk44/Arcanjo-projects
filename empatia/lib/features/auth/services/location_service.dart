// Resolução de cidade aproximada via GPS + geocodificação reversa (filtro de proximidade).

import 'package:flutter/foundation.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Retorna o nome da cidade/localidade atual ou null se indisponível.
  static Future<String?> cidadeDaLocalizacaoAtual() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
        ),
      );

      final marks = await placemarkFromCoordinates(
        pos.latitude,
        pos.longitude,
      );
      if (marks.isEmpty) return null;
      final p = marks.first;
      return p.locality ??
          p.subAdministrativeArea ??
          p.administrativeArea;
    } catch (e, st) {
      debugPrint('LocationService: $e\n$st');
      return null;
    }
  }
}
