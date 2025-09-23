# Live Drawing App v2

A polished realtime classroom sketching experience that lets teachers monitor every student canvas with zero friction. The app now uses [Supabase Realtime](https://supabase.com/realtime) for dependable WebSocket communication while keeping a lightweight Node/Express server for hosting the static UI.

![Teacher dashboard preview](https://github.com/user-attachments/assets/04fcf624-a78e-4078-8dde-c3d2f035c39c)

## ✨ Highlights

- Beautifully refreshed UI for login, teacher, and student experiences.
- Live collaboration powered by Supabase Realtime channels—no custom WebSocket server required.
- Teacher dashboard shows QR codes, sharable join links, presence, last activity, and synced canvases for every student.
- Student workspace supports drawing, erasing, undo/redo, and automatic sync back to the teacher.

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase credentials

Create a free Supabase project (or reuse an existing one) and copy the **Project URL** and **anon public key** from the project settings.

You can expose them to the app in two ways:

- **Environment variables (recommended for deployment)**
  ```bash
  export PROJECT_URL="https://your-project.supabase.co"
  export ANON_KEY="your-anon-key"
  ```

- **.env file (handy for local development)** – create a `.env` file at the project root:
  ```dotenv
  PROJECT_URL=https://your-project.supabase.co
  ANON_KEY=your-anon-key
  ```

The server also recognises the legacy Supabase names (`SUPABASE_URL` / `SUPABASE_ANON_KEY`) so you can use whichever convention matches your hosting provider. The values are exposed to the browser via `/config.js` so the frontend can open realtime channels.

### 3. Run the development server

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to access the login screen.

### 4. Use the app

- **Teacher console**: `http://localhost:3000/console`
  - Generates a new session code + QR code automatically.
  - Displays a card for each connected student with a live, scaled-down canvas preview.
- **Student workspace**: `http://localhost:3000/student`
  - Enter via the login form with name + session code (or scan the QR).
  - Draw with touch or mouse, switch colors, erase, undo/redo, and the teacher receives updates instantly.

## 🧱 Project Structure

```
live-drawing-app-v2/
├── public/
│   ├── js/
│   │   ├── student.js        # Supabase client for students
│   │   └── teacher.js        # Supabase client for teachers
│   ├── login.html            # Entry point for students
│   ├── student.html          # Student UI
│   ├── teacher.html          # Teacher UI
│   └── styles.css            # Shared styling
├── server.js                 # Express static server + config endpoint
└── package.json
```

## 📦 Deployment Notes

- Set `PROJECT_URL` and `ANON_KEY` (or `SUPABASE_URL` / `SUPABASE_ANON_KEY`) in your hosting environment.
- Start command: `npm start`.
- No additional WebSocket infrastructure is required—Supabase handles realtime delivery.

## 🛣️ Ideas for Next Iterations

- Add authentication/roles for persistent classrooms.
- Allow teachers to broadcast annotations or feedback to a student.
- Provide export options (PNG/PDF) for completed drawings.
- Track participation metrics over time.

## 📝 License

MIT — contributions welcome!
