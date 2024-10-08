import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import EXIF from 'exif-js';

function loadGoogleMapsScript(callback) {
  if (typeof window.google === 'undefined') {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAvvN-YaRDjh-AwygMlrh55NOCsvpXXv58&libraries=geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = callback; 
    document.head.appendChild(script);
  } else {
    if (callback) {
      callback();
    }
  }
}

function initializeWorldMap(setGuessedCoordinates) {
  if (window.google && window.google.maps) {
    const map = new window.google.maps.Map(document.getElementById("map"), {
      center: { lat: 20, lng: 0 }, 
      zoom: 3.6,
    });

    window.google.maps.mapInstance = map; 

    let marker = null; 

    map.addListener('click', (event) => {
      const clickedLatLng = {
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      };

      const icon = {
        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", 
        scaledSize: new window.google.maps.Size(150, 150),
      };

      if (marker) {
        marker.setPosition(event.latLng);
      } else {
        marker = new window.google.maps.Marker({
          position: event.latLng,
          map: map,
          icon: icon, 
        });
      }

      setGuessedCoordinates(clickedLatLng); 
    });
  }
}

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

function convertDMSToDD(dms, ref) {
  const degrees = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return (ref === 'S' || ref === 'W') ? -degrees : degrees;
}


function SecondPage() {
  const [images, setImages] = useState([]); 
  const [imageIndex, setImageIndex] = useState(0);
  const [coordinates, setCoordinates] = useState(null);
  const [guessedCoordinates, setGuessedCoordinates] = useState(null); 
  const [distance, setDistance] = useState(null); 

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation(); 
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
    event.preventDefault(); 
    event.stopPropagation(); 
    console.log("Drag over event triggered");
  };
  
  const submitGuess = () => {
    if (coordinates && guessedCoordinates) {
      const actualLatLng = new window.google.maps.LatLng(coordinates.latitude, coordinates.longitude);
      const guessedLatLng = new window.google.maps.LatLng(guessedCoordinates.latitude, guessedCoordinates.longitude);
      
    
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(actualLatLng, guessedLatLng) / 1000; // Convert meters to kilometers
      setDistance(distance);
  
      new window.google.maps.Marker({
        position: actualLatLng,
        map: window.google.maps.mapInstance,
        icon: {
          url: "https://maps.google.com/mapfiles/kml/paddle/ltblu-diamond.png", // Star icon
          scaledSize: new window.google.maps.Size(150, 150), // Scale the star icon size
        },
        title: "Actual Location",
      });
  
      const line = new window.google.maps.Polyline({
        path: [actualLatLng, guessedLatLng],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
      });
  
      line.setMap(window.google.maps.mapInstance); 
  

      document.getElementById('map').style.flex = '1 1 100%';  
      document.getElementById('pano').style.display = 'none'; 
  
      console.log(`Distance between guess and actual location: ${distance} km`);
    }
  };

 
  const nextImage = () => {
    if (imageIndex < images.length - 1) {
      setImageIndex(imageIndex + 1);
      setCoordinates(null);
      setGuessedCoordinates(null);
      setDistance(null);
      console.log("Next image loaded.");
    } else {
      console.log("No more images in the folder.");
    }
  };


  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (typeof initializeWorldMap === 'function') {
        initializeWorldMap(setGuessedCoordinates); 
      } else {
        console.error("initializeWorldMap is not defined");
      }
    });
  }, []);

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

      <div id="interface" style={{ display: 'flex', width: '100%', height: '75vh' }}>
        <button
          onClick={submitGuess}
          style={{
            height: '200px',
            position: 'absolute',
            left: '20px',
            fontSize: '100px',
            top: '1200px',
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
      </div>

      {distance !== null && (
        <div>
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
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

          <button
            onClick={nextImage}
            style={{
              height: '100px',
              position: 'absolute',
              left: '20px',
              fontSize: '50px',
              top: '1400px',
              fontFamily: 'Bungee Tint',
              borderRadius: '10px',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 255, 0.5)',
              zIndex: 999,
            }}
          >
            NEXT
          </button>
        </div>
      )}
    </div>
  );
}

export default SecondPage;
