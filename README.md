# CFA Study Tracker

A browser-based study tracker for planning a CFA exam attempt and keeping first-pass study, revision, study time, and mock practice in one place.

## Tracker areas

- **Dashboard** â€” overall exam readiness, progress signals, todayâ€™s review queue, and study activity.
- **Revision** â€” reading-linked spaced repetition at Day 1, Day 7, Day 21, then every 21 days.
- **Topics** â€” reading-level first-pass progress across the selected CFA curriculum.
- **Study Log** â€” completed or incomplete reading outcomes with study date and hours.
- **Mocks** â€” configurable mock slots that contribute to the overall readiness score when completed.

## Readiness model

Overall readiness is a balanced 100-point score:

- 50% first-pass coverage
- 20% retention practice
- 30% mock completion

The segmented readiness gauge uses equal start and end segments, with the score kept close to the indicator for clear reading on desktop and mobile.

## Revision model

Each completed reading gets its own revision schedule anchored to its completion date. The first three reviews each earn one-third of that reading's available revision credit; later 21-day reviews are retention work and earn no additional readiness credit.

## Responsive experience

The configuration and reading-outcome dialogs use compact, two-column form layouts so their standard flows fit on phone and desktop screens without an internal scroll area. The interface stores data locally in the browser and supports JSON export/import with safe migration from earlier tracker versions.

## Goal

Build a consistent, practical system for preparing for CFA Level I while keeping reading progress, study time, revision retention, and mock performance easy to review and maintain.

