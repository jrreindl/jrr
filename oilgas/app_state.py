"""Shared Streamlit session-state helpers used by every page."""
from __future__ import annotations

import streamlit as st

from .models import Project

PROJECT_KEY = "project"
PROJECT_PATH_KEY = "project_path"
ACTIVE_PROSPECT_KEY = "active_prospect_id"


def ensure_project() -> Project:
    if PROJECT_KEY not in st.session_state:
        st.session_state[PROJECT_KEY] = Project(name="New Project")
        st.session_state[PROJECT_PATH_KEY] = None
    return st.session_state[PROJECT_KEY]


def get_active_prospect():
    project = ensure_project()
    active_id = st.session_state.get(ACTIVE_PROSPECT_KEY)
    if not active_id:
        return None
    return project.get_prospect(active_id)


def require_active_prospect():
    """For pages that need a selected prospect: shows guidance and stops if none."""
    prospect = get_active_prospect()
    if prospect is None:
        st.info("Select a prospect on the **Prospects** page first.")
        st.stop()
    return prospect
