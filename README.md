# Tailor Desk

An AI-powered resume-tailoring tool. Paste in a base resume and a job
description, and it returns a fit score, a keyword match/gap map, and resume +
cover-letter copy rewritten for that specific role.

Built as a React component that calls the Claude API to do the analysis.

## What it does

- **Fit score** — rates how well the resume matches the posting.
- **Keyword map** — shows which of the posting's keywords the resume already
  supports (matches) and which it's missing (gaps), so nothing gets faked.
- **Tailored rewrite** — regenerates the summary and bullet points to lead with
  the experience the role actually asks for.
- **Cover-note draft** — a short opener tuned to the posting.

## How it works

`src/TailorDesk.jsx` is a self-contained React component. On submit it sends the
resume + job description to the Claude API with a structured prompt and renders
the JSON response into the fit score, keyword chips, and rewritten copy.

## Running it

The component expects a React environment and a Claude API endpoint. To run it
standalone, drop `TailorDesk.jsx` into a React app (e.g. Vite) and wire the
fetch call to your own Claude API key via a small backend proxy (never ship a
key in the frontend).

## Stack

React · Claude API · JSON-structured prompting
