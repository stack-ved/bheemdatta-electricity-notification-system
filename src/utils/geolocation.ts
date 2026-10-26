import { LOCATIONS } from '../data/locationsData';
import type { LocationItem } from '../types';

export interface DeviceLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface GeolocationErrorDetails {
  code: GeolocationErrorCode;
  messageEn: string;
  messageNe: string;
  helpEn?: string;
  helpNe?: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLatitude(value: number): boolean {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

/**
 * Standard Haversine distance between two GPS coordinates in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest known settlement/location in Bheemdatta Municipality
 * based on true device GPS coordinates.
 */
export function findNearestBheemdattaLocation(
  lat: number,
  lng: number
): {
  nearestLocation: LocationItem | null;
  distanceKm: number;
  isWithinMunicipality: boolean;
} {
  let nearestLocation: LocationItem | null = null;
  let minDistance = Infinity;

  for (const loc of LOCATIONS) {
    if (loc.coordinates) {
      const dist = calculateDistanceKm(lat, lng, loc.coordinates.lat, loc.coordinates.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestLocation = loc;
      }
    }
  }

  // Bheemdatta Municipality extent is roughly ~25 km radius
  const isWithinMunicipality = minDistance <= 25;

  return {
    nearestLocation,
    distanceKm: Math.round(minDistance * 10) / 10,
    isWithinMunicipality,
  };
}

/**
 * Requests one-time high-accuracy device location using the browser Geolocation API.
 * Follows all strict privacy and accuracy requirements:
 * - One-time call only (no watchPosition)
 * - maximumAge: 0 to avoid cached stale fixes
 * - enableHighAccuracy: true for genuine GPS/device accuracy
 * - Handles all errors (permission denied, position unavailable, timeout, insecure context, unsupported browser)
 */
export function requestDeviceLocation(): Promise<{
  data: DeviceLocationResult | null;
  error: GeolocationErrorDetails | null;
}> {
  return new Promise((resolve) => {
    // 1. Check secure context (Geolocation requires HTTPS or localhost)
    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]';

      if (!window.isSecureContext && !isLocalhost) {
        return resolve({
          data: null,
          error: {
            code: 'INSECURE_CONTEXT',
            messageEn:
              'Location access requires a secure connection (HTTPS). Please open this site via HTTPS or localhost.',
            messageNe:
              'स्थान पहुँचको लागि सुरक्षित जडान (HTTPS) आवश्यक पर्दछ। कृपया यो साइट HTTPS वा localhost मार्फत खोल्नुहोस्।',
          },
        });
      }
    }

    // 2. Check if geolocation is supported
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve({
        data: null,
        error: {
          code: 'UNSUPPORTED',
          messageEn: 'Location services are not supported by this browser.',
          messageNe: 'यो ब्राउजरमा स्थान सेवा समर्थित छैन।',
        },
      });
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = Number(pos.coords.latitude);
        const longitude = Number(pos.coords.longitude);
        const accuracy = Number(pos.coords.accuracy ?? 0);

        if (!isValidLatitude(latitude) || !isValidLongitude(longitude) || !Number.isFinite(accuracy) || accuracy < 0) {
          return resolve({
            data: null,
            error: {
              code: 'POSITION_UNAVAILABLE',
              messageEn:
                'The browser returned invalid GPS coordinates. Please try again with location access enabled.',
              messageNe:
                'ब्राउजरले अवैध GPS निर्देशांक फिर्ता गरेको छ। कृपया स्थान पहुँच अनुमति सहित पुन: प्रयास गर्नुहोस्।',
              helpEn: 'Check that your device GPS is enabled and retry.',
              helpNe: 'आफ्नो उपकरणको GPS सक्रिय छ भने पुन: प्रयास गर्नुहोस्।',
            },
          });
        }

        resolve({
          data: {
            latitude,
            longitude,
            accuracy,
            timestamp: pos.timestamp,
          },
          error: null,
        });
      },
      (err) => {
        let code: GeolocationErrorCode = 'UNKNOWN';
        let messageEn = 'An unexpected error occurred while detecting your location. Please try again.';
        let messageNe = 'स्थान पहिचान गर्दा अप्रत्याशित समस्या आयो। कृपया पुन: प्रयास गर्नुहोस्।';
        let helpEn: string | undefined;
        let helpNe: string | undefined;

        if (err.code === err.PERMISSION_DENIED) {
          code = 'PERMISSION_DENIED';
          messageEn =
            'Location permission was denied. Please allow location access in your browser settings and try again.';
          messageNe =
            'स्थान अनुमति अस्वीकार गरियो। कृपया आफ्नो ब्राउजर सेटिङमा स्थान पहुँच सक्षम गर्नुहोस् र पुन: प्रयास गर्नुहोस्।';
          helpEn =
            'Location access is blocked. Click the lock/site settings icon in your browser address bar, allow Location access, then try again.';
          helpNe =
            'स्थान पहुँच अवरुद्ध छ। ब्राउजर ठेगाना पट्टीमा रहेको लक/साइट सेटिङ आइकनमा क्लिक गरी स्थान पहुँच अनुमति दिनुहोस्, त्यसपछि पुन: प्रयास गर्नुहोस्।';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          code = 'POSITION_UNAVAILABLE';
          messageEn =
            'Your location could not be determined. Please check your device location/GPS and try again.';
          messageNe =
            'तपाईंको स्थान पहिचान हुन सकेन। कृपया आफ्नो उपकरणको स्थान/GPS सक्षम भएको जाँच गर्नुहोस् र पुन: प्रयास गर्नुहोस्।';
        } else if (err.code === err.TIMEOUT) {
          code = 'TIMEOUT';
          messageEn = 'Location request timed out. Please try again.';
          messageNe = 'स्थान अनुरोधको समय समाप्त भयो। कृपया पुन: प्रयास गर्नुहोस्।';
        }

        resolve({
          data: null,
          error: {
            code,
            messageEn,
            messageNe,
            helpEn,
            helpNe,
          },
        });
      },
      options
    );
  });
}
