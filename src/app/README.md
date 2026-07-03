# App Folder Guide

Use this map when you need to find or change a feature quickly.

## Pages

- `pages/auth` - login, signup, password reset
- `pages/apartments` - browse, apartment details, favorites, add apartment
- `pages/dashboards` - shared dashboard router plus admin, landlord, student/employee dashboards
- `pages/public` - landing page and not found page
- `pages/settings` - account settings
- `pages/tools` - design guide and flowchart helper pages

## Shared App Code

- `layouts` - app shell/layout wrappers
- `components/common` - reusable app-specific UI like the app logo, apartment card, and chatbot
- `components/features` - feature-specific components such as the map view
- `components/landing` - landing-page-only components
- `components/ui` - base shadcn-style UI primitives
- `contexts` - React providers for auth and apartment state
- `data` - data models and adapters used by pages/components
- `hooks` - reusable React hooks
- `services` - Supabase read/write logic
- `utils` - pure helper functions
