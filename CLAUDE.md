# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mutual NDA Generator - A Next.js application that generates Mutual Non-Disclosure Agreements based on user input. The project uses Next.js 15, React 19, and Tailwind CSS for the frontend, with PDF generation capability.

## Commands

### Development

```bash
# Start Next.js dev server (frontend)
cd frontend && npm run dev

# Start development server from root
npm run dev

# Run tests
cd frontend && npm test

# Run tests with watch mode
cd frontend && npm run test:watch

# Run tests with coverage
cd frontend && npm run test:coverage

# Lint code
cd frontend && npm run lint

# Build for production
cd frontend && npm run build
```

### Git Workflow

- All code changes must be made via Pull Request
- Never push directly to main branch
- Use branch naming convention: `PL-<ticket-id>-<description>`
- Current branch: `PL-2-download-legal-templates`

## Architecture

### Tech Stack

- **Frontend**: Next.js 15.1.6, React 19.0.0, Tailwind CSS 3.4
- **Testing**: Jest, Testing Library (React, Jest-DOM), ts-jest
- **PDF Generation**: jsPDF 2.5.2, jsPDF-AutoTable 3.8.4

### Project Structure

```
preleagal/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages and API routes
│   │   │   ├── api/
│   │   │   │   └── generate-pdf/
│   │   │   │       └── route.ts   # PDF generation API endpoint
│   │   │   ├── globals.css
│   │   │   └── layout.tsx      # Root layout
│   │   ├── components/
│   │   │   └── NDAForm.tsx     # Main NDA form component
│   │   └── utils/
│   │       └── templateEngine.ts   # Document template engine
│   ├── jest.config.js          # Jest configuration
│   ├── jest.setup.js           # Test setup file
│   └── package.json
└── CLAUDE.md                   # This file
```

### Key Components

1. **NDAForm** (`frontend/src/components/NDAForm.tsx`)
   - Main form component for NDA generation
   - Real-time preview with live updates
   - Handles form data state and PDF generation

2. **templateEngine** (`frontend/src/utils/templateEngine.ts`)
   - Template rendering logic
   - `renderPreviewDocument()`: Generates preview HTML
   - `renderTable()`: Renders signature table
   - `generateNDADocument()`: Produces complete NDA string

3. **PDF Generation API** (`frontend/src/app/api/generate-pdf/route.ts`)
   - POST endpoint that accepts NDAPayload
   - Returns generated PDF as blob

### Data Flow

1. User fills form inputs via `NDAForm` component
2. `handleInputChange` updates `formData` state
3. `useMemo` computes `previewContent` from `formData`
4. Preview displays live document preview
5. On submit, POST to `/api/generate-pdf` with `formData`
6. Server generates PDF using `generateNDADocument()`
7. Browser receives blob and triggers download

### Interface Definitions

```typescript
interface NDAPayload {
  purpose: string;
  effectiveDate: string;
  mndaTerm: '1year' | 'continues';
  mndaTermValue: string;
  confidentialityTerm: '1year' | 'perpetuity';
  confidentialityTermValue: string;
  governingLaw: string;
  jurisdiction: string;
  party1Name: string;
  party1Signature: string;
  party1Title: string;
  party1Company: string;
  party1Address: string;
  party2Name: string;
  party2Signature: string;
  party2Title: string;
  party2Company: string;
  party2Address: string;
}
```

## Testing

Jest is configured with the following:
- Test environment: jsdom
- Path mapping: `@/*` → `./src/*`
- Coverage excludes: `.d.ts` files and `app` directory
- Setup file: `jest.setup.js` (includes jspdf mocks)

### Running Tests

```bash
cd frontend && npm test
cd frontend && npm run test:watch
cd frontend && npm run test:coverage
```

### Test Files

- `src/utils/templateEngine.test.ts` - Template engine unit tests
- `src/components/NDAForm.test.tsx` - Component integration tests
- `src/app/api/generate-pdf/route.test.ts` - API route tests

## Browser Integration

This project uses the superpowers brainstorming and testing framework for comprehensive test-driven development.

## Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Tailwind CSS for styling (no arbitrary values preferred)
- Functional components with React hooks
- Component composition pattern

## Notes

- The app uses Next.js App Router
- Client components marked with `'use client'` directive
- Server components default for performance
- Environment variables should be in `.env.local` (not committed)
