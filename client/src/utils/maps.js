// Map & Navigation Utilities

/**
 * Open Google Maps Turn-by-Turn Directions
 */
export function openGoogleMapsNavigation(latitude, longitude, address) {
  if (latitude && longitude) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
  } else if (address) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  } else {
    alert('No coordinates or address saved for this location.');
  }
}

/**
 * Open Location Pin on Google Maps
 */
export function openGoogleMapsPin(latitude, longitude, address) {
  if (latitude && longitude) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
  } else if (address) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  } else {
    alert('No location details available.');
  }
}

/**
 * Capture current phone GPS location
 */
export function captureCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}
