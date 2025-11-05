// Beginner-friendly JavaScript for searching the OMDb API and showing results.
// We use async/await for the network request and keep the code simple and commented
// so students can follow along. We do not use try/catch per the project guidelines.

const API_KEY = '8e8a8ad';
const API_URL = 'https://www.omdbapi.com/';
const WATCHLIST_KEY = 'omdb_watchlist_v1';

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('movie-search');
const resultsGrid = document.getElementById('movie-results');
const watchlistGrid = document.getElementById('watchlist');

// In-memory watchlist (kept in sync with localStorage)
let watchlist = [];

// Load saved watchlist from localStorage on page load
loadWatchlist();
renderWatchlist();

// Listen for the search form submit event
searchForm.addEventListener('submit', (event) => {
	event.preventDefault();
	const query = searchInput.value.trim();

	// If the user didn't type anything, show a friendly message
	if (!query) {
		resultsGrid.innerHTML = '<div class="no-results">Please enter a movie title.</div>';
		return;
	}

	// Fetch movies matching the query and render them
	fetchMovies(query);
});

// Fetch movies from the OMDb API using the "s" (search) parameter
async function fetchMovies(query) {
	const url = `${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=movie`;

	// Check HTTP status and catch network/parsing errors.
	try {
		const response = await fetch(url);

		// If server returned a non-2xx status, log details and show a friendly error.
		if (!response.ok) {
			console.error('OMDb API HTTP error', {
				status: response.status,
				statusText: response.statusText,
				url,
			});
			resultsGrid.innerHTML = '<div class="no-results">Sorry, something went wrong while fetching results. Please try again later.</div>';
			return;
		}

		const data = await response.json();

		// OMDb returns Response: "True" when there are results
		if (data.Response === 'True' && Array.isArray(data.Search)) {
			renderMovies(data.Search);
		} else {
			// API responded successfully but no matches were found
			resultsGrid.innerHTML = `<div class="no-results">No results found for "${escapeHtml(query)}".</div>`;
		}
	} catch (err) {
		// Network error or JSON parsing error
		console.error('Error fetching or parsing OMDb response', { error: err, url });
		resultsGrid.innerHTML = '<div class="no-results">Network error. Please check your connection and try again.</div>';
	}
}

// Render an array of movie objects into the results grid
function renderMovies(movies) {
	resultsGrid.innerHTML = ''; // clear previous results

	movies.forEach((movie) => {
		const poster = movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Image';

		const card = document.createElement('div');
		card.className = 'movie-card';

		// Use template literals to build the inner HTML for readability
		card.innerHTML = `
			<img class="movie-poster" src="${poster}" alt="${escapeHtml(movie.Title)} poster">
			<div class="movie-info">
				<h3 class="movie-title" title="${escapeHtml(movie.Title)}">${escapeHtml(movie.Title)}</h3>
				<div class="movie-year">${escapeHtml(movie.Year)}</div>
			</div>
		`;

		// Details button (left side)
		const detailsBtn = document.createElement('button');
		detailsBtn.className = 'details-btn';
		detailsBtn.textContent = 'Details';
		detailsBtn.addEventListener('click', () => openDetailsModal(movie.imdbID));
		card.appendChild(detailsBtn);

		// Add 'Add to Watchlist' button and wire it to add the movie
		const infoDiv = card.querySelector('.movie-info');
		const addBtn = document.createElement('button');
		addBtn.className = 'btn add-btn';
		addBtn.textContent = isInWatchlist(movie.imdbID) ? 'Added' : 'Add to Watchlist';
		if (isInWatchlist(movie.imdbID)) addBtn.disabled = true;

		addBtn.addEventListener('click', () => {
			addToWatchlist(movie);
			addBtn.textContent = 'Added';
			addBtn.disabled = true;
		});

		infoDiv.appendChild(addBtn);

		resultsGrid.appendChild(card);
	});
}

// Fetch full movie details by imdbID and return data or null on error
async function fetchMovieDetails(imdbID) {
	const url = `${API_URL}?apikey=${API_KEY}&i=${encodeURIComponent(imdbID)}&plot=full`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error('OMDb details HTTP error', { status: response.status, statusText: response.statusText, url });
			return null;
		}
		const data = await response.json();
		if (data.Response === 'True') return data;
		console.error('OMDb details error response', { data, url });
		return null;
	} catch (err) {
		console.error('Error fetching OMDb details', { error: err, imdbID });
		return null;
	}
}

// Modal helper functions
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalPoster = document.getElementById('modal-poster');
const modalTitle = document.getElementById('modal-title');
const modalYearRating = document.getElementById('modal-year-rating');
const modalGenre = document.getElementById('modal-genre');
const modalDirector = document.getElementById('modal-director');
const modalActors = document.getElementById('modal-actors');
const modalPlot = document.getElementById('modal-plot');

function showModal() {
	modal.classList.add('show');
	modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
	modal.classList.remove('show');
	modal.setAttribute('aria-hidden', 'true');
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
	if (e.target === modal) closeModal();
});

// Open the modal and populate with fetched details
async function openDetailsModal(imdbID) {
	// Clear previous content
	modalPoster.src = '';
	modalTitle.textContent = 'Loading...';
	modalYearRating.textContent = '';
	modalGenre.textContent = '';
	modalDirector.textContent = '';
	modalActors.textContent = '';
	modalPlot.textContent = '';

	showModal();

	const data = await fetchMovieDetails(imdbID);
	if (!data) {
		modalTitle.textContent = 'Details not available';
		modalPlot.textContent = 'Could not load details. Please try again later.';
		return;
	}

	const poster = data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Image';
	modalPoster.src = poster;
	modalPoster.alt = `${escapeHtml(data.Title)} poster`;
	modalTitle.textContent = data.Title || '';
	modalYearRating.textContent = `${data.Year || ''} • Rating: ${data.imdbRating || 'N/A'}`;
	modalGenre.textContent = `Genre: ${data.Genre || 'N/A'}`;
	modalDirector.textContent = `Director: ${data.Director || 'N/A'}`;
	modalActors.textContent = `Cast: ${data.Actors || 'N/A'}`;
	modalPlot.textContent = data.Plot || '';
}

// Add a movie to the watchlist (no duplicates)
function addToWatchlist(movie) {
	if (isInWatchlist(movie.imdbID)) {
		return; // already present, do nothing
	}

	// Store a small object to keep the watchlist data compact
	const toSave = {
		Title: movie.Title,
		Year: movie.Year,
		Poster: movie.Poster,
		imdbID: movie.imdbID,
	};

	watchlist.push(toSave);
	saveWatchlist();
	renderWatchlist();
}

// Remove a movie from the watchlist by imdbID
function removeFromWatchlist(imdbID) {
	watchlist = watchlist.filter((m) => m.imdbID !== imdbID);
	saveWatchlist();
	renderWatchlist();
}

// Check if a movie is already in the watchlist
function isInWatchlist(imdbID) {
	return watchlist.some((m) => m.imdbID === imdbID);
}

// Persist the watchlist to localStorage
function saveWatchlist() {
	localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

// Load the watchlist from localStorage
function loadWatchlist() {
	const raw = localStorage.getItem(WATCHLIST_KEY);
	watchlist = raw ? JSON.parse(raw) : [];
}

// Render the watchlist section
function renderWatchlist() {
	watchlistGrid.innerHTML = '';

	if (!watchlist || watchlist.length === 0) {
		watchlistGrid.innerHTML = 'Your watchlist is empty. Search for movies to add!';
		return;
	}

	watchlist.forEach((movie) => {
		const poster = movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Image';

		const card = document.createElement('div');
		card.className = 'movie-card';

		card.innerHTML = `
			<img class="movie-poster" src="${poster}" alt="${escapeHtml(movie.Title)} poster">
			<div class="movie-info">
				<h3 class="movie-title" title="${escapeHtml(movie.Title)}">${escapeHtml(movie.Title)}</h3>
				<div class="movie-year">${escapeHtml(movie.Year)}</div>
			</div>
		`;

		// Details button (left side) for watchlist items
		const detailsBtn = document.createElement('button');
		detailsBtn.className = 'details-btn';
		detailsBtn.textContent = 'Details';
		detailsBtn.addEventListener('click', () => openDetailsModal(movie.imdbID));
		card.appendChild(detailsBtn);

		// Remove button
		const infoDiv = card.querySelector('.movie-info');
		const removeBtn = document.createElement('button');
		removeBtn.className = 'btn btn-remove';
		removeBtn.textContent = 'Remove';
		removeBtn.addEventListener('click', () => removeFromWatchlist(movie.imdbID));
		infoDiv.appendChild(removeBtn);

		watchlistGrid.appendChild(card);
	});
}

// Small helper to avoid inserting raw user input into the DOM
function escapeHtml(text) {
	if (!text && text !== 0) return '';
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

