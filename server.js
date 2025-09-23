const fs = require('fs');
const path = require('path');
const express = require('express');

// Lightweight .env loader so users can configure Supabase locally without extra dependencies
loadEnvironmentVariables();

const app = express();
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

// Share Supabase credentials with the frontend in a safe, non-cached script
app.get('/config.js', (_req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.PROJECT_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[config] Missing Supabase configuration. Set PROJECT_URL/SUPABASE_URL and ANON_KEY/SUPABASE_ANON_KEY.');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.type('application/javascript').send(`
        window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
        window.SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
    `);
});

app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'login.html'));
});

app.get('/student', (_req, res) => {
    res.sendFile(path.join(publicDir, 'student.html'));
});

app.get('/console', (_req, res) => {
    res.sendFile(path.join(publicDir, 'teacher.html'));
});

// Fallback to the login page for unmatched routes (acts similar to previous behaviour)
app.use((_req, res) => {
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Live Drawing app available at http://localhost:${PORT}`);
});

function loadEnvironmentVariables() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        return;
    }

    const contents = fs.readFileSync(envPath, 'utf-8');
    contents.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (!process.env[key]) {
            process.env[key] = value;
        }

        // Support legacy/new naming without forcing developers to duplicate keys.
        if (key === 'PROJECT_URL' && !process.env.SUPABASE_URL) {
            process.env.SUPABASE_URL = value;
        }
        if (key === 'SUPABASE_URL' && !process.env.PROJECT_URL) {
            process.env.PROJECT_URL = value;
        }
        if (key === 'ANON_KEY' && !process.env.SUPABASE_ANON_KEY) {
            process.env.SUPABASE_ANON_KEY = value;
        }
        if (key === 'SUPABASE_ANON_KEY' && !process.env.ANON_KEY) {
            process.env.ANON_KEY = value;
        }
    });
}
