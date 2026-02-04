## Map Search with AI

This project allows users to search nearby places (food, cafes, attractions, etc.) using a natural language prompt by GROQ AI.  
The backend converts the prompt into a Google Maps query, fetches results from the Google Places API, and displays them directly on an interactive map.

<img src="./screenshots/map.png" width="700"/>

### Key Features

- Users can search places using an AI prompt
- Results are displayed on Google Maps with multiple clickable markers
- Each marker shows place details (name, address, rating) in an InfoWindow
- Users can open Google Maps directions via the provided link
- Location input supports both:
  - Automatic browser geolocation (default)
  - Manual latitude/longitude override for testing
- A clean modern UI layout with map + results list side-by-side
