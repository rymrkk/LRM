# Design Reference

Primary source: `docs/crm-application-specification.md`. Visual reference: `C:\Users\Ray Mark Cervantes\Downloads\DESIGN-slack.md`.

Use the Slack reference only as visual inspiration. Do not copy Slack branding, logos, chat-specific interaction patterns, or marketing composition.

## Direction

The UI should feel like a polished operational CRM:

- Dense and scannable.
- Work-focused, not decorative.
- Fast for repeated filtering, comparison, and navigation.
- Clear about workspace state and result counts.

## Allowed Adaptations

- Aubergine accent for selected navigation and primary actions.
- Pill-shaped primary controls where appropriate.
- Soft lavender or cream secondary surfaces.
- Inter-style typography.
- Compact left navigation and table-first layout.

## Layout Expectations

- First screen should be the usable app shell after auth, not a landing page.
- Primary navigation: All Contacts, Companies, Saved Lists.
- Global controls: workspace switcher, create/upload, top search, account/logout.
- Secondary controls: filter panel, column picker, save list, contact drawer.
- Contact detail opens in a side drawer with Contact, Company, Address, Metadata, Notes, and Tags sections.

## Accessibility

- All controls keyboard reachable.
- Buttons and icon buttons have accessible names.
- Form fields have labels.
- Focus states are visible.
- Drawer open and close manages focus predictably.
- Text and controls meet contrast requirements.
