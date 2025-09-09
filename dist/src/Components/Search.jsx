import React, { useState } from 'react';
import axios from 'axios';
import './Search.css';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchType, setSearchType] = useState('vector');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/search/${searchType}`, {
        params: { q: query, limit: 12 }
      });
      setResults(response.data.results);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artifacts by name, description, materials, or artisan..."
            className="search-input"
          />
          <select 
            value={searchType} 
            onChange={(e) => setSearchType(e.target.value)}
            className="search-type-select"
          >
            <option value="vector">AI Search</option>
            <option value="hybrid">Hybrid Search</option>
          </select>
          <button type="submit" disabled={isLoading} className="search-button">
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="search-results">
        {results.length > 0 ? (
          <div className="artifact-grid">
            {results.map(artifact => (
              <div key={artifact._id} className="artifact-card">
                {artifact.imageUrl && (
                  <img src={artifact.imageUrl} alt={artifact.name} className="artifact-image" />
                )}
                <div className="artifact-info">
                  <h3>{artifact.name}</h3>
                  <p className="artifact-artisan">By {artifact.artisan}</p>
                  <p className="artifact-materials">{artifact.materials.join(', ')}</p>
                  <p className="artifact-description">{artifact.description.substring(0, 100)}...</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoading && <p className="no-results">No artifacts found. Try a different search term.</p>
        )}
      </div>
    </div>
  );
};

export default Search;