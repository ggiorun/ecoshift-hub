# EcoShift Hub - AI Development Rules

## Tech Stack
- **Frontend Framework**: React 19 with TypeScript for type safety and modern component architecture.
- **Build Tool**: Vite for fast development and optimized production builds.
- **Styling**: Tailwind CSS for rapid UI development and consistent responsive design.
- **Icons**: Lucide React for a unified and accessible icon system.
- **Backend**: Node.js with Express.js providing a RESTful API for the "MamaDB" interface.
- **Database**: Hybrid setup using SQLite for local development and PostgreSQL for production (Vercel).
- **AI Integration**: Google Gemini AI via `@google/genai` for smart trip matching and reasoning.
- **Maps**: Leaflet (via CDN) for interactive geospatial visualization of trips and study groups.
- **PWA**: Custom Service Worker and Web App Manifest for offline capabilities and mobile installation.
- **Internationalization**: Custom `i18n.tsx` provider supporting IT, EN, ES, FR, DE, and NL.

## Library & Development Rules

### 1. Styling & Components
- **Tailwind CSS**: Use utility classes exclusively for styling. Avoid writing custom CSS in `index.css` unless absolutely necessary for third-party library overrides.
- **Component Structure**: Every new component MUST have its own file in `src/components/`. Keep components small (under 100 lines) and focused on a single responsibility.
- **Icons**: Use `lucide-react` for all interface icons to maintain visual consistency. Only use emojis for decorative PWA-style accents if specifically requested.

### 2. Data Management
- **MamaDB (db.ts)**: All data fetching and persistence must go through the `db` singleton in `src/db.ts`. Do not use `fetch` directly inside React components.
- **State Management**: Use React's `useState` and `useMemo` for local UI state. Use the `ecoshift-sync` custom event for cross-component reactivity when the database updates.

### 3. AI Usage
- **Gemini Service**: All AI-related prompts and logic must reside in `src/geminiService.ts`. 
- **Fallbacks**: Always provide a local heuristic fallback for AI features to ensure the app remains functional if the API quota is reached.

### 4. Internationalization (i18n)
- **Hardcoded Strings**: NEVER hardcode UI strings in components. Always add the string to `src/i18n.tsx` and use the `t` object from `useLanguage()`.
- **Formatting**: Use the `.replace('{key}', value)` pattern for dynamic strings within the translation files.

### 5. Backend & Database
- **Unified Queries**: Use the `query` helper in `server/database.js` to ensure compatibility between SQLite and PostgreSQL.
- **API Standards**: New endpoints should follow the existing REST pattern and handle JSON parsing for complex types (like arrays/objects) which are stored as strings in the DB.