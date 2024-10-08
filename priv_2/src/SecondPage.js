import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import EXIF from 'exif-js';

/*
https://mapsplatform.google.com/resources/blog/how-calculate-distances-map-maps-javascript-api/
*/

/**
 * Dynamically load the Google Maps script and call the callback once loaded
 */
function loadGoogleMapsScript(callback) {
  if (typeof window.google === 'undefined') {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAvvN-YaRDjh-AwygMlrh55NOCsvpXXv58&libraries=geometry&v=weekly`;
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

    window.google.maps.mapInstance = map; // Store the map instance for later use

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
        scaledSize: new window.google.maps.Size(150, 150), // Scale the default marker size (width, height)
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


function SecondPage() {
  const [images, setImages] = useState([]);
  const canvasRef = useRef(null); // Reference to the canvas
  const [coordinates, setCoordinates] = useState(null); // Actual coordinates from EXIF
  const [guessedCoordinates, setGuessedCoordinates] = useState(null); // User's guessed coordinates
  const [distance, setDistance] = useState(null); // Distance between guess and actual location

  const handleDrop = (event) => {
    event.preventDefault(); // Prevent default behavior (open as link for some elements)
    event.stopPropagation(); // Stop the event from propagating further
    
    console.log("Drop event triggered");
  
    const items = event.dataTransfer.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          console.log("Processing folder...");
          processFolder(entry, setImages, setCoordinates);
        } else {
          console.log("Not a directory or unsupported item.");
        }
      }
    }
  };
  
  const handleDragOver = (event) => {
    event.preventDefault(); // Prevent default behavior during drag over
    event.stopPropagation(); // Stop propagation
    console.log("Drag over event triggered");
  };
  
  // Inside the `submitGuess` function
  const submitGuess = () => {
    if (coordinates && guessedCoordinates) {
      const actualLatLng = new window.google.maps.LatLng(coordinates.latitude, coordinates.longitude);
      const guessedLatLng = new window.google.maps.LatLng(guessedCoordinates.latitude, guessedCoordinates.longitude);
      
      // Use Google Maps Geometry library to calculate distance
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(actualLatLng, guessedLatLng) / 1000; // Convert meters to kilometers
      setDistance(distance);
  
      // Add the star icon at the actual location
      new window.google.maps.Marker({
        position: actualLatLng,
        map: window.google.maps.mapInstance,
        icon: {
          url: "https://maps.google.com/mapfiles/kml/paddle/ltblu-diamond.png", // Star icon
          scaledSize: new window.google.maps.Size(150, 150), // Scale the star icon size
        },
        title: "Actual Location",
      });
  
      // Draw a line connecting the actual and guessed points
      const line = new window.google.maps.Polyline({
        path: [actualLatLng, guessedLatLng],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
      });
  
      line.setMap(window.google.maps.mapInstance); // Assuming you have a reference to the map instance
  
      // Expand the map to take the whole interface space
      document.getElementById('map').style.flex = '1 1 100%';  // Make map take full width
      document.getElementById('pano').style.display = 'none';  // Hide panorama section
  
      console.log(`Distance between guess and actual location: ${distance} km`);
    }
  };
  

  

  // Initialize world map after the component mounts
  useEffect(() => {
    // Load Google Maps script and initialize the world map after it's loaded
    loadGoogleMapsScript(() => {
      if (typeof initializeWorldMap === 'function') {
        initializeWorldMap(setGuessedCoordinates); // Call the initialize function after the script loads
      } else {
        console.error("initializeWorldMap is not defined");
      }
    });
  }, []);
  

  // Initialize Street View Panorama when actual coordinates are set
  useEffect(() => {
    if (coordinates) {
      initializeStreetView(coordinates.latitude, coordinates.longitude);
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

  <div id="interface" style={{ display: 'flex', width: '100%', height: '75vh', position: 'relative' }}>
  <button
    onClick={submitGuess}
    style={{
      height: '200px',
      position: 'absolute',
      left: '20px',
      fontSize: '100px',
      top: '100px',
      fontFamily: 'Bungee Tint',
      borderRadius: '10px',
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
    }}
  >
    GUESS
  </button>
  
  <div id="map" style={{ flex: 1 }}></div>
  <div id="pano" style={{ flex: 3 }}></div>

  {distance !== null && (
    <div
      style={{
        position: 'absolute',
        top: '40%',  // Adjust the vertical positioning within the visible area
        left: '50%',
        transform: 'translateX(-50%)',  // Center horizontally
        zIndex: 999,
        color: 'red',
        fontSize: '200px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        padding: '10px 20px',
        borderRadius: '10px',
        fontFamily: 'Bungee Tint',
      }}
    >
      {distance.toFixed(2)} KM FROM MEMTARGET
    </div>
  )}
</div>


    </div>
  );
}

export default SecondPage;
