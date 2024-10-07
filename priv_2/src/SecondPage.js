import React, { useState, useEffect } from 'react';
import './App.css'; 
import EXIF from 'exif-js';

/**
 * Dynamically load the Google Maps script and call the callback once loaded
 */
function loadGoogleMapsScript(callback) {
  if (typeof window.google === 'undefined') {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&v=weekly&solution_channel=GMP_CCS_streetview_v2`;
    script.async = true;
    script.defer = true;
    script.onload = callback;  // Call initialize once the script is loaded
    document.head.appendChild(script);
  } else {
    if (callback) {
      callback();
    }
  }
}

/**
 * Initialize Google Maps with a world map for guessing
 */
function initializeWorldMap(setGuessedCoordinates) {
  if (window.google && window.google.maps) {
    const map = new window.google.maps.Map(document.getElementById("map"), {
      center: { lat: 20, lng: 0 }, // Center the map at the equator
      zoom: 3.6, // Zoomed out for a world map view
    });

    let marker = null; // Variable to store the marker, so it can be updated

    // Add a click listener to get the user's guessed location and drop a pin
    map.addListener('click', (event) => {
      const clickedLatLng = {
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      };

      // Custom icon (default marker with scaling)
      const icon = {
        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Default marker
        scaledSize: new window.google.maps.Size(100, 100), // Scale the default marker size (width, height)
      };

      // If there's already a marker, move it; otherwise, create a new one
      if (marker) {
        marker.setPosition(event.latLng);
      } else {
        marker = new window.google.maps.Marker({
          position: event.latLng,
          map: map,
          title: "Your Guess", // Optional title for the marker
          icon: icon, // Use the scaled default icon
        });
      }

      setGuessedCoordinates(clickedLatLng); // Update the guessed coordinates
      console.log('Guessed Coordinates:', clickedLatLng);
    });
  }
}

/**
 * Initialize the Street View Panorama based on actual coordinates
 */
function initializeStreetView(latitude, longitude) {
  if (window.google && window.google.maps) {
    const location = { lat: latitude, lng: longitude };
    const panorama = new window.google.maps.StreetViewPanorama(
      document.getElementById("pano"),
      {
        position: location,
        pov: {
          heading: 34,
          pitch: 10,
        },
      }
    );
    console.log("Street View Panorama initialized at:", location);
  }
}

/**
 * Process folder to read images and extract GPS EXIF data
 */
function processFolder(folder, setImages, setCoordinates) {
  const reader = folder.createReader();
  const imageFiles = [];

  reader.readEntries(function (entries) {
    for (let entry of entries) {
      if (entry.isFile) {
        entry.file(function (file) {
          if (file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            imageFiles.push(imageUrl);

            // Extract EXIF data, including coordinates
            EXIF.getData(file, function () {
              const lat = EXIF.getTag(this, 'GPSLatitude');
              const lon = EXIF.getTag(this, 'GPSLongitude');
              if (lat && lon) {
                const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
                const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'W';
                const latitude = convertDMSToDD(lat, latRef);
                const longitude = convertDMSToDD(lon, lonRef);
                setCoordinates({ latitude, longitude });
                console.log("Actual Coordinates:", { latitude, longitude });
              } else {
                console.log("No GPS data found in image.");
              }
            });

            setImages(imageFiles);
          }
        });
      }
    }
  });
}

// Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
function convertDMSToDD(dms, ref) {
  const degrees = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return (ref === 'S' || ref === 'W') ? -degrees : degrees;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(coords1, coords2) {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371; // Radius of Earth in kilometers
  const lat1 = toRad(coords1.latitude);
  const lon1 = toRad(coords1.longitude);
  const lat2 = toRad(coords2.latitude);
  const lon2 = toRad(coords2.longitude);
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;

  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
}

function SecondPage() {
  const [images, setImages] = useState([]);
  const [coordinates, setCoordinates] = useState(null); // Actual coordinates from EXIF
  const [guessedCoordinates, setGuessedCoordinates] = useState(null); // User's guessed coordinates
  const [distance, setDistance] = useState(null); // Distance between guess and actual location

  const handleDrop = (event) => {
    event.preventDefault();
    const items = event.dataTransfer.items;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry.isDirectory) {
          processFolder(entry, setImages, setCoordinates);
        }
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Initialize world map after the component mounts
  useEffect(() => {
    loadGoogleMapsScript(() => initializeWorldMap(setGuessedCoordinates));
  }, []);

  // Initialize Street View Panorama when actual coordinates are set
  useEffect(() => {
    if (coordinates) {
      initializeStreetView(coordinates.latitude, coordinates.longitude);
    }
  }, [coordinates]);

  // Compare guessed coordinates with actual coordinates and calculate the distance
  useEffect(() => {
    if (coordinates && guessedCoordinates) {
      const dist = calculateDistance(coordinates, guessedCoordinates);
      setDistance(dist);
      console.log(`Distance between guess and actual location: ${dist} km`);
    }
  }, [guessedCoordinates, coordinates]);

  return (
    <div className="App-header">
      <h1 className="page_title">Memguessr</h1>

      <div
        id="dropArea"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          padding: '20px',
          width: '50%',
          height: '300px',
          margin: 'auto',
          textAlign: 'center',
          opacity: 0.8,
          backgroundColor: '#31363f',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#61dafb',
        }}
      >
        [DROP MEMS]
      </div>

      <div id="interface" style={{ display: 'flex', width: '100%', height: '75vh' }}>
        <div id="map" style={{ flex: 1 }}></div>
        <div id="pano" style={{ flex: 3 }}></div>
      </div>

      {distance !== null && (
        <div>
          <h2>Your guess was {distance.toFixed(2)} km away from the actual location!</h2>
        </div>
      )}
    </div>
  );
}

export default SecondPage;
