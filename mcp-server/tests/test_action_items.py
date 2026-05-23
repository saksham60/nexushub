from nexushub_mcp.tools.teams_tools import extract_action_items_from_text


def test_extract_action_items_owner_and_due_date() -> None:
    text = "Alex will follow up with procurement by Friday. Owner: Priya needs to review the risk note by tomorrow."
    items = extract_action_items_from_text(text)

    assert len(items) == 2
    assert items[0]["owner"] == "Alex"
    assert items[0]["dueDate"].lower() == "friday"
    assert items[0]["confidence"] >= 0.8
    assert items[1]["owner"] == "Priya"
    assert items[1]["dueDate"].lower() == "tomorrow"
