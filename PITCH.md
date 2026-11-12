# OlivesoftBranch · 5-minute pitch (one speaker) + 1:45 demo film

Deck: `index.html` (press **N** during the talk to see these lines as speaker notes). `(click)` marks a click that reveals the next element on the slide. About 650 words at a calm 130 words per minute.

| # | Slide | Time | Total |
|---|---|---|---|
| 1 | Title | 0:10 | 0:10 |
| 2 | The problem | 0:25 | 0:35 |
| 3 | The proposed solution | 0:25 | 1:00 |
| 4 | The architecture | 0:20 | 1:20 |
| 5 | The n8n workflow | 0:30 | 1:50 |
| 6 | Collecting tenders | 0:40 | 2:30 |
| 7 | Comparing with our knowledge base (RAG) | 0:55 | 3:25 |
| 8 | Generating the presentation | 0:30 | 3:55 |
| 9 | Editing in Canva | 0:25 | 4:20 |
| 10 | Security | 0:20 | 4:40 |
| 11 | Live demo (narrated film, plays on click) | 1:45 | 6:25 |
| 12 | Next steps and thank you | 0:20 | 6:45 |

## The pitch

**1 · Title (0:10)**
Good morning. We are team Intgrale IT, and this is OlivesoftBranch: it takes a public tender and turns it into a commercial proposal, backed by evidence.

**2 · The problem (0:25)**
Today, a bid team watches public procurement portals by hand. *(click)* The knowledge it needs, CVs, past projects, tools, is scattered across folders. *(click)* And every proposal is written from scratch. The result: slow answers, and positioning that depends on who had time to dig.

**3 · The proposed solution (0:25)**
OlivesoftBranch automates that in five steps. *(click)* Detect new tenders. *(click)* Research the buyer. *(click)* Compare every requirement with our own knowledge. *(click)* Then a person decides. *(click)* And only then do we generate the proposal. The human stays in control at the one step that matters.

**4 · The architecture (0:20)**
Three layers. *(click)* A Next.js interface on Vercel, which only displays results. *(click)* All the business logic lives in n8n, on Azure. *(click)* And a data and AI layer: Supabase for the database and private files, Qdrant for vectors, Gemini, DeepSeek and Tavily, our own PPTX and PDF renderer, and Canva.

**5 · The n8n workflow (0:30)**
n8n is the heart of the system: twenty-nine workflows. This one is the job runner. Every minute it claims the next job from a durable queue in Postgres, with a lease, so two workers never take the same job. Each stage saves a checkpoint, and when something fails it retries automatically, up to three times, without redoing the work already done.

**6 · Collecting tenders (0:40)**
It starts with collection. Every morning at six, this workflow reads four official sources: TED, for Europe and France, and BOAMP, both through their APIs; Find a Tender, in the UK, through its OCDS API; and HAICOP, in Tunisia, which we scrape from its public pages. An LLM extracts the requirements, and we enforce one rule. *(click)* Every requirement must come with an exact quote from the notice, or it is dropped. The notice is treated as data, never as instructions. A notice with no deadline or no usable requirement is held for human review, never silently lost.

**7 · Comparing with our knowledge base, RAG (0:55)**
Then the core of the matching: RAG over our own knowledge. Every document, a CV, a project reference, a tech stack, is extracted, cut into chunks, turned into Gemini vectors and stored in Qdrant. For each requirement of the tender, we retrieve the top five passages, and an LLM judges it: supported, partial, unsupported or unknown, always with the quote that proves it. *(click)* Here, the requirement "Data Scientist role" is supported, and you can read the exact line from the CV. *(click)* We benchmarked it on labelled queries: hit at five is one point zero, recall at five is zero point eight three, and eighty-three percent of requirement judgments are correct. When the evidence is missing, the system says unknown. It never invents a qualification.

**8 · Generating the presentation (0:30)**
When the team accepts an opportunity, two AI agents take over: a strategist plans the proposal, and a writer drafts it. Every claim is checked against its source before it can reach a slide. The renderer then produces a real, editable PowerPoint, and a PDF. Anything we cannot prove becomes a yellow field, for the team to complete.

**9 · Editing in Canva (0:25)**
For the final polish, one click on "Modifier dans Canva" *(click)* imports the deck into Canva. *(click)* The team edits it there, with the tool it already knows, *(click)* and OlivesoftBranch detects the changes and syncs them back as a new version of the proposal.

**10 · Security (0:20)**
Security was built in from day one. API keys stay on the server. Every webhook is protected. Supabase enforces row level security. Files live in private storage, behind links that expire after sixty seconds. And every quote is verified against its source, so text injected into a web page cannot slip into a proposal.

**11 · Live demo (1:45)**
Here is the live system, recorded on the production workspace. *(click)* The film plays with its own narration; stay quiet while it runs.

**12 · Next steps and thank you (0:20)**
What comes next: OCR for scanned PDFs, individual accounts with roles, an evaluation on OlivesoftBranch's real CVs, and monitoring with alerts. *(click)* Thank you. We are happy to take your questions.

## Demo

Slide 11 plays `assets/demo/olivesoft-demo.mp4` (1:45, narrated, music). It was built from a read-only capture of the production workspace; the source project is `videos/olivesoft-demo/` at the repo root.

**Plan B (live, 2:00)** if the video cannot play. Use an opportunity whose proposal is **already ready** (for example the Austria / ASFINAG lead).

| Time | Screen | Action / line |
|---|---|---|
| 0:00 | Opportunities | "A notice found this morning on TED, with its source link." |
| 0:25 | Opportunity detail → Requirements | Click a covered requirement: "Here is the sentence from our CV that proves it." |
| 1:00 | Research tab | "The facts about the buyer, each one with its source." |
| 1:20 | Proposals | PDF preview, then show the yellow fields. |
| 1:45 | PPTX download | Open it: "Fully editable." |


## Captures

Drop each capture into `assets/captures/` named after its ID (`N1.png`, `F2.jpg`, ...). The deck picks it up automatically, in front of any stand-in. **Blur before adding:** API keys, full webhook URLs, names and contact details in CVs.

| ID | Capture | Slide | Shown today |
|---|---|---|---|
| N1 | n8n canvas of 07_job_runner (full view) | 5 | rendered from the workflow export |
| N2 | n8n workflow list (all 29) | 5 | hidden until added |
| N3 | n8n executions list with green runs | 5 | hidden until added |
| N4 | n8n canvas of 14_opportunity_scan (4 sources visible) | 6 | rendered from the workflow export |
| N5 | n8n canvas of 05_requirement_matching | 7 | rendered from the workflow export |
| N6 | n8n canvas of 03_knowledge_ingestion | 7 | rendered from the workflow export |
| N7 | n8n canvas of 19_proposal_content (the 2 agents) | 8 | rendered from the workflow export |
| N8 | n8n canvas of 28_canva | 9 | rendered from the workflow export |
| S1 | Supabase Table Editor, rows of opportunity_candidates | 6 | hidden until added |
| S2 | Supabase requirement_judgments (status + quote) | 7 | hidden until added |
| S3 | Supabase Storage, the private buckets | 10 | hidden until added |
| S4 | Supabase Authentication → Policies, or Security Advisor with no alert | 10 | hidden; lock emblem shown |
| Q1 | Qdrant collection olivesoft_knowledge (points, 768 dims, cosine) | 7 | hidden until added |
| A2 | Opportunity detail, requirement matrix with a quote | 7 | live app capture, CV contact details blurred |
| A4 | Knowledge base (indexed documents) | 7 | live app capture |
| A5 | Proposals view with PDF preview and yellow fields | 8 | hidden until added |
| A6 | "Modifier dans Canva" button | 9 | hidden until added |
| F1 | A PPTX slide open in PowerPoint, with a yellow field | 8 | hidden; real generated pages shown |
| F2 | The same deck in the Canva editor | 9 | hidden; the 28_canva workflow shown |

Logos: drop `assets/logos/<name>.svg` (or .png) with these names and they replace the monograms: `ted`, `boamp`, `find-a-tender`, `haicop`, `nextjs`, `n8n`, `supabase`, `qdrant`, `gemini`, `deepseek`, `tavily`, `canva`.

## Sources for every claim

- 29 workflows, leases, checkpoints, three retries, polling every minute: `docs/ARCHITECTURE.md`, `n8n/workflows/07_job_runner.json`.
- Daily 06:00 scan, four sources, OCDS, HAICOP public pages, verbatim quotes only, notice treated as untrusted data: `docs/current-system.md`, `n8n/workflows/14_opportunity_scan.json`.
- hit@5 1.00, recall@5 0.83, 83.3% matching accuracy (configuration A, the production default): `docs/rag-evaluation.md`.
- Strategist and writer agents: `docs/current-system.md` (workflow 19).
- 60-second signed links: `expiresIn: 60` in `n8n/workflows/22_proposal_delivery.json` and `n8n/scripts/export_canva.js`.
- Row level security: `ENABLE ROW LEVEL SECURITY` in 14 migrations under `db/migrations/`.
