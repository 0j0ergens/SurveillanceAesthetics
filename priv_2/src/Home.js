import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className = "App-header">
      <h1 className="title">Memguesser
      </h1>
      <Link to="/second">
        <button className='App-link'>BEGIN</button>
      </Link>
    </div>
  );
}

export default Home;
