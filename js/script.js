// ----- NASA APOD API config -----
const API_KEY = 'XfqV6LalhulhM6nyty9XmiWUuecqjaPcf4V7gEMJ';
const APOD_URL = 'https://api.nasa.gov/planetary/apod';

// How long the mouse must stay over an image before the modal opens
const HOVER_DELAY_MS = 500;

// Find our date picker inputs and button on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Wire up the button to fetch and display images for the selected range
getImagesButton.addEventListener('click', () => {
  fetchApodRange(startInput.value, endInput.value);
});

// Fetches APOD entries for a given start/end date and renders them
async function fetchApodRange(startDate, endDate) {
  if (!startDate || !endDate) {
    showMessage('Please select both a start and end date.');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    showMessage('Start date must be before the end date.');
    return;
  }

  showMessage('Loading space images...');

  // thumbs=true asks NASA to include a thumbnail_url for video entries
  const url = `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.msg || `Request failed with status ${response.status}`);
    }

    const data = await response.json();

    // The API returns a single object (not an array) when start_date === end_date
    const entries = Array.isArray(data) ? data : [data];

    // Show most recent first
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderGallery(entries);
  } catch (error) {
    showMessage(`Something went wrong: ${error.message}`);
  }
}

// Extracts a YouTube video ID from any common URL format
// (watch?v=, youtu.be/, or /embed/), returns null if it's not a YouTube URL
function getYoutubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

// Picks the best available thumbnail for a gallery tile: NASA's own
// thumbnail_url first, falling back to YouTube's thumbnail service if
// the entry is a video NASA didn't generate one for.
function getThumbnail(entry) {
  if (entry.media_type === 'image') return entry.url;
  if (entry.thumbnail_url) return entry.thumbnail_url;

  const youtubeId = getYoutubeId(entry.url);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
}

// Renders an array of APOD entries into the gallery as image-only tiles
function renderGallery(entries) {
  gallery.innerHTML = '';

  if (entries.length === 0) {
    showMessage('No images found for that date range.');
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = entry.media_type === 'video' ? 'gallery-item video-item' : 'gallery-item';

    const thumbnail = getThumbnail(entry);

    if (thumbnail) {
      card.innerHTML = `<img src="${thumbnail}" alt="${entry.title}" loading="lazy" />`;
      if (entry.media_type === 'video') {
        card.innerHTML += `<div class="play-icon" aria-hidden="true">▶</div>`;
        card.innerHTML += `<div class="video-label">YouTube Video: Hover to Learn More!</div>`;
      }
    } else {
      card.innerHTML = `<div class="no-thumbnail">No preview available</div>`;
    }

    // Only open the modal after the mouse has stayed on this card for
    // HOVER_DELAY_MS. mouseleave clears the timer if the user moves away
    // before it fires, so a quick pass over the gallery won't pop anything open.
    let hoverTimer = null;

    card.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(() => openModal(entry), HOVER_DELAY_MS);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
    });

    gallery.appendChild(card);
  });
}

// Shows a simple status/error message in place of the gallery
function showMessage(message) {
  gallery.innerHTML = `<div class="placeholder"><p>${message}</p></div>`;
}

// ----- Modal -----

// APOD's video url is usually already a /embed/ link, but occasionally
// it's a regular watch?v= link, which won't work inside an <iframe>.
// This normalizes either form into an embeddable URL.
function toEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
    }
    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    return url;
  } catch {
    return url;
  }
}

const modalOverlay = document.getElementById('apodModalOverlay');
const modalClose = document.getElementById('apodModalClose');
const modalImage = document.getElementById('apodModalImage');
const modalVideoWrapper = document.getElementById('apodModalVideoWrapper');
const modalVideo = document.getElementById('apodModalVideo');
const modalVideoLink = document.getElementById('apodModalVideoLink');
const modalTitle = document.getElementById('apodModalTitle');
const modalDate = document.getElementById('apodModalDate');
const modalExplanation = document.getElementById('apodModalExplanation');

function openModal(entry) {
  const isVideo = entry.media_type === 'video';

  // Toggle between the image and the embedded video depending on media type
  modalImage.style.display = isVideo ? 'none' : 'block';
  modalVideoWrapper.style.display = isVideo ? 'block' : 'none';
  modalVideoLink.style.display = isVideo ? 'block' : 'none';

  if (isVideo) {
    // entry.url for APOD videos is already an embeddable YouTube URL
    modalVideo.src = toEmbedUrl(entry.url);
    modalVideoLink.href = entry.url;
  } else {
    modalImage.src = entry.hdurl || entry.url;
    modalImage.alt = entry.title;
    // Clear the iframe src so a paused/playing video doesn't keep running in the background
    modalVideo.src = '';
  }

  modalTitle.textContent = entry.title;
  modalDate.textContent = entry.date;
  modalExplanation.textContent = entry.explanation;

  modalOverlay.classList.add('is-open');
}

function closeModal() {
  modalOverlay.classList.remove('is-open');
  // Stop any playing video when the modal closes
  modalVideo.src = '';
}

// Close on the × button
modalClose.addEventListener('click', closeModal);

// Close when clicking the dark overlay (but not the modal content itself)
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) closeModal();
});

// Close on Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});