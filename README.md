# magic-pod-mcp-server

An MCP (Model Context Protocol) server that integrates your AI agents with MagicPod

## Getting Started

[Cursor](https://cursor.com), [Claude](https://claude.ai/), and many other AI-powered coding tools support MCP servers. You can refer to their official documents on how to configure MCP servers. For example, if you use Claude Desktop, what you have to do to integrate with MagicPod is only to add the following lines in your `claude_desktop_config.json`. 

### MacOS / Linux

```json
{
  "mcpServers": {
    "magic-pod-mcp-server": {
      "command": "npx",
      "args": ["-y", "magic-pod-mcp-server", "--api-token=YOUR-API-TOKEN"]
    }
  }
}
```

### Windows

```json
{
  "mcpServers": {
    "magic-pod-mcp-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "magic-pod-mcp-server", "--api-token=YOUR-API-TOKEN"]
    }
  }
}
```

Make sure that you replace `YOUR-API-TOKEN` with your actual MagicPod API token. You can retrieve it on the [integrations](https://app.magicpod.com/accounts/api-token/) screen.

<img width="1015" alt="retrieve API token" src="https://github.com/user-attachments/assets/77931857-284d-4d7f-968b-c6a000f518c1" />


## Development

Build

```
npm run build
```
