# Oil & Gas Prospect Economics

A fully offline tool for building type curves from prospects and running
discounted cash flow (DCF) economics — capex, opex, taxes, pricing, working
interest / net revenue interest, NPV at multiple discount rates, IRR, and
payout.

No internet connection, account, or external service is required once the
Python dependencies are installed. All project data is saved as plain JSON
files on your own disk under `data/projects/`.

## Quickstart

```bash
pip install -r requirements.txt
streamlit run app.py
```

This opens the app in your browser at `http://localhost:8501`. Everything
runs locally — the browser is just the UI, there's no server-side hosting
or network calls once the page has loaded and the Python packages are
installed.

## Workflow

1. **Prospects** — add a prospect (name, basin, county/state, notes).
2. **Type Curve** — build an Arps decline curve (oil/gas/water) for the
   prospect, either by typing in `qi`, `Di`, `b`, terminal decline, and
   economic limit directly, or by pasting historical monthly production
   and letting the app fit a hyperbolic decline to it.
3. **Economics** — set working interest / net revenue interest, a price
   deck (with differentials and escalation), operating expenses (fixed
   LOE, variable $/bbl or $/Mcf, gathering/processing, transportation),
   severance and ad valorem taxes, and one or more capex line items. Run
   the DCF to get NPV at several discount rates, IRR, payout, EUR, and a
   full monthly/annual cash flow you can export to CSV.
4. **Portfolio Summary** — see every prospect you've built ranked by
   NPV10, with combined portfolio cash flow.

Use **Save project** on the Home page to write everything to a JSON file
under `data/projects/`; use **Load** to bring it back in a later session,
or **import** a project JSON file someone else sent you.

## Project layout

```
app.py                   Home page: create/save/load projects
pages/
  1_Prospects.py          Add/select/edit prospects
  2_Type_Curve.py         Build Arps decline curves (manual or fit-to-history)
  3_Economics.py          Fiscal terms, pricing, opex, capex, run the DCF
  4_Portfolio_Summary.py  Cross-prospect NPV/IRR ranking and combined cash flow
oilgas/
  decline_curve.py        Arps hyperbolic/exponential decline math + curve fitting
  economics.py             The DCF engine (revenue, taxes, opex, capex, NPV, IRR)
  models.py                 Data model (Project, Prospect, TypeCurve, etc.)
  storage.py                 Save/load projects as JSON
  app_state.py               Shared Streamlit session-state helpers
data/projects/              Your saved project JSON files (not committed)
tests/                      pytest unit tests for the decline curve and DCF math
```

## Conventions used in the economics engine

- **Revenue** is taken at **Net Revenue Interest (NRI)** — your share of
  the well's revenue after the royalty burden.
- **Opex and capex** are taken at **Working Interest (WI)** — your share
  of the well's costs, since WI bears costs regardless of royalty. Capex
  line items can be entered as a gross (100%) AFE amount (WI% applied
  automatically) or as an amount already net to your WI.
- **Severance/ad valorem taxes** are computed on NRI revenue (the revenue
  you actually receive).
- **Decline curves** use the standard Arps hyperbolic model with a
  hyperbolic-to-exponential switch at a terminal decline rate (`Dmin`),
  which is the convention used throughout upstream reserves and
  economics work, plus an economic limit rate below which production is
  truncated.
- **Discounting** uses actual calendar-month timing with mid-period
  convention (cash assumed to arrive at the midpoint of each month).

## Running the tests

```bash
pip install -r requirements.txt
pytest
```
