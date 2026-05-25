# 🧸 B-Season — The Stuffed Animal Reality Show Organizer

A fun, interactive, and premium single-page web application used to organize, record, summarize, and visualize bracketed imaginary competitions between powerful stuffed animals. The top-level organization represents a reality show "season" (like *Survivor*, *RuPaul's Drag Race*, or *Total Drama Island*!).

---

## 🚀 Features

- **⚡ Elemental Powers Tag Library:** Complete tag library featuring Pyrokinesis (🔥), Cosmic Drift (🌌), Forest Whisper (🌿), Shadow Walk (🔮), Aero Glide (💨), and Frost Spike (❄️). Powers are fully manageable and taggable to contestants.
- **🧸 Stuffed Animal Pool (Contestants):** Cute character cards displaying profile images (featuring AI-generated elemental stuffed animals!), names, custom bios, and tags.
- **📜 Character Version History Timeline:** Tracks all modifications made to a contestant's profile over time, showing a side-by-side changelog timeline presenting versioned changes.
- **📊 Live Competitive Record Reports:** Contestant profiles dynamically calculate and proxy-report their active competitive statistics (Seasons played, challenge wins, safe clearances, close shaves in danger, and eliminations).
- **🏆 Custom Reality Season Setup Wizard:** Draft and group contestants into custom teams (e.g. *Team Inferno*, *Team Aurora*), assign unique team colors, and configure the number of rounds.
- **⚔️ Interactive Round Bracket & Story Timelines:** Log round-by-round challenge instances. Select challenges from a reusable library, assign team standings (Winning Team, Safe Team, and Up-For-Elimination Team), log highlights/narratives, and track dramatic elimination events!
- **🎨 Premium Responsive Dark Glassmorphism Design:** Modern Outfit font typography, harmonious HSL dark color palette, glassmorphic translucent panels (`backdrop-filter`), hover highlights, and fluid CSS animations.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express, and an atomic, file-based JSON database (`data/db.json`) for zero-dependency portability and seamless backups.
- **Frontend:** Semantic HTML5, Vanilla JavaScript SPA architecture (modular routing and client-side rendering), and Vanilla CSS featuring glassmorphism and keyframe animations.
- **Testing:** Isolated container-friendly automated unit & integration testing using Jest and Supertest.
- **Containerization:** Multi-stage `Dockerfile` with integrated build-time testing and standard `docker-compose.yml` service configurations.

---

## 🚀 Quick Start (Local macOS)

### Prerequisites
- Docker & Docker Compose

### 1. Run Automated Test Verification
Run the complete test suite isolated inside a containerized testing stage:

```bash
./scripts/test-local.sh test
```

### 2. Start Development Container
Launch the containerized B-Season app with live-reloading:

```bash
./scripts/test-local.sh dev
```

### 3. Open the App
Open your browser and navigate to:
👉 **[http://localhost:3030](http://localhost:3030)**

---

## 🐳 Docker Deployment

The application is containerized and conforms to the `homelab` standard network topology (`apps_net` and `profiles: ["apps"]`).

### Build and Start Locally with Docker
Ensure the docker bridge network `apps_net` exists:
```bash
docker network create apps_net || true
```

Run compose:
```bash
docker-compose up --build
```

The application will be served at `http://localhost:8080`.

### Homelab/VPS Production Deployment
In your `homelab/docker-compose.yml` configuration, define the service as:

```yaml
  bseason:
    container_name: bseason
    build:
      context: https://github.com/mabino/bseason.git#main
    image: bseason:latest
    restart: unless-stopped
    profiles: ["apps"]
    networks:
      - apps_net
```

And map the routing subpath in your Nginx reverse-proxy configuration (`web/nginx.conf`):

```nginx
# inside binolabs.com server block
location = /bseason {
    return 301 $scheme://$host/bseason/;
}

location /bseason/ {
    set $upstream_bseason bseason;
    rewrite ^/bseason/(.*) /$1 break;
    proxy_pass http://$upstream_bseason:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Path Rewriting for relative subpath hosting
    sub_filter 'src="/' 'src="/bseason/';
    sub_filter 'href="/' 'href="/bseason/';
    sub_filter '/api/' '/bseason/api/';
    sub_filter_once off;
    sub_filter_types application/javascript application/x-javascript;
}
```

Reload Nginx:
```bash
docker compose exec -T web nginx -s reload
```

---

## 📂 Project Structure

```
bseason/
├── data/                 # JSON file-based database (git-ignored)
├── public/               # Frontend client assets
│   ├── images/
│   │   └── contestants/  # Pre-generated element stuffed animal avatars
│   ├── app.js            # Frontend client controller
│   ├── index.html        # Single-page application shell
│   └── style.css         # Responsive glassmorphism CSS
├── src/                  # Backend application modules
│   ├── db.js             # Atomic database engine with pre-seeded data
│   └── models.js         # Business logic: versioning & stats
├── tests/                # Automated Jest test suites
│   ├── api.test.js       # Express REST API endpoint tests
│   └── models.test.js    # Data model and versioning tests
├── scripts/
│   └── test-local.sh     # macOS verification script
├── Dockerfile            # Multi-stage production build config
├── docker-compose.yml    # Homelab apps_net service setup
├── package.json          # Node scripts and dependency list
└── README.md             # This guide
```

---

## 🧪 Running Tests

Execute the automated test suite locally:

```bash
npm test
```

*All 9 test cases covering profile version history, competitive record calculation, and Express REST endpoints run in full isolation.*
