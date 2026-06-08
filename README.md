# ProofHub Quick Task Browser Extension

A Manifest V3 Google Chrome and Microsoft Edge browser extension that integrates with ProofHub to let you add tasks quickly. It features dynamic project search/pinning, caching selectors (caching the last chosen project and list), external link navigation, and automatic context scraper integration for Gmail and Outlook.

---

## Features

### 🔑 1. Setup & Connection
- **Sanitized Custom Domains**: Supports entering your own subdomain or full URL (e.g. `company` or `company.proofhub.com`).
- **Secure Token Storage**: Persistently saves the API key using `chrome.storage.local`.
- **Disconnect Action**: A clean logout mechanism to disconnect accounts and clear caches.

### 📌 2. Project Search & Pinning
- **Real-Time Project Filtering**: Quickly search your projects list.
- **Priority Pinning**: Pin your most active projects using the Golden Pin icon. Pinned projects automatically float to the top of the search view.

### ⚡ 3. Gmail & Outlook Content Grabbing
- **Email Connected Indicator**: Active green badge appears when viewing email clients (Gmail / Outlook).
- **DOM Subject Scraper**: Automatically queries and grabs the subject of the currently opened email (extracting `h2.hP` in Gmail or subject headings in Outlook) rather than raw browser title text.
- **Text Selection Scraper**: Dynamically extracts any active text selection from your email window to populate the **Task Description** text area.

### 🗂️ 4. Form Caching ("Remember Selection")
- **Caching Mechanism**: The last used Project and Task List are securely cached. Opening the popup will automatically skip project lists and load the Task Form directly.
- **Back Navigation**: Includes a back arrow button (←) to clear choices and return to the project selection list.
- **"Open PH" Button**: Directly launches the exact active list webapp URL in ProofHub.
- **Workflow & Label Integrations**: Full drop-down selections for Assignees, Task List, Status (Ch status), and Labels (Add Label) matching V3 API payloads.

---

## Installation Guide

To run this extension locally in developer mode:

1. Clone or download this repository to your machine.
2. Open Google Chrome or Microsoft Edge and open the extension manager:
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Choose the repository folder (`Proofhub browser plugin`) containing these files.
6. Pin the extension to your toolbar.

---

## File Overview

*   `manifest.json`: Configuration mapping permissions (`storage`, `activeTab`, `scripting`), host permissions, and the default HTML popup.
*   `popup.html`: Structure of the views (Setup, Project Selector, Task Creator).
*   `styles.css`: Stylesheet designed for a compact 350px width layout with clean transitions, animated loading indicators, and active badges.
*   `popup.js`: Scripts containing routing, text scraping content scripts, fallbacks URL validation routing, caching, and V3 POST payload creation.
