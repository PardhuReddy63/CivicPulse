# CivicPulse Hub — Frontend Portal (M1)

React 19 + Vite responsive web application serving Citizen, Officer, and Administrator workflows.

## Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 8)
- Windows PowerShell

## Quickstart via Windows PowerShell

### 1. Navigate to Directory
```powershell
cd civicpulse/frontend
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment
```powershell
if (!(Test-Path .\.env)) { Copy-Item .env.example .env }
```

### 4. Start Development Server
```powershell
npm run dev
```
Open `http://localhost:5173` in your browser.

## Features
- **Role-Based Access Control**: Dedicated dashboards for Citizens, Officers, and Admins.
- **Server-backed sign-in**: No default persona, hardcoded credentials, or local mock fallback.
- **Complaint Management**: Image upload preview, GIS coordinate picking, interactive status timeline.
- **Automated Reopening**: Feedback modal with 1–5 stars; automatically reopens resolved complaint to PENDING if rating is 1 or 2.
- **GIS Map**: Leaflet/OpenStreetMap tiles with actual database coordinates, selection, geolocation permission, and manual coordinate entry.
- **Excel Spreadsheet Export**: Instant generation and download of XLSX reports.

OpenStreetMap public tiles require internet access and follow the OSM tile usage policy. They are not an unrestricted production tile host. No Google Maps key is needed.
