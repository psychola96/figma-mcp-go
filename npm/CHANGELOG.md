# Changelog

This file records the major changes in this fork compared with the original `figma-mcp-go` project, based on the Git commit history.

## [v2.0.5] - 2026-11-05

- update README and add CHANGELOG.

## [v2.0.3] - 2026-10-30

- Added automatic MCP client configuration injection.
- The `setup` command can now configure Codex automatically and generate configuration files for Claude Code, DeepSeek Harness, and generic MCP clients.
- When the Claude Code CLI is installed, the setup process attempts to register the `figma-mcp-go2` MCP server automatically.
- Added an npm package README and improved post-installation messages.

## [v2.0.2] - 2026-10-28

- Renamed the npm package and command to `figma-mcp-go2`.
- Added the `figma-mcp-go2 setup` command to download the plugin and generate an MCP configuration example.
- Updated the release URLs and configuration names for the npm package, binary, and plugin.
- Documented that the `figma-mcp-go2` plugin can be installed alongside the original plugin.

## [v2.0.1] - 2026-10-27

- Released the `figma-mcp-go2` plugin.
- Assigned the plugin its own Figma plugin ID so it can be installed as a development plugin.

## [v2.0.0] - 2026-10-27

- Enhanced the node style data returned by `get_node`: gradient fills and strokes are preserved, including gradient stops, opacity, and handle positions.
- Added `styles.textRanges` for mixed text styles, including font, font size, fills, text decoration, and text case for each text range.
- Applied the enhanced serialization to `get_node` and its child nodes while preserving the existing response shape of other tools.
- Simplified the Figma plugin structure with standalone plugin code and UI files.
- Added a GitHub Actions release workflow to build binaries and package the plugin archive automatically.

## Initial release - 2026-03-26

- Initialized the Go MCP server, Figma plugin, npm installation scripts, and release configuration.
- Added a local WebSocket connection to Figma with document, selection, style, variable, and export tools.
