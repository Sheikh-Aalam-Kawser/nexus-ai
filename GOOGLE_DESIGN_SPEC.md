# Google Design Specification

## Overview
This document outlines the design specification for transforming the task-management application to align with Google's Material Design 3 guidelines. The specification focuses on creating a clean, professional, and accessible user interface while preserving the core functionality of the application. 

## Page Structure and Navigation Flow
The application layout will adopt a classic Google Workspace-like structure:
- **Top App Bar**: Contains the application logo/name ("Nexus"), global search functionality (if applicable), and user profile/settings on the far right.
- **Left Navigation Drawer**: A clean, persistent or collapsible drawer containing primary navigation links (Dashboard, My Tasks, Task Plan, Profile).
- **Main Content Area**: A spacious canvas for the primary content, using standard grid and column layouts. Cards will be used to modularize information, with ample whitespace (padding and margins) to prevent clutter.

## Component List with Google-Style Equivalents
- **Buttons**:
  - *Primary Action*: Filled Button (Google Blue `#1a73e8`), fully rounded edges (pill shape) or slightly rounded (4px radius depending on Material 3 preferences, though M3 uses fully rounded for primary Floating Action Buttons and pill shapes for standard buttons).
  - *Secondary Action*: Outlined Button or Text Button (Ghost button).
- **Cards (Task Cards, Metric Cards)**:
  - Background: White (`#ffffff`).
  - Border: Subtle gray border (`1px solid #dadce0`) or light elevation shadow instead of heavy borders.
  - Border Radius: Large rounded corners (`16px` to `24px`).
- **Badges/Tags**:
  - Use Material "Chips" for task statuses, priority scores, and urgency. Chips should have a light colored background (e.g., light blue or gray) with darker text.
- **Inputs and Forms**:
  - Outlined Text Fields with the label floating on the border. Focus states should use the primary Google Blue.

## Font Family, Style, and Size Recommendations
- **Primary Font**: `Roboto` (Google's standard system font).
- **Headings**:
  - H1: Roboto Regular, 32px or 28px, Dark Gray (`#202124`).
  - H2: Roboto Medium, 24px or 22px, Dark Gray.
  - H3: Roboto Medium, 18px or 16px, Dark Gray.
- **Body Text**:
  - Body 1 (Primary Text): Roboto Regular, 14px or 16px, Dark Gray (`#202124`).
  - Body 2 (Secondary/Muted Text): Roboto Regular, 12px or 14px, Medium Gray (`#5f6368`).
- **Button/Label Text**: Roboto Medium, 14px, Uppercase or Title Case.

## Color Palette
The color palette should lean heavily on clean whites and grays, using colors primarily for actions and indicators.

- **Backgrounds**:
  - App Background: Off-white/Light Gray (`#f8f9fa`).
  - Surface/Card Background: Pure White (`#ffffff`).
- **Text**:
  - Primary Text: `#202124`.
  - Secondary Text: `#5f6368`.
- **Primary Action (Brand Color)**:
  - Google Blue: `#1a73e8` (Tailwind `blue-600` equivalent).
  - Hover State: `#174ea6` or a light blue overlay (`rgba(26, 115, 232, 0.08)`).
- **Semantic Colors** (for priority, alerts, success):
  - Error/High Priority: Google Red (`#ea4335`).
  - Success/Completed: Google Green (`#34a853`).
  - Warning/Medium Priority: Google Yellow (`#fbbc04`).

## Interaction Details
- **Hover Behaviors (My Tasks & Cards)**:
  - When hovering over a task card, the background should shift to a very subtle light gray (e.g., `#f8f9fa` or `#f1f3f4`), rather than inverting to black.
  - *Fix Applied*: The issue in the "My Tasks" tab where the background turned almost black (`#151518`) while the text remained dark has been resolved. The hover state now uses a subtle `hover:bg-slate-50` (`#f8fafc`) to maintain legibility and align with Material Design standards.
- **Elevation on Hover**:
  - Interactive cards may slightly increase in shadow elevation (e.g., transitioning from a flat border to a shadow `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`).
- **Ripple Effect**:
  - Buttons and interactive elements should ideally exhibit a subtle ripple effect (or at minimum a soft background color transition) upon clicking.
