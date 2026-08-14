# magicpod-mcp-server

> [!IMPORTANT]
> **This repository is deprecated** in favor of the new [MagicPod MCP Server](https://support.magic-pod.com/hc/en-us/articles/46186888063769-MagicPod-MCP-Server). It will only receive bug fixes and security fixes for a limited support period, and will be archived once that period ends. The exact end date has not been finalized yet and will be announced here soon.

Please migrate to the new MagicPod MCP Server — see the [setup instructions](https://support.magic-pod.com/hc/en-us/articles/46186888063769-MagicPod-MCP-Server) for details.

An MCP (Model Context Protocol) server that integrates your AI agents with MagicPod

## Getting Started

[Cursor](https://cursor.com), [Claude](https://claude.ai/), and many other AI-powered coding tools support MCP servers. You can refer to their official documents on how to configure MCP servers. For example, if you use Claude Desktop, what you have to do to integrate with MagicPod is only to add the following lines in your `claude_desktop_config.json`. 

### MacOS / Linux

```json
{
  "mcpServers": {
    "magicpod-mcp-server": {
      "command": "npx",
      "args": ["-y", "magicpod-mcp-server", "--api-token=YOUR-API-TOKEN"]
    }
  }
}
```

### Windows

```json
{
  "mcpServers": {
    "magicpod-mcp-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "magicpod-mcp-server", "--api-token=YOUR-API-TOKEN"]
    }
  }
}
```

Make sure that you replace `YOUR-API-TOKEN` with your actual MagicPod API token. You can retrieve it on the [integrations](https://app.magicpod.com/accounts/api-token/) screen.

<img width="1015" alt="retrieve API token" src="https://github.com/user-attachments/assets/77931857-284d-4d7f-968b-c6a000f518c1" />

### Using an environment variable instead of `--api-token`

Passing the token via `--api-token` puts it in plain text in the process's argument list (visible via `ps`, `/proc/<pid>/cmdline`, monitoring tools, etc.), which can be a concern on shared or monitored hosts. As an alternative, you can set the `MAGICPOD_API_TOKEN` environment variable instead, using the `env` field supported by most MCP clients:

```json
{
  "mcpServers": {
    "magicpod-mcp-server": {
      "command": "npx",
      "args": ["-y", "magicpod-mcp-server"],
      "env": {
        "MAGICPOD_API_TOKEN": "YOUR-API-TOKEN"
      }
    }
  }
}
```

If both `--api-token` and `MAGICPOD_API_TOKEN` are set, `--api-token` takes precedence.

## Development

Build

```
npm run build
```

## Configuration

[Configuring Tool Permissions in Claude Code](./docs/claude-code.md)
