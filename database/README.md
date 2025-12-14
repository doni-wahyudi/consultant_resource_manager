# Database Setup Instructions

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project

## Setup Steps

### 1. Run the Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `migration.sql` and paste into the editor
5. Click **Run** to execute the migration

### 2. Configure the Application

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the **Project URL** and **anon public** key
3. Open `js/config.js` in your project
4. Replace the placeholder values:

```javascript
const Config = {
    SUPABASE_URL: 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    // ...
};
```

### 3. Enable Public Access (Development Only)

For development/demo purposes, you may want to allow public access:

1. Go to **Authentication** > **Policies**
2. For each table, add a policy that allows all operations
3. Or run this SQL to enable public access:

```sql
-- Allow public read/write access (DEVELOPMENT ONLY)
CREATE POLICY "Allow public access" ON areas FOR ALL USING (true);
CREATE POLICY "Allow public access" ON clients FOR ALL USING (true);
CREATE POLICY "Allow public access" ON talents FOR ALL USING (true);
CREATE POLICY "Allow public access" ON talent_areas FOR ALL USING (true);
CREATE POLICY "Allow public access" ON projects FOR ALL USING (true);
CREATE POLICY "Allow public access" ON allocations FOR ALL USING (true);
```

## Database Schema

### Tables

- **areas**: Business domains/industry sectors
- **clients**: Client organizations
- **talents**: Consultant profiles
- **talent_areas**: Junction table for talent-area relationships
- **projects**: Project records with status and payment tracking
- **allocations**: Resource allocation records

### Relationships

- `talents` ↔ `areas`: Many-to-many via `talent_areas`
- `projects` → `clients`: Many-to-one
- `allocations` → `talents`: Many-to-one
- `allocations` → `projects`: Many-to-one

## Troubleshooting

### Connection Issues

- Verify your Supabase URL and anon key are correct
- Check that your project is not paused (free tier projects pause after inactivity)
- Ensure RLS policies allow access if enabled

### Migration Errors

- If tables already exist, the migration will skip them (uses IF NOT EXISTS)
- To reset, drop all tables first and re-run the migration