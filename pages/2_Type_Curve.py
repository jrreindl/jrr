from datetime import date

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from oilgas.app_state import ensure_project, require_active_prospect
from oilgas.decline_curve import DeclineSegment, eur, fit_arps, monthly_forecast
from oilgas.models import DeclineSegmentSpec, TypeCurve

st.set_page_config(page_title="Type Curve", page_icon="📉", layout="wide")
st.title("📉 Type Curve")

project = ensure_project()
prospect = require_active_prospect()
st.subheader(prospect.name)

if prospect.type_curve is None:
    prospect.type_curve = TypeCurve(name=f"{prospect.name} Type Curve")

tc = prospect.type_curve
tc.name = st.text_input("Type curve name", value=tc.name)
start_date_val = st.date_input(
    "First production month",
    value=date.fromisoformat(tc.start_date) if tc.start_date else date.today().replace(day=1),
)
tc.start_date = start_date_val.isoformat()

PHASES = [("oil", "Oil (bbl/d)"), ("gas", "Gas (Mcf/d)"), ("water", "Water (bbl/d)")]
DEFAULTS = {
    "oil": DeclineSegmentSpec(qi=300.0, di_nominal_annual=0.70, b=1.1, dmin_annual=0.06, econ_limit=5.0),
    "gas": DeclineSegmentSpec(qi=1200.0, di_nominal_annual=0.65, b=1.0, dmin_annual=0.06, econ_limit=20.0),
    "water": DeclineSegmentSpec(qi=200.0, di_nominal_annual=0.75, b=1.0, dmin_annual=0.08, econ_limit=1.0),
}

mode = st.radio("Build this type curve by:", ["Manual input", "Fit from historical production"], horizontal=True)

st.divider()
tabs = st.tabs([label for _, label in PHASES])
for (phase, label), tab in zip(PHASES, tabs):
    with tab:
        include = st.checkbox(f"Model {phase}", value=getattr(tc, phase) is not None, key=f"include_{phase}")
        if not include:
            setattr(tc, phase, None)
            continue
        current = getattr(tc, phase) or DEFAULTS[phase]

        if mode == "Manual input":
            c1, c2, c3 = st.columns(3)
            qi = c1.number_input(f"Initial rate qi ({label.split('(')[-1][:-1]})", min_value=0.0, value=current.qi, key=f"qi_{phase}")
            di = c2.number_input("Nominal annual decline Di (fraction)", min_value=0.01, max_value=5.0, value=current.di_nominal_annual, step=0.05, key=f"di_{phase}")
            b = c3.number_input("Hyperbolic exponent b (0=exp, 1=harmonic)", min_value=0.0, max_value=2.0, value=current.b, step=0.05, key=f"b_{phase}")
            c4, c5 = st.columns(2)
            dmin = c4.number_input("Terminal decline Dmin (fraction/yr)", min_value=0.0, max_value=1.0, value=current.dmin_annual, step=0.01, key=f"dmin_{phase}")
            econ = c5.number_input("Economic limit rate", min_value=0.0, value=current.econ_limit, key=f"econ_{phase}")
            setattr(tc, phase, DeclineSegmentSpec(qi=qi, di_nominal_annual=di, b=b, dmin_annual=dmin, econ_limit=econ))

        else:
            st.caption("Paste monthly production history: two columns, `date` (YYYY-MM-DD) and `rate`. One row per month.")
            sample = "date,rate\n2023-01-01,320\n2023-02-01,260\n2023-03-01,225\n2023-04-01,205\n2023-05-01,190"
            raw = st.text_area(f"{phase} history (CSV)", value="", height=140, key=f"hist_{phase}", placeholder=sample)
            dmin = st.number_input("Terminal decline Dmin (fraction/yr, applied forward)", min_value=0.0, max_value=1.0, value=current.dmin_annual, step=0.01, key=f"dmin_fit_{phase}")
            econ = st.number_input("Economic limit rate (applied forward)", min_value=0.0, value=current.econ_limit, key=f"econ_fit_{phase}")
            if raw.strip():
                try:
                    import io

                    hist = pd.read_csv(io.StringIO(raw))
                    hist["date"] = pd.to_datetime(hist["date"])
                    hist = hist.sort_values("date")
                    t0 = hist["date"].iloc[0]
                    hist["t_years"] = (hist["date"] - t0).dt.days / 365.25
                    fit = fit_arps(hist["t_years"].tolist(), hist["rate"].tolist())
                    st.success(f"Fit: qi={fit['qi']:.1f}, Di={fit['di_nominal_annual']:.2f}, b={fit['b']:.2f}")
                    setattr(tc, phase, DeclineSegmentSpec(qi=fit["qi"], di_nominal_annual=fit["di_nominal_annual"], b=fit["b"], dmin_annual=dmin, econ_limit=econ))

                    fig = go.Figure()
                    fig.add_trace(go.Scatter(x=hist["date"], y=hist["rate"], mode="markers", name="History"))
                    seg = getattr(tc, phase)
                    fc = monthly_forecast(DeclineSegment(**seg.__dict__), t0.date(), 60)
                    fig.add_trace(go.Scatter(x=pd.to_datetime(fc["date"]), y=fc["avg_rate"], mode="lines", name="Fitted forecast"))
                    fig.update_yaxes(type="log", title="Rate (log scale)")
                    fig.update_layout(height=350, margin=dict(t=20, b=20))
                    st.plotly_chart(fig, width='stretch')
                except Exception as e:
                    st.error(f"Couldn't fit curve: {e}")

st.divider()
st.subheader("Forecast preview")
n_preview = st.slider("Months to preview", min_value=12, max_value=480, value=240, step=12)

fig = go.Figure()
summary_rows = []
for phase, label in PHASES:
    seg_spec = getattr(tc, phase)
    seg = DeclineSegment(**seg_spec.__dict__) if seg_spec else None
    fc = monthly_forecast(seg, start_date_val, n_preview)
    if seg is not None:
        fig.add_trace(go.Scatter(x=fc["date"], y=fc["avg_rate"], mode="lines", name=label))
    total_eur = eur(seg, start_date_val, n_preview)
    summary_rows.append({"Phase": label, "EUR (over preview window)": f"{total_eur:,.0f}"})

fig.update_yaxes(type="log", title="Average monthly rate (log scale)")
fig.update_xaxes(title="Date")
fig.update_layout(height=420, margin=dict(t=20, b=20), legend=dict(orientation="h"))
st.plotly_chart(fig, width='stretch')
st.table(pd.DataFrame(summary_rows))

st.caption("Next: go to **Economics** to apply fiscal terms, pricing, opex and capex to this type curve.")
