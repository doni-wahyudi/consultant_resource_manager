# Implementation Plan

- [x] 1. Set up project structure and Supabase configuration






  - [x] 1.1 Create directory structure and base HTML file

    - Create folders: css/, js/, js/services/, js/components/, js/pages/, assets/icons/
    - Create index.html with navigation structure and page containers
    - Set up CSS files: main.css, components.css, calendar.css, pages.css
    - _Requirements: 11.2_
  - [x] 1.2 Configure Supabase client and connection


    - Create js/config.js with Supabase URL and anon key placeholders
    - Create js/services/supabase.js with client initialization
    - Implement connection test function
    - _Requirements: 11.1, 11.2_
  - [x] 1.3 Set up Supabase database schema


    - Create SQL migration for areas, clients, talents, talent_areas, projects, allocations tables
    - Add indexes for performance optimization
    - Document schema setup instructions
    - _Requirements: 11.2_

- [x] 2. Implement core state management and routing





  - [x] 2.1 Create state manager with pub/sub pattern


    - Implement StateManager with subscribe, setState, getState methods
    - Initialize state structure for talents, projects, allocations, areas, clients, ui
    - _Requirements: 11.2_
  - [x] 2.2 Implement client-side router


    - Create js/router.js with hash-based routing
    - Implement route registration and navigation
    - Connect router to page rendering
    - _Requirements: 6.1_

- [x] 3. Implement UI foundation components





  - [x] 3.1 Create modal component


    - Implement show, hide, confirm, form methods
    - Style modal with overlay and animations
    - _Requirements: 2.2, 3.3_

  - [x] 3.2 Create toast notification component

    - Implement success, error, warning toast types
    - Add auto-dismiss and manual close functionality
    - _Requirements: 11.3_
  - [x] 3.3 Create form components and validation utilities


    - Implement reusable form field components
    - Create validation functions for required fields, email, dates
    - _Requirements: 1.1, 3.1, 7.1, 10.3_

- [x] 4. Implement Area management (foundation for talents)





  - [x] 4.1 Create Area service with CRUD operations


    - Implement getAll, create, update, delete methods
    - Connect to Supabase areas table
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 4.2 Write property test for Area CRUD






    - **Property 16: Area CRUD Round-Trip**
    - **Validates: Requirements 7.1**

  - [x] 4.3 Create Area management UI in settings page

    - Build area list with add, edit, delete actions
    - Implement area form modal
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Implement Client management





  - [x] 5.1 Create Client service with CRUD operations


    - Implement getAll, getById, create, update, delete methods
    - Connect to Supabase clients table
    - _Requirements: 10.1, 10.3_
  - [x] 5.2 Write property test for Client-Project association






    - **Property 22: Client-Project Association**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 5.3 Create Client management UI

    - Build client list page with CRUD actions
    - Show associated projects for each client
    - _Requirements: 10.2, 10.4_

- [x] 6. Implement Talent management





  - [x] 6.1 Create Talent service with CRUD operations


    - Implement getAll, getById, create, update, delete methods
    - Implement addSkill, removeSkill, assignArea, removeArea methods
    - Connect to Supabase talents and talent_areas tables
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 6.2, 6.3_
  - [x] 6.2 Write property tests for Talent CRUD






    - **Property 1: Talent CRUD Round-Trip Consistency**
    - **Property 2: Talent Update Persistence**
    - **Property 3: Talent Deletion Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
  - [x] 6.3 Write property tests for Talent modifications






    - **Property 13: Talent Skills Modification Persistence**
    - **Property 14: Talent Area Assignment Persistence**
    - **Validates: Requirements 6.2, 6.3**

  - [x] 6.4 Create Talent pool sidebar component

    - Render talent cards with name and availability indicator
    - Implement drag functionality for talent cards
    - Add filtering by area and availability
    - _Requirements: 1.4, 9.1, 9.4_

  - [x] 6.5 Create Talent list page

    - Display all talents in grid/list view
    - Implement add, edit, delete actions
    - Link to talent detail pages
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.6 Create Talent detail page

    - Display complete talent profile with skills and areas
    - Implement skill add/remove functionality
    - Implement area assign/remove functionality
    - Show assignment history
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 6.7 Write property test for assignment history






    - **Property 15: Talent Assignment History Completeness**
    - **Validates: Requirements 6.4**

- [x] 7. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Project management with color coding



  - [x] 8.1 Create Project service with CRUD operations

    - Implement getAll, getById, create, update, delete methods
    - Implement updateStatus, updatePaymentStatus, getByStatus, getByClient methods
    - Implement generateColor function for unique colors
    - Connect to Supabase projects table
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.2_
  - [x] 8.2 Write property tests for Project color uniqueness





    - **Property 6: Project Color Uniqueness**
    - **Validates: Requirements 3.1, 3.5**
  - [x] 8.3 Write property tests for Project status





    - **Property 9: Project Status Update Persistence**
    - **Property 10: Completed Projects Filter Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1**
  - [x] 8.4 Write property tests for Project payment status






    - **Property 11: Payment Status Update Persistence**
    - **Property 12: Payment Status Filter Accuracy**
    - **Validates: Requirements 5.2, 5.3**
  - [x] 8.5 Write property test for Project cascade delete






    - **Property 7: Project Cascade Delete**
    - **Validates: Requirements 3.3**
  - [x] 8.6 Create Project legend component

    - Render color-coded legend for active projects
    - Update legend when projects change
    - _Requirements: 3.4_
  - [x] 8.7 Write property test for Legend completeness






    - **Property 8: Legend Completeness**
    - **Validates: Requirements 3.4**

  - [x] 8.8 Create Projects management page
    - Display projects list with status indicators
    - Implement add, edit, delete actions with confirmation
    - Show project color and client association
    - Implement status change dropdown
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
  - [x] 8.9 Create Completed projects page with payment tracking

    - Display completed projects with payment status
    - Implement payment status toggle
    - Add filtering by payment status
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Implement Allocation management and Calendar



  - [x] 9.1 Create Allocation service with CRUD operations


    - Implement getAll, getByDateRange, getByTalent, getByProject methods
    - Implement create, update, delete methods
    - Implement checkConflicts method for availability
    - Connect to Supabase allocations table
    - _Requirements: 2.2, 2.5, 9.3_
  - [x] 9.2 Write property tests for Allocation CRUD






    - **Property 4: Allocation Creation Round-Trip**
    - **Validates: Requirements 2.2, 2.5**
  - [x] 9.3 Write property tests for Availability and Conflicts






    - **Property 20: Talent Availability Calculation**
    - **Property 21: Allocation Conflict Detection**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 9.4 Create Calendar component

    - Render monthly calendar grid with navigation
    - Implement drop zones for talent allocation
    - Display allocations with project colors
    - Handle allocation click for edit/delete
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 9.5 Write property test for Calendar display






    - **Property 5: Calendar Allocation Display Completeness**
    - **Validates: Requirements 2.3**


  - [x] 9.6 Create Calendar planning page

    - Integrate talent sidebar with calendar
    - Implement drag-and-drop allocation workflow
    - Show project selection modal on drop
    - Display legend component
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4_

- [x] 10. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Dashboard





  - [x] 11.1 Create Dashboard metrics calculation functions


    - Calculate total talent count
    - Calculate active projects count
    - Calculate utilization percentage
    - Get upcoming deadlines (next 30 days)
    - Get unpaid completed projects summary
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 11.2 Write property tests for Dashboard metrics

    - **Property 18: Dashboard Metrics Accuracy**
    - **Property 19: Upcoming Deadlines Filter**
    - **Validates: Requirements 8.1, 8.2**


  - [x] 11.3 Create Dashboard page
    - Display metric cards for talent, projects, utilization
    - Show upcoming deadlines list
    - Show unpaid projects summary
    - Implement real-time updates on data changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 12. Implement Area deletion cascade





  - [x] 12.1 Update Area service for cascade behavior


    - Implement cascade removal from talent_areas on area delete
    - Add confirmation dialog for area deletion
    - _Requirements: 7.3_
  - [x] 12.2 Write property test for Area cascade



    - **Property 17: Area Deletion Cascade**
    - **Validates: Requirements 7.3**

- [x] 13. Implement data loading and error handling





  - [x] 13.1 Create initial data loader


    - Load all data on application start
    - Show loading indicators during fetch
    - Handle load errors gracefully
    - _Requirements: 11.2, 11.4_
  - [x] 13.2 Write property test for data load completeness



    - **Property 23: Initial Data Load Completeness**
    - **Validates: Requirements 11.2**
  - [x] 13.3 Implement error handling across services


    - Add try-catch to all service methods
    - Display appropriate error toasts
    - Implement retry functionality for network errors
    - _Requirements: 11.3_

- [x] 14. Final polish and integration






  - [x] 14.1 Add responsive styling and visual polish

    - Ensure consistent styling across all pages
    - Add hover states and transitions
    - Implement status color indicators
    - _Requirements: 4.4, 5.4_

  - [x] 14.2 Wire up navigation and page transitions

    - Connect all navigation links
    - Ensure state persistence across page changes
    - Add active state to navigation items
    - _Requirements: 6.1_

  - [x] 14.3 Add loading states and empty states

    - Show loading spinners during data operations
    - Display helpful empty state messages
    - _Requirements: 11.4_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
