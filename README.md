# Consultant Resource Manager

A web-based resource management application for managing talents, projects, and allocations. Built with vanilla JavaScript and Supabase backend.

## Features

### 📊 Dashboard
- Overview of total talents and active projects
- Upcoming deadlines (next 30 days)
- Unpaid projects summary with client, talents, and location info

### 👥 Talent Management
- Add, edit, and delete talents
- Assign skills and areas of expertise
- View talent details and assignment history
- Track availability based on allocations and project assignments

### 📁 Project Management
- Create projects with client association
- Set project type (Online/Offline) and location
- Define required skills for filtering
- Assign talents directly to projects
- Track project status: Upcoming → In Progress → Completed
- Color-coded projects for easy identification

### 📅 Calendar & Resource Planning
- Monthly calendar view with project visualization
- Drag-and-drop talent allocation
- Continuous project bars showing full duration (start to end)
- Click on dates to see talent availability for that day
- Click on projects to view detailed information
- Legend separating In Progress and Upcoming projects

### ✅ Completed Projects
- View all completed projects
- Edit project details or reactivate to active status
- Payment tracking:
  - Project payment status (Paid/Unpaid)
  - Reimbursement amount and status
  - Reimbursement notes

### 👤 Client Management
- Manage client information
- View projects associated with each client

### ⚙️ Settings
- Manage areas/categories for talent classification

## Application Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Talents   │────▶│   Projects  │────▶│  Calendar   │
│  (Add team) │     │(Create work)│     │ (Schedule)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Completed  │
                    │  (Payment)  │
                    └─────────────┘
```

### Typical Workflow

1. **Setup Phase**
   - Add Areas in Settings (e.g., "Design", "Development", "Marketing")
   - Add Clients with contact information
   - Add Talents with skills and area assignments

2. **Project Creation**
   - Create a new project with details (name, client, dates, type, location)
   - Define required skills
   - Assign talents to the project

3. **Resource Planning (Calendar)**
   - View projects on the calendar as colored bars
   - Drag talents from sidebar to dates for specific allocations
   - Click dates to check talent availability
   - Click projects to view details

4. **Project Completion**
   - Change project status to "Completed"
   - Track payment status
   - Record reimbursement details

## Two Assignment Systems

The app supports two ways to assign talents:

| Method | Where | Purpose |
|--------|-------|---------|
| **Project Assignment** | Projects page | Assigns talent for entire project duration |
| **Calendar Allocation** | Calendar page | Creates specific date-range assignments |

Both are tracked for availability checking.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS3
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Optional (Supabase Auth)
- **State Management**: Custom pub/sub pattern

## Project Structure

```
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Base styles and variables
│   ├── components.css     # UI component styles
│   ├── calendar.css       # Calendar-specific styles
│   └── pages.css          # Page-specific styles
├── js/
│   ├── app.js             # Application entry point
│   ├── config.js          # Supabase configuration
│   ├── state.js           # State management
│   ├── router.js          # Client-side routing
│   ├── components/        # Reusable UI components
│   │   ├── modal.js
│   │   ├── toast.js
│   │   ├── forms.js
│   │   ├── sidebar.js
│   │   ├── calendar.js
│   │   ├── legend.js
│   │   └── loading.js
│   ├── pages/             # Page controllers
│   │   ├── dashboard.js
│   │   ├── calendar.js
│   │   ├── talents.js
│   │   ├── talent-detail.js
│   │   ├── projects.js
│   │   ├── completed.js
│   │   ├── clients.js
│   │   ├── settings.js
│   │   └── auth.js
│   └── services/          # Data services
│       ├── supabase.js
│       ├── talents.js
│       ├── projects.js
│       ├── allocations.js
│       ├── clients.js
│       ├── areas.js
│       ├── dashboard.js
│       ├── dataLoader.js
│       ├── errorHandler.js
│       └── auth.js
├── database/
│   ├── migration.sql      # Database schema
│   └── README.md          # Database setup guide
└── assets/
    └── icons/             # Application icons
```

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration script from `database/migration.sql`
3. For existing databases, run the migration queries to add new columns:

```sql
-- Add location and project_type columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(20) DEFAULT 'offline';

-- Add reimbursement columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT;
```

### 2. Configuration

Update `js/config.js` with your Supabase credentials:

```javascript
const CONFIG = {
    SUPABASE_URL: 'your-project-url',
    SUPABASE_ANON_KEY: 'your-anon-key'
};
```

### 3. Running the Application

The app is a static site. You can:

- Open `index.html` directly in a browser
- Use a local server: `npx serve` or `python -m http.server`
- Deploy to any static hosting (Netlify, Vercel, GitHub Pages)

### 4. Authentication (Optional)

Authentication is disabled by default (demo mode). To enable:

1. Set up Supabase Auth in your project
2. In `js/app.js`, change:
```javascript
Router.setAuthRequired(true);
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `areas` | Categories for talent classification |
| `clients` | Client information |
| `talents` | Talent profiles with skills |
| `talent_areas` | Junction table for talent-area relationships |
| `projects` | Project details with status and payment tracking |
| `project_talents` | Junction table for project-talent assignments |
| `allocations` | Specific date-range assignments from calendar |

### Project Statuses

- `upcoming` - Project scheduled for future
- `in_progress` - Currently active project
- `completed` - Finished project (moves to Completed view)

## Key Features Explained

### Calendar Visualization
- Projects appear as continuous colored bars from start to end date
- 📅 icon marks start date, 🏁 icon marks end date
- Middle days show abbreviated project name
- Click any project bar to view full details

### Talent Availability
- Sidebar shows talent availability for selected date
- Availability considers both:
  - Calendar allocations (specific date ranges)
  - Project assignments (entire project duration)
- Unavailable talents show which project they're assigned to

### Payment Tracking
- Project payment: Main payment status
- Reimbursement: Sub-payment for expenses (transportation, meals, etc.)
- Both tracked separately with Paid/Unpaid status

## Currency

The application uses Indonesian Rupiah (IDR) for all currency displays.

## Browser Support

Modern browsers with ES6+ support:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License
