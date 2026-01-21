---
description: Fixes a bug described in a GitHub Issue or Google Sheet link/text.
---

This workflow guides the agent to fix a bug based on a provided link (GitHub Issue/Google Sheet) or text description.

1.  **Acquire Bug Details**:
    -   **Input**: The user provides a link, text, or **a local file path**.
    -   **Action**: Try to read the content.
        -   If it is a **link** (e.g., `https://github.com/...` or `docs.google.com/...`):
            -   Use `read_url_content` or `browser_subagent` to fetch the description.
            -   **Google Sheets Constraint**: If the link is a Google Sheet, **you MUST strictly adhere to the specific tab (Sheet associated with the `gid` in the URL)**. Do NOT switch to other tabs (e.g., avoid switching to "Slide _buglist" if the link points to "Toán học _ so sánh"). Only read the content of the currently active tab.
            -   **Image/Screenshot Detection (CRITICAL)**:
                -   Check for attached images, screenshots, or video links (especially in Google Sheets "Image/Screenshot" columns).
                -   **Action**: If an image is found (e.g., a Google Drive chip), use `browser_subagent` to **open the image link** and **describe the content** detailedly.
                -   **Goal**: Understand the bug visually (e.g., "The screenshot shows error X," "The UI alignment is off in header Y").
            -   **Video Limitation**:
                -   If the link is a **Video** (e.g., Drive video, YouTube, Loom):
                -   **Action**: I CANNOT directly watch videos. **Ignore the video content** and proceed with the fix based **solely on the text description/requirements** provided in the sheet/issue.
                -   **Do not block**: Do not stop to ask the user for a summary. Assume the text description is sufficient.
            -   **Note**: If the link is **private** (requires login - e.g. Private GitHub), the tool WILL fail.
                -   **Recommendation**: Ask the user to:
                    1.  **Print to PDF** or **Save as HTML** and provide the local file path.
                    2.  **Take a screenshot** of the issue and provide the file path.
        -   If it is a **Local File** (PDF, Image, HTML):
            -   Use `view_file` (for text/code) or `browser_subagent` (for PDF/HTML/Images) to read the content.
            -   Extract the description and visual evidence just like a web link.
        -   **Fallback**: If reading fails, explicitly ask the user to copy and paste the text.
    -   **Goal**: Obtain a clear text description of the bug AND visual evidence (if available) to understand reproduction steps and expected outcome.

2.  **Analyze & Locate**:
    -   Based on the description, identify the relevant code files in the workspace.
    -   Use `grep_search` or `find_by_name` to locate the components mentioned.
    -   **Context**: Read the file contents (`view_file`) to understand the current implementation.

3.  **Formulate Fix Strategy (The "Skill")**:
    -   **Use Visual Evidence**: detailedly analyze the screenshots/images found in Step 1. Compare them with the current codebase/UI to confirm the issue.
    -   Determine if the issue is **Visual/UI** or **Logic/Functional**.
    -   **For UI Bugs**:
        -   Refer to the principles in `smart-ui-refiner` (check `.agent/workflows/smart-ui-refiner.md` if available).
        -   Focus on spacing, alignment, responsiveness, and aesthetics as shown in the screenshots.
    -   **For Logic Bugs**:
        -   Trace the execution flow.
        -   Identify where the logic diverges from requirements (or from the screenshot's data).
    -   **Constraint**: The fix MUST be isolated. Do not refactor unrelated code. preserve existing functionality.

4.  **Implement Fix**:
    -   Create an `implementation_plan.md` if the change is complex.
    -   Apply changes using `replace_file_content` (for single blocks) or `multi_replace_file_content`.

5.  **Verify**:
    -   Review the changes to ensure no side effects.
    -   If possible, run the local build or assume the role of the user to verify.
    -   Notify the user that the fix is applied and ask them to verify.
