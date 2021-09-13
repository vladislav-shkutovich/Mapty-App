'use strict';

// * Creating classes

// Parent class containing the initial workout data
class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords; // [lat, lng]
		this.distance = distance; // in km
		this.duration = duration; // in min
	}

	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
			months[this.date.getMonth()]
		} ${this.date.getDate()}`;
	}
}

// Workout child class containing data for running
class Running extends Workout {
	type = 'running';

	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		// min/km
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

// Workout child class containing data for cycling
class Cycling extends Workout {
	type = 'cycling';

	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		// km/h
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

/////////////////////////////////////////////////////////////////////////

// * Creating Application Architecture

// Selecting elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// * Creating architecture class of the application
class App {
	// private class fields
	#map;
	#mapZoomLevel = 13;
	#mapEvent;
	#workouts = [];

	// class constructor
	constructor() {
		// loading map at current geolocation
		this.#getPosition();

		// Get data from local storage
		this.#getLocalStorage();

		// adding new workout after form submiting
		form.addEventListener('submit', this.#newWorkout.bind(this));

		// method to choose between running / cycling in form
		inputType.addEventListener('change', this.#toggleElevationField);

		// move to marker on click
		containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
	}

	// class private methods
	#getPosition() {
		// navigator got our geolocation ? #loadMap() : alert message
		if (navigator.geolocation)
			navigator.geolocation.getCurrentPosition(
				this.#loadMap.bind(this),
				function () {
					alert('Could not get your position');
				}
			);
	}

	#loadMap(position) {
		// using destructuring to get coordinates from geolocation API
		const { latitude } = position.coords;
		const { longitude } = position.coords;

		// put it into new array
		const coords = [latitude, longitude];

		// working with Leaflet.js library (lookup at documentation)
		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		// showing input form when map is clicked by user
		this.#map.on('click', this.#showForm.bind(this));

		this.#workouts.forEach(work => {
			this.#renderWorkoutMarker(work);
		});
	}

	#showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	#hideForm() {
		// Empty inputs
		inputDistance.value =
			inputDuration.value =
			inputCadence.value =
			inputElevation.value =
				'';

		// Dirty trick to "replace" form and new workout data
		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => (form.style.display = 'grid'), 1000);
	}

	#toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	#newWorkout(e) {
		// Small helper functions
		const validInputs = (...inputs) =>
			inputs.every(inp => Number.isFinite(inp));
		const allPositive = (...inputs) => inputs.every(inp => inp > 0);

		// Prevent default browser behavior
		e.preventDefault();

		// Get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// If workout running, then create running object
		if (type === 'running') {
			const cadence = +inputCadence.value;

			// Check if data is valid
			if (
				!validInputs(distance, duration, cadence) ||
				!allPositive(distance, duration, cadence)
			)
				return alert('Inputs have to be positive numbers!');

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout cycling, then create cycling object
		if (type === 'cycling') {
			const elevation = +inputElevation.value;

			// Check if data is valid
			if (
				!validInputs(distance, duration, elevation) ||
				!allPositive(distance, duration)
			)
				return alert('Inputs have to be positive numbers!');

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add a new object to workout array
		this.#workouts.push(workout);

		// Render workout on map as marker
		this.#renderWorkoutMarker(workout);

		// Render workout on list
		this.#renderWorkout(workout);

		// Hide form + clear input fields
		this.#hideForm();

		// Set local storage to all workouts
		this.#setLocalStorage();
	}

	// * Leaflet.js usage
	#renderWorkoutMarker(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(
				`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
			)
			.openPopup();
	}

	// render workouts list on the left of page
	#renderWorkout(workout) {
		let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
						workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
					}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

		if (workout.type === 'running')
			html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

		if (workout.type === 'cycling')
			html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

		form.insertAdjacentHTML('afterend', html);
	}

	// move on marker when clicking on workout at workouts list
	#moveToPopup(e) {
		const workoutEl = e.target.closest('.workout');

		if (!workoutEl) return;

		const workout = this.#workouts.find(
			work => work.id === workoutEl.dataset.id
		);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	// Local Storage
	#setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	#getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));

		if (!data) return;

		this.#workouts = data;

		this.#workouts.forEach(work => {
			this.#renderWorkout(work);
		});
	}

	// public method to reset local storage data
	reset() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}

const app = new App();

/////////////////////////////////////////////////////////////////////////
