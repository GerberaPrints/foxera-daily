# 04 — AI AGENT ARCHITECTURE

## 1. Mission

Build an evidence-first research agent that continuously turns current product, market, competitor, promotion, and creative information into structured decisions for GritFell.

The agent is not an idea generator alone. It is a research and decision system.

---

## 2. Required modules

### Module A — Source discovery

Search:

- Official competitor homepage.
- Collection pages.
- Product pages.
- Sale pages.
- FAQ, shipping, returns, rewards, and loyalty.
- Email/SMS signup offers.
- Meta Ad Library and public social creative.
- YouTube and TikTok brand channels.
- Retailer listings only when official data is absent.
- Industry reports and government sources.

### Module B — Snapshot and extraction

Capture:

- URL and page title.
- Observation date.
- Product category and product name.
- Current and regular price.
- Promotion and threshold.
- Shipping threshold.
- Materials and verified product claims.
- Reviews count when visible.
- Creative headline, hook, angle, CTA.
- Visual style.
- Audience cue.
- Collection name.
- Product status: new, bestseller, sale, sold out.

### Module C — Evidence normalization

Normalize:

- Currency to USD.
- Product type names.
- Regular/current price.
- Discount type.
- Promotion structure.
- Source authority.
- Freshness.
- Evidence label.
- Confidence score.

### Module D — Competitor strategy inference

Infer, but label as `INFERRED`:

- Price position.
- Primary customer.
- Offer strategy.
- Merchandising structure.
- Creative territories.
- Funnel stage.
- Trust mechanism.
- Retention mechanism.
- GritFell opportunity.
- GritFell risk.

### Module E — Creative intelligence

Store each creative unit as:

`brand → product → format → hook → angle → proof → CTA → visual grammar → audience → funnel stage`

Do not store only screenshots. Extract the logic.

### Module F — Opportunity engine

Generate opportunities only after checking:

1. Market evidence.
2. Competitor precedent.
3. GritFell differentiation.
4. Production feasibility.
5. Brand filter.
6. Freshness.
7. Risk and kill criteria.

### Module G — Output

Produce:

- Daily change log.
- Weekly competitor brief.
- Monthly price/promo map.
- Creative swipe analysis.
- Product opportunity shortlist.
- Campaign hook bank.
- Explicit “do not act” section for weak evidence.

---

## 3. Evidence score

Score each factual record:

| Dimension | Score |
|---|---:|
| Official source authority | 0–3 |
| Recency | 0–3 |
| Direct observation | 0–3 |
| Cross-source support | 0–2 |

Maximum: 11.

Interpretation:

- 9–11: high confidence.
- 6–8: usable with caveat.
- 3–5: exploratory only.
- 0–2: reject.

No product recommendation may use evidence below 6 without explicit review.

---

## 4. Freshness schedule

| Data | Re-check |
|---|---|
| Price, sale, promo, shipping | Weekly |
| New products and collections | Weekly |
| Paid/social creative | Daily or 3× weekly |
| Bestseller labels | Weekly |
| Product claims/materials | Monthly |
| Reviews and UGC | Monthly |
| Market reports | Quarterly |
| Brand positioning/about pages | Quarterly |
| Regulations or platform policies | At execution |

---

## 5. Search query library

### Product and price

- `[brand] [category] price`
- `site:[domain] collections [category]`
- `site:[domain] products [species or pursuit]`
- `[brand] sale free shipping returns`
- `[brand] new arrivals best sellers`

### Promotion

- `[brand] buy more save more`
- `[brand] free gift`
- `[brand] first order discount`
- `[brand] rewards loyalty`
- `[brand] email signup offer`

### Creative

- `[brand] [product] Instagram`
- `[brand] [collection] campaign`
- `[brand] YouTube [pursuit]`
- `[brand] Meta Ad Library`
- `[brand] TikTok [species]`

### Market

- `outdoor apparel participation trends`
- `fishing participation annual report`
- `outdoor retail sales apparel accessories`
- `[pursuit] season dates official`
- `[species] participation market`

---

## 6. Agent workflow

```text
REQUEST
  ↓
Resolve category, geography, customer, date, and business decision
  ↓
Search official sources first
  ↓
Capture snapshots and evidence
  ↓
Normalize records
  ↓
Separate observation from inference
  ↓
Compare against GritFell context and brand filter
  ↓
Score opportunity
  ↓
Return recommendation + evidence + risks + next test
```

---

## 7. Opportunity score

Score 1–5 on:

- Demand evidence.
- GritFell brand fit.
- Differentiation.
- Production feasibility.
- Giftability.
- Cross-product scalability.
- Margin potential.
- Seasonal timing.
- Creative richness.

Reject when brand fit or evidence is below 3.

---

## 8. Anti-hallucination rules

- Never invent competitor revenue, bestseller rank, conversion rate, customer demographics, or ad spend.
- Never infer a sale price from a struck-through display without reading the page carefully.
- Never treat a search snippet as permanent truth.
- Never quote a competitor beyond a short necessary phrase.
- Never use internal projections as market facts.
- Never claim a product benefit not present in verified GritFell product data.
- Always include `observed_at`.
- Always state when data may be stale.
- When sources conflict, show both and explain the conflict.
- When evidence is insufficient, return “insufficient evidence,” not a confident idea.

---

## 9. Recommended file organization for Claude Desktop

```text
/gritfell-agent/
  /brand/
    master_context.md
    brand_filter.json
    product_specs.json
  /competitors/
    competitor_profiles.jsonl
    price_snapshots.jsonl
    promotion_snapshots.jsonl
    creative_units.jsonl
  /market/
    reports.jsonl
    seasonal_events.jsonl
  /outputs/
    weekly_brief.md
    opportunity_queue.jsonl
    rejected_opportunities.jsonl
  /prompts/
    system_prompt.md
    research_prompt.md
    creative_analysis_prompt.md
```

---

## 10. Build discipline

- Separate exploration from execution.
- Keep new data in independent files; do not bloat the core agent.
- One verified increment per problem.
- A feature must solve a revenue bottleneck, not merely be “nice to have.”
- Every parser or automation should have a self-test.
- Verify with logs and stored snapshots, not the model’s statement that it worked.
