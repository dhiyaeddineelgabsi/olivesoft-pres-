# OliveBranch · 5-minute pitch (one speaker)

Deck: `index.html` (press **N** during the talk to see these lines as speaker notes; they are the same words). `(click)` marks a click that reveals the next element on the slide. About 540 words: **4:15** at a calm 130 words per minute with the clicks, which leaves 45 seconds of margin in a 5-minute slot.

The 2-minute demo video is shown separately, outside the deck. The demo slide is kept as an HTML comment in `index.html` if it needs to come back.

| # | Slide | Time | Total |
|---|---|---|---|
| 1 | Title | 0:10 | 0:10 |
| 2 | The problem | 0:20 | 0:30 |
| 3 | The proposed solution | 0:20 | 0:50 |
| 4 | The architecture | 0:20 | 1:10 |
| 5 | The n8n workflow | 0:25 | 1:35 |
| 6 | Collecting tenders | 0:30 | 2:05 |
| 7 | Comparing with our knowledge base (RAG) | 0:45 | 2:50 |
| 8 | Generating the presentation | 0:25 | 3:15 |
| 9 | Editing in Canva | 0:25 | 3:40 |
| 10 | Security | 0:20 | 4:00 |
| 11 | Next steps and thank you | 0:15 | 4:15 |

**If time is cut (about 3 minutes):** skip slide 4 (architecture), say only the first sentence of slide 5, and drop the last two sentences of slide 7.

## The pitch

**1 · Title (0:10)**
Good morning. We are team Intégrale IT, and this is OliveBranch: it takes a public tender and turns it into a commercial proposal, backed by evidence.

**2 · The problem (0:20)**
Today, a bid team watches procurement portals by hand. *(click)* The knowledge it needs, CVs, past projects, tools, is scattered across folders. *(click)* And every proposal is written from scratch. The result: slow answers.

**3 · The proposed solution (0:20)**
OliveBranch automates this in five steps. *(click)* Detect new tenders. *(click)* Research the buyer. *(click)* Compare each requirement with our own knowledge. *(click)* A person decides. *(click)* Only then do we generate the proposal.

**4 · The architecture (0:20)**
Three layers. *(click)* A Next.js interface on Vercel, which only displays results. *(click)* All the business logic lives in n8n, on Azure. *(click)* And a data and AI layer: Supabase, Qdrant for vectors, Gemini, DeepSeek and Tavily, our own PPTX and PDF renderer, and Canva.

**5 · The n8n workflow (0:25)**
n8n is the heart of the system: twenty-nine workflows. This one is the job runner. Every minute it claims the next job from a durable queue in Postgres, with a lease, so no job runs twice. If a stage fails, it retries up to three times, from its last checkpoint.

**6 · Collecting tenders (0:30)**
Every morning at six, this workflow scans four official sources: TED and BOAMP through their APIs, Find a Tender in the UK through OCDS, and HAICOP in Tunisia, from its public pages. An LLM extracts the requirements, with one rule. *(click)* Each requirement needs an exact quote from the notice, or it is dropped.

**7 · Comparing with our knowledge base, RAG (0:45)**
Then the matching, with RAG over our own knowledge. Each document, a CV, a project, a tech stack, is extracted, chunked, turned into Gemini vectors and stored in Qdrant. For each requirement we retrieve the top five passages, and an LLM judges it, always with the quote that proves it. *(click)* Here, "Data Scientist role" is supported, with the exact line from the CV. *(click)* Then we tested it. On 35 questions, the right document is always in the top five. On 24 requirements from labelled tenders, twenty are judged correctly, that is 83 percent. And with no evidence, it says unknown. It never invents a qualification.

**8 · Generating the presentation (0:25)**
When the team accepts an opportunity, two AI agents take over: a strategist plans the proposal, and a writer drafts it. Every claim is checked against its source. The renderer then produces an editable PowerPoint and a PDF. Anything we cannot prove becomes a yellow field for the team to complete.

**9 · Editing in Canva (0:25)**
For the final polish, one click on "Modifier dans Canva" opens the deck in the editor the team already knows. *(click)* The team edits it there. *(click)* One click brings the changes back as a new version. *(click)* Files stay private, old versions are kept, and the compliance review is flagged to be redone.

**10 · Security (0:20)**
Security was built in from day one. API keys stay on the server, every webhook is protected, Supabase enforces row level security, and files sit in private storage behind sixty-second links. Quotes are verified against their source, so injected text cannot slip into a proposal.

**11 · Next steps and thank you (0:15)**
Next: OCR for scanned PDFs, individual accounts with roles, an evaluation on OliveSoft's real CVs, and monitoring with alerts. *(click)* Thank you. We are happy to take your questions.

## Captures

One picture per slide. Drop each capture into `assets/captures/` named after its ID (`N1.png`, `F1.jpg`, ...) and it replaces the stand-in automatically. **Blur before adding:** API keys, full webhook URLs, names and contact details in CVs.

| ID | Slide | Capture | Shown until added |
|---|---|---|---|
| N1 | 5 | n8n canvas of `07_job_runner` (zoom to fit, no minimap) | drawn from the workflow export |
| N4 | 6 | n8n canvas of `14_opportunity_scan` (4 sources visible) | drawn from the workflow export |
| A2 | 7 | Requirement matrix with the CV quote | live app capture, already in place |
| F1 | 8 | A generated PPTX slide in PowerPoint, **with a yellow field** | cover of the generated PDF |

Slides 1–4, 10 and 11 have no screenshot.

Logos: drop `assets/logos/<name>.svg` (or .png) with these names and they replace the monograms: `ted`, `boamp`, `find-a-tender`, `haicop`, `nextjs`, `n8n`, `supabase`, `qdrant`, `gemini`, `deepseek`, `tavily`, `canva`.

## Sources for every claim

- 29 workflows, leases, checkpoints, three retries, polling every minute: `docs/ARCHITECTURE.md`, `n8n/workflows/07_job_runner.json`.
- Daily 06:00 scan, four sources, OCDS, HAICOP public pages, verbatim quotes only: `docs/current-system.md`, `n8n/workflows/14_opportunity_scan.json`.
- hit@5 1.00, recall@5 0.83, 83.3% matching accuracy (configuration A, the production default): `docs/rag-evaluation.md`.
- Strategist and writer agents: `docs/current-system.md` (workflow 19).
- 60-second signed links: `expiresIn: 60` in `n8n/workflows/22_proposal_delivery.json` and `n8n/scripts/export_canva.js`.
- Row level security: `ENABLE ROW LEVEL SECURITY` in 14 migrations under `db/migrations/`.
