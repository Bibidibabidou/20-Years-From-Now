# 20 Years From Now

**In the next 20 years, will AI systems start behaving in ways their own developers didn't intend?**

An interactive data story about AI behaviour and agency, built for the HSLU Data Storytelling module (autumn 2026) with Interactive Things as client.

**Live prototype:** https://bibidibabidou.github.io/20-years-from-now/

## The story

Between June and October 2026, the share of Americans who say AI systems behaving in ways their developers did not intend is *already happening* rose from **28% to 43%**. The share who are worried at all (already happening + likely) stayed flat at **77–79%**. At the same time, **67%** say AI is coming into their lives whether they want it or not, and only **16%** feel they can shape it.

> The fear didn't grow. It moved closer, and most people feel they have no say in it.

The website tells this in five acts:

| Act | Title | What happens |
|---|---|---|
| 1 | Something's off | The page starts behaving in ways nobody asked for |
| 2 | Naming it | The visitor answers the original survey question |
| 3 | It's already here | 1,000 dots orbit "now"; eight survey waves show the shift |
| 4 | Who decides? | The visitor tries to push it back, then sees the agency result |
| 5 | Your turn | The visitor places their own next 20 years next to the room and the country |

## Data

- **Source:** [Americans on AI](https://americanson.ai/en/methodology) by Athena Insights, fielded by NORC at the University of Chicago on the AmeriSpeak probability panel.
- **Waves:** 8 waves, 25 June – 8 October 2026, about 1,000 US adults each, weighted. The June pilot (different panel) is excluded.
- **Item:** "Thinking about the next 20 years, how likely is each of the following to happen? AI systems behaving in ways their developers did not intend." (Release 008, p. 45)
- **Margin of error:** ±4.1 points per wave; wider for subgroups.
- **Visitor answers** in this prototype are demo data, labelled as such on the page.

## Tech

One self-contained `index.html`: HTML, CSS and vanilla JavaScript with a Canvas particle field. No build step and no dependencies apart from Google Fonts (Geist, Geist Mono). Respects `prefers-reduced-motion` and works with keyboard and on phones.

To run it locally, open `index.html` in a browser.

## Team

- **Anissah** – design and development
- **Basit** – data and content

## Status

Prototype v1 for user testing (November 2026). Final version due 17 December 2026.
