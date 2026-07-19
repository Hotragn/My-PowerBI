# AI Model Frontier

A Power BI custom visual for comparing AI models on cost vs. capability. It plots
every model as a point, automatically computes the Pareto efficiency frontier
(the models that give you the best capability for their cost, i.e. no other
model is both cheaper *and* better), and draws it as a step line so the
frontier is easy to read at a glance.

Most scatter/quadrant visuals in the Power BI marketplace leave you to eyeball
which points matter. This one computes the frontier for you and, if a release
date field is supplied, lets you scrub or play through time to see how the
frontier has moved as new models shipped.

## Why this exists

Comparing LLMs by cost and benchmark score is a recurring analysis (see any
"cost vs. quality" chart in an AI vendor comparison deck), but it's usually
built by hand in a spreadsheet or a static blog chart. Wiring it up as a
reusable Power BI visual means the frontier recalculates automatically as the
underlying data (new models, updated pricing) changes.

## Data roles

| Role | Type | Required | Notes |
|---|---|---|---|
| Model | Grouping | Yes | One point per value, e.g. model name |
| Cost | Measure | Yes | Lower is better (e.g. $ / million tokens) |
| Capability score | Measure | Yes | Higher is better (e.g. a benchmark score) |
| Release date | Measure | No | Enables the timeline scrubber / play button |

## Formatting options

- **Data points** – colors for frontier vs. dominated models, point radius, toggle labels.
- **Efficiency frontier** – toggle the frontier line, its color, toggle the shaded
  "dominated" region, and its opacity.

## Try it with sample data

`sample-data/ai-model-frontier-sample.csv` has an illustrative set of publicly
known LLM releases with an approximate cost-per-million-tokens figure and a
made-up-but-plausible capability score for demo purposes — pricing and
benchmark numbers change constantly, so treat the numbers as placeholders and
swap in your own sourced figures for real analysis.

To try the visual:

1. Import `sample-data/ai-model-frontier-sample.csv` into Power BI Desktop.
2. `npm install` inside `ai-model-frontier-visual/`, then `npx pbiviz start`
   to run it in developer mode (requires the Power BI visual developer tools
   and a certificate trusted in Power BI Desktop — see Microsoft's
   [custom visual developer docs](https://learn.microsoft.com/power-bi/developer/visuals/custom-visual-develop-tutorial)).
3. Add the developer visual to a report, then map **Model** → `Model`,
   **Cost** → `CostPerMillionTokens`, **Capability score** → `BenchmarkScore`,
   and optionally **Release date** → `ReleaseDate`.

## Project layout

```
ai-model-frontier-visual/
  src/
    visual.ts       # rendering, data parsing, timeline playback
    frontier.ts      # Pareto frontier calculation
    settings.ts      # formatting pane options
  style/visual.less
  capabilities.json
  sample-data/
```

## License

MIT
