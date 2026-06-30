
# APS Explorer Website

APS Explorer is a web application for exploring and selecting datasets based on informed criteria, designed to support recommender system experiments. It provides interactive visualizations and tools to compare algorithms and datasets using the Algorithm Performance Space (APS) framework.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Setup & Deployment](#setup--deployment)
- [Configuration](#configuration)
- [Adapting or Extending](#adapting-or-extending)
- [Scripts](#scripts)

## Features

- PCA-based visualization of algorithm performance
- Pairwise algorithm comparison
- Dataset comparison and selection
- Interactive charts and tables

## Project Structure

- `datasets.recommender-systems.com/` — Main web application (frontend and backend)
	- `index.html` — Main entry point (frontend)
	- `index.php` — Main entry point (backend, API)
	- `main.js`, `apiService.js`, `chartHelper.js`, `dynamicContent.js`, etc. — JavaScript modules
	- `apis/` — PHP API endpoints (e.g., `algorithm.php`, `dataset.php`, `performance-result.php`)
	- `assets/` — CSS, images, fonts
	- `tabs/` — Subpages for APS, algorithm, and dataset comparison
- `configs/` — Database and secret configuration (not for public sharing)
- `_scripts/` — Automation scripts (e.g., for dataset management)
- `_apidoc/` — API documentation

## Technologies Used

- **Frontend:** HTML, JavaScript (ES6 modules), CSS, [Bootstrap 5](https://getbootstrap.com/), [FontAwesome](https://fontawesome.com/), [Chart.js](https://www.chartjs.org/)
- **Backend:** PHP (API endpoints)
- **Database:** MySQL (configured in `configs/db_config.php`)

## Setup & Deployment

1. **Clone the repository:**
	 ```sh
	 git clone <this-repo-url>
	 ```
2. **Configure the database:**
	 - Edit `configs/db_config.php` with your MySQL credentials.
	 - Edit `configs/secrets.php` for admin/API secrets.
3. **Deploy the web app:**
	 - Place the `datasets.recommender-systems.com/` directory on your PHP-enabled web server.
	 - Ensure the server can access the configured MySQL database.
4. **Access the app:**
	 - Open `index.html` in your browser, or navigate to the deployed URL.

## Configuration

- **Database:**
	- `configs/db_config.php` — Set `host`, `username`, `password`, and `database`.
- **Secrets:**
	- `configs/secrets.php` — Set secret keys for admin/API access.
- **API Endpoints:**
	- Located in `datasets.recommender-systems.com/apis/`.

## Protected Admin Interface

The analytics dashboard and usage-log management are available under `/admin/`. The complete
directory is protected with Apache HTTP Basic Authentication. Setup instructions, including the
required absolute `AuthUserFile` path and creation of the non-versioned password file, are in
`datasets.recommender-systems.com/admin/README.md`.

Use the admin area over HTTPS only. Public API access can save usage events, but reading statistics
or deleting logs is only available through the protected admin API.

## Adapting or Extending

- **Frontend:**
	- Modify or add JS modules in `datasets.recommender-systems.com/`.
	- Update HTML/CSS in `assets/` and `index.html`.
- **Backend:**
	- Add or edit PHP API endpoints in `datasets.recommender-systems.com/apis/`.
- **Database:**
	- Update schema as needed; ensure config files are updated accordingly.

## Scripts

- Automation scripts for dataset management are in `_scripts/datasets-rec-sys-auto-add/`.
