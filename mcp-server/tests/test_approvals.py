from nexushub_mcp.approvals.approval_store import InMemoryApprovalStore


def test_approval_store_create_list_execute() -> None:
    store = InMemoryApprovalStore()
    record = store.create(
        action_type="mail.create_draft_reply",
        title="Draft reply",
        payload={"to": "alex@example.com"},
        preview="Hi Alex",
    )

    pending = store.list_pending()
    assert pending[0].approval_id == record.approval_id

    executed = store.execute(approval_id=record.approval_id, approved=True, simulated=True)
    assert executed is not None
    assert executed.status == "executed"
    assert executed.result is not None
    assert executed.result["simulated"] is True
