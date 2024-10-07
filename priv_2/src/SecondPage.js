import React, { useState, useEffect } from 'react';
import './App.css'; 
import EXIF from 'exif-js';

/**
 * Dynamically load the Google Maps script and call the initialize function
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
 * Initialize Google Maps with Street View
 */
function initialize(latitude, longitude) {
  const location = { lat: latitude, lng: longitude };
  const map = new window.google.maps.Map(document.getElementById("map"), {
    center: location,
    zoom: 14,
  });
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

  map.setStreetView(panorama);
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
                console.log("Latitude: " + latitude + " Longitude: " + longitude);
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

function SecondPage() {
  const [images, setImages] = useState([]);
  const [coordinates, setCoordinates] = useState(null);

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

  // Trigger `initialize` function after coordinates are set and Google Maps API is loaded
  useEffect(() => {
    if (coordinates) {
      // Attach the initialize function to the window object so it's globally accessible
      window.initialize = () => initialize(coordinates.latitude, coordinates.longitude);
      loadGoogleMapsScript(window.initialize); // Load the Google Maps script and call initialize
    }
  }, [coordinates]);

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

      {/* Google Maps and Street View Containers */}
      <div id="interface" style={{ display: 'flex', width: '100%', height: '75vh' }}>
        <div id="map" style={{ flex: 1}}></div>
        <div id="pano" style={{ flex: 3 }}></div>
      </div>

    </div>
  );
}

export default SecondPage;
