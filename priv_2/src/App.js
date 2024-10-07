import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import SecondPage from './SecondPage';
import './App.css';

function App() {
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (typeof window.google === 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAvvN-YaRDjh-AwygMlrh55NOCsvpXXv58&callback=initMap`;
        script.async = true;
        script.defer = true;

        // Add script load event listeners
        script.onload = () => {
          console.log('Google Maps script loaded successfully.');
          // Initialize Google Maps here if needed
        };

        script.onerror = () => {
          console.error('Google Maps script failed to load.');
        };

        document.head.appendChild(script);
      } else {
        console.log('Google Maps API already loaded');
      }
    };

    // Global initMap function to avoid "initMap is not a function" error
    window.initMap = function() {
      console.log('Google Maps API initialized.');
    };

    loadGoogleMapsScript();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/second" element={<SecondPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
