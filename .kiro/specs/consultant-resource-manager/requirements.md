# Requirements Document

## Introduction

The Consultant Resource Management System is a web-based application designed to help consulting firms manage their talent pool, plan resource allocation for projects, and track project status and payments. The system provides a visual calendar-based interface for drag-and-drop resource planning, talent management with skills tracking, and comprehensive project lifecycle management.

## Glossary

- **Talent**: A consultant or professional available for assignment to projects
- **Talent Pool**: The collection of all available talents in the system
- **Project**: A consulting engagement with a client that requires talent assignment
- **Resource Allocation**: The assignment of talents to specific projects for defined time periods
- **Area**: A business domain or industry sector (e.g., Banking, BUMN, Rural Bank)
- **Calendar View**: A visual timeline interface for planning and viewing resource assignments
- **Legend**: A visual key showing project color codes and their meanings

## Requirements

### Requirement 1: Talent Pool Management

**User Story:** As a resource manager, I want to manage a pool of consultants, so that I can maintain an up-to-date roster of available talent for project assignments.

#### Acceptance Criteria

1. WHEN a user submits a new talent form with valid data THEN the System SHALL create a new talent record and display the talent in the talent pool sidebar
2. WHEN a user modifies talent information THEN the System SHALL update the talent record and reflect changes across all views
3. WHEN a user removes a talent THEN the System SHALL delete the talent record and remove the talent from the talent pool display
4. WHEN displaying the talent pool THEN the System SHALL show each talent as a draggable card in a sidebar bar component
5. WHEN a talent record is created THEN the System SHALL store the talent data in Supabase immediately

### Requirement 2: Calendar-Based Resource Planning

**User Story:** As a resource manager, I want to drag talents from the pool onto a calendar, so that I can visually plan and assign resources to projects over time.

#### Acceptance Criteria

1. WHEN a user drags a talent card from the sidebar THEN the System SHALL allow dropping onto calendar date cells
2. WHEN a talent is dropped on a calendar date THEN the System SHALL prompt for project selection and create a resource allocation record
3. WHEN displaying the calendar THEN the System SHALL show all resource allocations with project color coding
4. WHEN a user clicks on an existing allocation THEN the System SHALL allow editing or removing the allocation
5. WHEN an allocation is created or modified THEN the System SHALL persist the allocation data to Supabase immediately

### Requirement 3: Project Management with Color Coding

**User Story:** As a resource manager, I want to create and manage projects with distinct colors, so that I can easily identify different projects on the calendar.

#### Acceptance Criteria

1. WHEN a user creates a new project THEN the System SHALL assign a unique color and store the project in Supabase
2. WHEN a user updates project details THEN the System SHALL save changes and update all related calendar displays
3. WHEN a user removes a project THEN the System SHALL delete the project and all associated allocations after confirmation
4. WHEN displaying the calendar view THEN the System SHALL render a legend showing all active projects with their assigned colors
5. WHEN multiple projects exist THEN the System SHALL ensure each project has a visually distinct color

### Requirement 4: Project Status Tracking

**User Story:** As a project manager, I want to update the status of projects, so that I can track whether projects are in progress, completed, or canceled.

#### Acceptance Criteria

1. WHEN a user changes a project status to "In Progress" THEN the System SHALL update the project record and display the status indicator
2. WHEN a user changes a project status to "Completed" THEN the System SHALL update the project record and move the project to the completed projects list
3. WHEN a user changes a project status to "Canceled" THEN the System SHALL update the project record and visually distinguish the project as canceled
4. WHEN displaying project information THEN the System SHALL show the current status with appropriate visual styling

### Requirement 5: Completed Project Payment Tracking

**User Story:** As a finance manager, I want to track payment status of completed projects, so that I can monitor outstanding payments and financial status.

#### Acceptance Criteria

1. WHEN viewing the completed projects list THEN the System SHALL display each project with its payment status (Paid/Unpaid)
2. WHEN a user marks a project as paid THEN the System SHALL update the payment status and persist to Supabase
3. WHEN filtering completed projects THEN the System SHALL allow filtering by payment status
4. WHEN displaying payment status THEN the System SHALL use distinct visual indicators for paid and unpaid projects

### Requirement 6: Talent Details Page

**User Story:** As a resource manager, I want a dedicated page for each talent showing their skills and assigned areas, so that I can make informed decisions about project assignments.

#### Acceptance Criteria

1. WHEN a user navigates to a talent details page THEN the System SHALL display the talent's complete profile including skills and assigned areas
2. WHEN a user adds or removes skills from a talent THEN the System SHALL update the talent record immediately
3. WHEN a user assigns or removes areas from a talent THEN the System SHALL update the talent record immediately
4. WHEN displaying talent details THEN the System SHALL show the talent's assignment history

### Requirement 7: Custom Area Management

**User Story:** As an administrator, I want to create and manage custom business areas, so that I can categorize talents according to our specific industry focus.

#### Acceptance Criteria

1. WHEN a user creates a new area THEN the System SHALL add the area to the available areas list and persist to Supabase
2. WHEN a user updates an area name THEN the System SHALL update all talent records using that area
3. WHEN a user deletes an area THEN the System SHALL remove the area from all talent records after confirmation
4. WHEN assigning areas to talents THEN the System SHALL display all available custom areas for selection

### Requirement 8: Dashboard Overview (Recommended)

**User Story:** As a manager, I want a dashboard showing key metrics, so that I can quickly understand resource utilization and project status at a glance.

#### Acceptance Criteria

1. WHEN viewing the dashboard THEN the System SHALL display total talent count, active projects count, and utilization percentage
2. WHEN viewing the dashboard THEN the System SHALL show upcoming project deadlines within the next 30 days
3. WHEN viewing the dashboard THEN the System SHALL display a summary of unpaid completed projects
4. WHEN data changes occur THEN the System SHALL update dashboard metrics in real-time

### Requirement 9: Talent Availability Tracking (Recommended)

**User Story:** As a resource manager, I want to see talent availability status, so that I can avoid double-booking and identify available resources quickly.

#### Acceptance Criteria

1. WHEN displaying the talent pool THEN the System SHALL indicate each talent's current availability status
2. WHEN a talent is fully allocated for a date range THEN the System SHALL mark the talent as unavailable for those dates
3. WHEN attempting to allocate an unavailable talent THEN the System SHALL display a warning about the scheduling conflict
4. WHEN filtering the talent pool THEN the System SHALL allow filtering by availability status

### Requirement 10: Client Management (Recommended)

**User Story:** As a project manager, I want to associate projects with clients, so that I can track work history and relationships with each client.

#### Acceptance Criteria

1. WHEN creating a project THEN the System SHALL allow selecting or creating a client association
2. WHEN viewing a client THEN the System SHALL display all projects associated with that client
3. WHEN a user creates a new client THEN the System SHALL store the client record in Supabase
4. WHEN displaying project information THEN the System SHALL show the associated client name

### Requirement 11: Data Persistence and Synchronization

**User Story:** As a user, I want all data to be saved automatically, so that I never lose my work and can access it from any device.

#### Acceptance Criteria

1. WHEN any data modification occurs THEN the System SHALL persist changes to Supabase within 2 seconds
2. WHEN the application loads THEN the System SHALL retrieve all relevant data from Supabase
3. WHEN a database operation fails THEN the System SHALL display an error message and allow retry
4. WHEN displaying data THEN the System SHALL show loading indicators during data fetch operations
