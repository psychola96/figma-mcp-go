# figma-mcp-go

> A **zero-cost, unlimited** Figma MCP server — no API key, no rate limits, just a single Go binary.

Works with Cursor, Claude, GitHub Copilot, and any MCP-compatible AI tool.

---

## Why this exists

Most Figma MCP servers rely on the **Figma REST API**.

That sounds fine… until you hit this:

| Plan | Limit |
|------|-------|
| Starter / View / Collab | **6 tool calls/month** |
| Pro / Org (Dev seat) | 200 tool calls/day |
| Enterprise | 600 tool calls/day |

If you're experimenting with AI tools, you’ll burn through that in minutes.

I didn’t have enough money to pay for higher limits.
So I built something that **doesn’t use the API at all**.

## Setup

Watch the video:

[![Watch the video](https://img.youtube.com/vi/DjqyU0GKv9k/sddefault.jpg)](https://youtu.be/DjqyU0GKv9k)

### 1. Configure your AI tool

.vscode/mcp.json
```json
{
	"servers": {
		"figma-mcp-go": {
			"type": "stdio",
			"command": "npx",
			"args": [
				"-y",
				"@vkhanhqui/figma-mcp-go"
			]
		}
	}
}
```

.mcp.json
```json
{
  "mcpServers": {
    "figma-mcp-go": {
      "command": "npx",
      "args": ["-y", "@vkhanhqui/figma-mcp-go"]
    }
  }
}
```

### 2. Install the Figma plugin

1. In Figma Desktop: **Plugins → Development → Import plugin from manifest**
2. Select `manifest.json` from the [`figma-mcp-go2-plugin.zip`](https://github.com/psychola96/figma-mcp-go/releases)
3. Run the plugin inside any Figma file

### 3. figma-mcp-go2 test and release build

This repository currently contains the `figma-mcp-go2` plugin variant. Its Figma plugin ID is `figma-mcp-go2`, so it can be installed alongside the original `figma-mcp-go` plugin.

For local testing, import this manifest in Figma Desktop:

```text
dist/figma-mcp-go2-plugin/manifest.json
```

The release workflow packages the plugin as `figma-mcp-go2-plugin.zip` and uploads it to the GitHub Release when a `v*` tag is pushed.

## Changes in figma-mcp-go2

`figma-mcp-go2` keeps the original MCP tools and local WebSocket connection, and adds richer node style data to `get_node`:

- Gradient fills and strokes are preserved instead of being filtered out. The response includes the paint type, gradient stops, stop colors, stop opacity, and gradient handle positions.
- Text nodes with mixed formatting expose `styles.textRanges`. Each range uses zero-based `start` and exclusive `end` offsets and includes the font family, font style, font size, fills, text decoration, and text case for that range.
- The richer serialization is enabled for `get_node`, including its returned child nodes. Other existing tools keep their previous response shape.

For example, a gradient button can now include:

```json
{
  "type": "GRADIENT_LINEAR",
  "gradientStops": [
    { "position": 0, "color": "#ff9a15", "opacity": 1 },
    { "position": 1, "color": "#ff5f11", "opacity": 1 }
  ],
  "gradientHandlePositions": [
    { "x": 0.1, "y": 0.2 },
    { "x": 0.9, "y": 0.8 }
  ]
}
```

Mixed text can now include ranges such as:

```json
{
  "textRanges": [
    {
      "start": 0,
      "end": 2,
      "fontFamily": "Inter",
      "fontSize": 14,
      "fills": [{ "type": "SOLID", "color": "#666666", "opacity": 1 }]
    },
    {
      "start": 2,
      "end": 10,
      "fontFamily": "Inter",
      "fontSize": 14,
      "fills": [{ "type": "SOLID", "color": "#000000", "opacity": 1 }]
    }
  ]
}
```

The existing npm package remains `@vkhanhqui/figma-mcp-go`; the `figma-mcp-go2` name identifies the separate Figma plugin variant.

---

## Available tools

### Document & Selection

| Tool | Description |
|------|-------------|
| `get_document` | Full current page tree |
| `get_metadata` | File name, pages, current page |
| `get_selection` | Currently selected nodes |
| `get_node` | Single node by ID |
| `get_nodes_info` | Multiple nodes by ID |
| `get_design_context` | Depth-limited tree — token-efficient for large files |
| `scan_text_nodes` | All text nodes in a subtree |
| `scan_nodes_by_types` | Nodes matching given type list |

### Styles & Variables

| Tool | Description |
|------|-------------|
| `get_styles` | Paint, text, effect, and grid styles |
| `get_variable_defs` | Variable collections and values |
| `get_local_components` | All components in the file |
| `get_annotations` | Dev-mode annotations |

### Export

| Tool | Description |
|------|-------------|
| `get_screenshot` | Base64 image export of any node |
| `save_screenshots` | Export images to disk (server-side, no API call) |

---

## Contributing

Issues and PRs are welcome.

## References

- [magic-spells/figma-mcp-bridge](https://github.com/magic-spells/figma-mcp-bridge)
- [grab/cursor-talk-to-figma-mcp](https://github.com/grab/cursor-talk-to-figma-mcp)
- [gethopp/figma-mcp-bridge](https://github.com/gethopp/figma-mcp-bridge)
