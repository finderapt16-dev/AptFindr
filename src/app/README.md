# App Folder Guide

Use this map when you need to find or change a feature quickly.

## Pages

- `admin/pages` - admin dashboard, apartment inspection, reports, verification, violations, and notices
- `landlord/pages` - landlord dashboard, property creation, room management, and landlord browse views
- `tenant/pages` - student/employee tenant dashboard, browse, apartment details, favorites, reports, and preferences
- `public` - landing, login, signup, forgot password, and not found pages
- `shared/pages` - role-neutral pages such as the dashboard router, settings, design guide, and flowchart

## Shared App Code

- `shared/layouts` - app shell/layout wrappers
- `shared/components/common` - reusable app-specific UI like the app logo, apartment card, and chatbot
- `shared/components/features` - feature-specific components such as the map view
- `shared/components/landing` - landing-page-only components
- `shared/components/ui` - base shadcn-style UI primitives
- `shared/contexts` - React providers for auth and apartment state
- `shared/data` - data models and adapters used by pages/components
- `shared/hooks` - reusable React hooks
- `shared/services` - Supabase read/write logic
- `shared/utils` - pure helper functions
