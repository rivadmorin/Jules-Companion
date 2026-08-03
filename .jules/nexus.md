## 18-05-2024 - [MCP Protocol Capabilities Missing]
**Discovery:** The MCP Server SDK throws an error \`Server does not support resources (required for resources/list)\` if \`capabilities.resources\` is missing from the Server constructor.
**Analysis:** Even if a request handler for \`ListResourcesRequestSchema\` is registered, the server configuration must explicitly declare resource capabilities to respond to resource-related JSON-RPC requests correctly.
**Action:** Always include \`resources: {}\` in the \`capabilities\` object when initializing a \`new Server()\` if exposing MCP Resources.
