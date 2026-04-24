## Configuring Tool Permissions in Claude Code

When using magicpod-mcp-server with [Claude Code](https://claude.ai/code), you can control which tools run automatically and which require confirmation before executing.

### How Claude Code handles tool permissions

Claude Code checks `permissions.allow` in `.claude/settings.json` before running any tool:

| Setting              | Behavior                                |
| -------------------- | --------------------------------------- |
| Listed in `allow`    | Runs automatically without prompting    |
| Not listed (default) | Prompts for confirmation before running |
| Listed in `deny`     | Always blocked                          |

### Tool name format

MagicPod MCP tools follow this naming convention in Claude Code:

```
mcp__magicpod-mcp-server__API-{operationId}
```

For example, the `get_projects` operation becomes:

```
mcp__magicpod-mcp-server__API-get_projects
```

The following tools have custom names not derived from operationId:

- `mcp__magicpod-mcp-server__search-magicpod-articles`
- `mcp__magicpod-mcp-server__read-magicpod-article`
- `mcp__magicpod-mcp-server__API-v1_0_upload-file_create`
- `mcp__magicpod-mcp-server__API-v1_0_upload-data-patterns_create`

### Discovering available operationIds

Run the following command to list all operationIds from the MagicPod OpenAPI spec:

```bash
curl -s -H "Authorization: Token YOUR-API-TOKEN" \
  "https://app.magicpod.com/api/v1.0/doc/?format=openapi" \
  | jq '[.paths | to_entries[] | .value | to_entries[] | .value.operationId? ] | sort'
```

Example output:

```json
[
  "create_autopilot_tasks",
  "delete_file",
  "delete_users",
  "download_magicpod_api_client",
  "download_magicpod_client",
  "download_mpc",
  "get_available_cloud_device",
  "get_batch_run",
  "get_batch_runs",
  "get_batch_runs_screenshots",
  "get_batch_runs_zipped_screenshots",
  "get_batch_task_result",
  "get_device_log",
  "get_health_score",
  "get_organization_members",
  "get_project_batch_run_schedules",
  "get_project_members",
  "get_projects",
  "get_shared_step",
  "get_shared_steps",
  "get_test_case",
  "get_test_cases",
  "get_test_engine_log",
  "get_test_run_log",
  "list_files",
  "remove_member_from_organization",
  "start_batch_run",
  "start_cross_batch_run",
  "upload_data_pattern_csv",
  "upload_file"
]
```

### Example configuration

The following `.claude/settings.json` configuration allows read-only tools to run automatically, while requiring confirmation for write and destructive operations:

```json
{
  "permissions": {
    "allow": [
      "mcp__magicpod-mcp-server__API-get_available_cloud_device",
      "mcp__magicpod-mcp-server__API-get_batch_run",
      "mcp__magicpod-mcp-server__API-get_batch_runs",
      "mcp__magicpod-mcp-server__API-get_batch_task_result",
      "mcp__magicpod-mcp-server__API-get_device_log",
      "mcp__magicpod-mcp-server__API-get_health_score",
      "mcp__magicpod-mcp-server__API-get_organization_members",
      "mcp__magicpod-mcp-server__API-get_project_batch_run_schedules",
      "mcp__magicpod-mcp-server__API-get_project_members",
      "mcp__magicpod-mcp-server__API-get_projects",
      "mcp__magicpod-mcp-server__API-get_shared_step",
      "mcp__magicpod-mcp-server__API-get_shared_steps",
      "mcp__magicpod-mcp-server__API-get_test_case",
      "mcp__magicpod-mcp-server__API-get_test_cases",
      "mcp__magicpod-mcp-server__API-get_test_engine_log",
      "mcp__magicpod-mcp-server__API-get_test_run_log",
      "mcp__magicpod-mcp-server__API-list_files",
      "mcp__magicpod-mcp-server__search-magicpod-articles",
      "mcp__magicpod-mcp-server__read-magicpod-article"
    ]
  }
}
```

Tools not listed above (e.g. `API-start_batch_run`, `API-delete_file`, `API-create_autopilot_tasks`) will prompt for confirmation before running.
