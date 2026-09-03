# Product Requirements Document (PRD): 3D Printing Local Business Website

## 1. Executive Summary
A lightweight, single-page web application designed to inform local customers about 3D printing services. The site serves two main purposes: providing hard-to-find replacement parts (automotive/industrial) and offering custom, aesthetic 3D-printed items. The content is entirely data-driven via JSON files to allow for easy updates without code changes.

## 2. Target Audience
- Local residents needing replacement parts for cars or household items.
- Individuals looking for custom decorative/aesthetic 3D-printed goods.
- Small business owners or hobbyists in remote areas.

## 3. Core Objectives
- **Inform**: Clearly communicate the value proposition (solving scarcity/cost issues).
- **Showcase**: Display a gallery of previous work and available items.
- **Convert**: Direct users to WhatsApp for inquiries and orders.
- **Maintainability**: Enable content updates (news, gallery, items) by simply editing JSON files.

## 4. Functional Requirements

### 4.1 Single Page Application (SPA) Architecture
- The site will function as a single page where the main body content swaps dynamically (Home, Services, Gallery, etc.) based on user navigation.

### 4.2 Data-Driven Content (JSON-Powered)
The following sections must be populated via external JSON files:
- **Services**: Descriptions of printing capabilities and use cases.
- **Gallery**: Image URLs, titles, and descriptions of completed projects.
- **Items/Catalog**: A list of printable items with names, descriptions, and links.
- **News/Tips**: A section for updates, maintenance tips, or new service announcements.
- **Social Links**: A central configuration for WhatsApp, Instagram, Telegram, etc.

### 4.3 Key Features
- **Dynamic Navigation**: Smooth transitions between "sections" (Home, Services, Gallery).
- **Gallery Module**: A visually appealing grid showcasing 3D printed items.
- **News/Tips Feed**: A section to display the latest info from the `news.json`.
- **Contact Integration**:
    - Primary: Direct "Chat on WhatsApp" button.
    - Secondary: Links to Instagram and Telegram.

## 5. Technical Requirements
- **Frontend**: HTML5, CSS3, and Vanilla JavaScript (or a lightweight framework like Vue/React if preferred for SPA routing).
- **Data Format**: JSON.
- **Hosting**: GitHub Pages (Static Site).
- **Deployment**: Manual update of JSON files in the Git repository will trigger site updates.

## 6. User Journey
1. **Landing**: User arrives at the Home section and understands the "problem-solver" aspect of the business.
2. **Exploration**: User navigates to "Services" to see what can be printed, then "Gallery" to see quality.
3. **Discovery**: User reads "Tips/News" to gain trust/knowledge.
4. **Action**: User clicks a "Contact via WhatsApp" link to request a specific part or item.

## 7. Success Metrics
- High click-through rate on the WhatsApp contact link.
- Ease of content updates (time taken to add a new item via JSON).
- Low bounce rate on the landing page.
