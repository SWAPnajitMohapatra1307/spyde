const GEO_BOUNDS = {
  MIN_LAT: 8.0,
  MAX_LAT: 37.0,
  MIN_LNG: 68.0,
  MAX_LNG: 97.0,
};

const EARTH_RADIUS_METERS = 6371000;

/**
 * Validates whether the given latitude and longitude coordinates fall within
 * the geographical bounding box of India.
 */
export function isValidIndianCoordinates(lat: number, lng: number): boolean {
  return (
    lat >= GEO_BOUNDS.MIN_LAT &&
    lat <= GEO_BOUNDS.MAX_LAT &&
    lng >= GEO_BOUNDS.MIN_LNG &&
    lng <= GEO_BOUNDS.MAX_LNG
  );
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the shortest path distance in meters between two points on the
 * surface of the Earth using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(rLat1) * Math.cos(rLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}