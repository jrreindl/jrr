"""Home page: create or load a project, save your work.

A "Project" is a portfolio of prospects, saved as a single JSON file under
data/projects/. Everything runs locally - no network calls, no accounts.
"""
import streamlit as st

from oilgas.app_state import PROJECT_KEY, PROJECT_PATH_KEY, ensure_project
from oilgas.models import Project
from oilgas.storage import list_saved_projects, load_project, save_project

st.set_page_config(page_title="O&G Prospect Economics", page_icon="🛢️", layout="wide")

st.title("🛢️ Oil & Gas Prospect Economics")
st.caption("Type curves → discounted cash flow, fully offline. Data is saved as JSON files on your own disk.")

project = ensure_project()

col1, col2 = st.columns(2)

with col1:
    st.subheader("Current project")
    new_name = st.text_input("Project name", value=project.name)
    if new_name != project.name:
        project.name = new_name

    st.metric("Prospects in project", len(project.prospects))

    if st.button("💾 Save project", type="primary"):
        path = save_project(project)
        st.session_state[PROJECT_PATH_KEY] = str(path)
        st.success(f"Saved to `{path}`")

    saved_path = st.session_state.get(PROJECT_PATH_KEY)
    if saved_path:
        st.caption(f"Last saved: `{saved_path}`")

with col2:
    st.subheader("Load or start over")
    saved = list_saved_projects()
    if saved:
        import json

        labels = {}
        for path in saved:
            try:
                display_name = json.loads(path.read_text()).get("name", path.stem)
            except (json.JSONDecodeError, OSError):
                display_name = path.stem
            labels[f"{display_name}  ({path.name})"] = path

        choice = st.selectbox("Saved projects", options=["-- select --"] + list(labels.keys()))
        if choice != "-- select --":
            match = labels[choice]
            if st.button(f"Load '{choice}'"):
                loaded = load_project(match)
                st.session_state[PROJECT_KEY] = loaded
                st.session_state[PROJECT_PATH_KEY] = str(match)
                st.rerun()
    else:
        st.caption("No saved projects yet in `data/projects/`.")

    uploaded = st.file_uploader("...or import a project JSON file", type="json")
    if uploaded is not None:
        import json

        from oilgas.storage import project_from_dict

        loaded = project_from_dict(json.loads(uploaded.read()))
        st.session_state[PROJECT_KEY] = loaded
        st.session_state[PROJECT_PATH_KEY] = None
        st.success(f"Imported project '{loaded.name}' with {len(loaded.prospects)} prospect(s).")
        st.rerun()

    st.divider()
    if st.button("🆕 Start a blank project"):
        st.session_state[PROJECT_KEY] = Project(name="New Project")
        st.session_state[PROJECT_PATH_KEY] = None
        st.rerun()

st.divider()
st.markdown(
    """
    ### Workflow
    1. **Prospects** – add a prospect (name, location, spud/first-production date).
    2. **Type Curve** – build an Arps decline curve for oil/gas/water, manually or fit to historical data.
    3. **Economics** – set working interest/NRI, price deck, opex, capex and taxes, then run the DCF.
    4. **Portfolio Summary** – compare NPV/IRR across every prospect you've run.

    Use the sidebar to navigate between pages.
    """
)

if project.prospects:
    st.subheader("Prospects in this project")
    st.dataframe(
        [
            {
                "Name": p.name,
                "Basin": p.basin,
                "County/State": p.county_state,
                "Type curve set": "Yes" if p.type_curve else "No",
                "Last NPV10": (p.last_results_summary or {}).get("npv10"),
                "Last IRR %": (p.last_results_summary or {}).get("irr_pct"),
            }
            for p in project.prospects
        ],
        width='stretch',
        hide_index=True,
    )
