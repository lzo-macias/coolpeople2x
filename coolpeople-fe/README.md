# CoolPeople

A social platform for political engagement with gamified civic participation.

## Overview

CoolPeople is a social app built for politics featuring:
- **Opt-in Social Credit System** - Users can participate in a reputation/scoring system
- **Party Features** - Political party organization and collaboration tools
- **Live Scoreboard** - Real-time rankings and standings
- **Content & Interactions** - Users post content and engage with others
- **Candidate Tracking** - Follow and track favorite political candidates
- **Live Ballot System** - Real-time voting/polling functionality
- **Annual CoolPeople Competition** - Yearly contest where one candidate wins, bringing fame and glory

## Tech Stack

- **Frontend**: React 19 + Vite
- **Build Tool**: Vite 7
- **Linting**: ESLint 9
- **Target**: Mobile web app (mobile-first design)

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── main.jsx                    # App entry point
├── App.jsx                     # Root component (Home + Reels)
├── components/
│   ├── BottomNav.jsx           # 7-tab bottom navigation
│   ├── NominationStories.jsx   # Scrollable story avatars
│   ├── NominationCard.jsx      # Main nomination CTA card
│   ├── InviteFriends.jsx       # Contact invite section
│   ├── ReelCard.jsx            # Full-screen reel + preview mode
│   ├── ReelActions.jsx         # Reel action buttons (outlined icons)
│   ├── ReelsFeed.jsx           # Scrollable reels feed
│   ├── EngagementScoreBar.jsx  # Top sparkline charts for social credit
│   └── Sparkline.jsx           # SVG sparkline chart component
├── data/
│   └── mockData.js             # Mock data for API simulation
└── styling/
    ├── index.css               # Global styles & CSS variables
    ├── App.css                 # App layout styles
    └── [component].css         # Component-specific styles
```

## Current Status

**Implemented:**
- [x] Home page layout with dark theme
- [x] Bottom navigation (7 tabs)
- [x] Nomination stories (scrollable avatars)
- [x] Nomination card CTA
- [x] Invite friends section
- [x] Reels preview (peeking above nav)
- [x] Full-screen reel cards with:
  - Sparkline charts (jagged stock-style) for live engagement scores
  - User avatars with red ring + username in score bar
  - "+1" change indicators on score charts
  - Outlined action icons (vote, like, comment, shazam, share)
  - User avatar + party label + username
  - Title and caption text
  - Orange/coral gradient Nominate button
- [x] Reels feed with snap scrolling
- [x] Continuous scroll: home → reels (scroll down to enter reels)
- [x] Mock data system (src/data/mockData.js) for API simulation

## Roadmap

- [ ] User authentication
- [ ] Routing (home, reels, profile, etc.)
- [ ] Social credit system
- [ ] Party features
- [ ] Candidate profiles
- [ ] Live scoreboard
- [ ] Ballot/voting system
- [ ] Annual competition mechanics

---

*Last updated: January 2025*
