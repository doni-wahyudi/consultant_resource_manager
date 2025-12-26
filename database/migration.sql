-- Consultant Resource Manager Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Talents table
CREATE TABLE IF NOT EXISTS talents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    homebase_location VARCHAR(200),
    skills TEXT[] DEFAULT '{}',
    photo_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases: Add homebase_location column
-- ALTER TABLE talents ADD COLUMN IF NOT EXISTS homebase_location VARCHAR(200);

-- Talent-Area junction table
CREATE TABLE IF NOT EXISTS talent_areas (
    talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    PRIMARY KEY (talent_id, area_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    color VARCHAR(7) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
    is_paid BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    required_skills TEXT[] DEFAULT '{}',
    location VARCHAR(200),
    project_type VARCHAR(20) DEFAULT 'offline' CHECK (project_type IN ('online', 'offline')),
    -- Reimbursement fields
    reimbursement_amount DECIMAL(15, 2) DEFAULT 0,
    reimbursement_paid BOOLEAN DEFAULT FALSE,
    reimbursement_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases: Add location and project_type columns
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(200);
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(20) DEFAULT 'offline' CHECK (project_type IN ('online', 'offline'));
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_amount DECIMAL(15, 2) DEFAULT 0;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_paid BOOLEAN DEFAULT FALSE;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT;

-- Project-Talent assignment junction table (for direct talent assignment to projects)
CREATE TABLE IF NOT EXISTS project_talents (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (project_id, talent_id)
);

-- Allocations table
CREATE TABLE IF NOT EXISTS allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id UUID REFERENCES talents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_allocations_talent ON allocations(talent_id);
CREATE INDEX IF NOT EXISTS idx_allocations_project ON allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_talents_email ON talents(email);

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE talents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE talent_areas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
-- In production, you should create proper RLS policies based on authentication


-- Activity Log table for tracking changes
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(200),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);


-- Enable public access to activity_logs table (run this if logs aren't being saved)
-- Option 1: Disable RLS entirely (simpler, for demo/personal use)
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Option 2: Or create a policy to allow all operations (more secure for production)
-- ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Project Batches table for storing multiple date ranges per project
CREATE TABLE IF NOT EXISTS project_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_batch_date_range CHECK (end_date >= start_date)
);

-- Index for faster batch lookup by project
CREATE INDEX IF NOT EXISTS idx_project_batches_project ON project_batches(project_id);

-- Enable public access to project_batches table
ALTER TABLE project_batches DISABLE ROW LEVEL SECURITY;
