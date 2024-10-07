import React, { useState, useEffect } from 'react';
import './App.css'; // Ensure CSS is properly imported for your styling
import EXIF from 'exif-js';

function processFolder(folder, setImages, setCoordinates) {
  const reader = folder.createReader();
  const imageFiles = [];

  // Read images and process EXIF data
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
                console.log("latitude: " + latitude + " longitude: " + longitude);
              } else {
                console.log("Coordinates not found in image.");
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

  useEffect(() => {
    console.log("GOT ELEMENT"); 
    if (coordinates && window.google) {
      if (!document.getElementById("street-view").getAttribute('initialized')) {
        const panorama = new window.google.maps.StreetViewPanorama(
          document.getElementById("street-view"), {
            position: { lat: coordinates.latitude, lng: coordinates.longitude },
            pov: { heading: 34, pitch: 10 },
            zoom: 1
          }
        );
        document.getElementById("street-view").setAttribute('initialized', 'true');
      }
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
          width: '300px',
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

      {/* Street View Container */}
      <div id="street-view" style={{
        width: '100%',
        height: '100vh',
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: '-1',
      }}></div>
    </div>
  );
}

export default SecondPage;
