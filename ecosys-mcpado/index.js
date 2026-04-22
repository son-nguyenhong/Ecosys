#!/usr/bin/env node
/**
 * ADO MCP Server for Claude Code
 * ================================
 * Provides tools for Claude to get/update Azure DevOps work items
 * automatically based on CLAUDE.md agent context.
 *
 * Config via environment variables (or .env file):
 *   ADO_ORG          - Azure DevOps org name (e.g. "vib-lz-devops")
 *   ADO_PROJECT      - Project name (e.g. "B05-BTS-CTS")
 *   ADO_PAT          - Personal Access Token
 *   ADO_AGENT_ROLE   - Role for this session: pm | dev | qa | ba (optional)
 *
 * Tools exposed to Claude:
 *   ado_get_work_item          - Get a single work item by ID
 *   ado_search_work_items      - Search/query work items (WIQL)
 *   ado_update_work_item       - Update fields on a work item
 *   ado_add_comment            - Add a comment to a work item
 *   ado_create_work_item       - Create a new work item
 *   ado_get_my_tasks           - Get tasks assigned to current agent role
 *   ado_complete_task          - Mark task as Done + add Claude output as comment
 *   ado_list_sprints           - List iterations/sprints
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// ─── Load .env if present ──────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnv();

// ─── Azure CLI token helper ────────────────────────────────────────────────
// ADO resource ID for Azure AD token requests
const ADO_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";

function getAzureCliToken() {
  try {
    const result = execSync(
      `az account get-access-token --resource ${ADO_RESOURCE_ID} --query accessToken -o tsv`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (result) {
      console.error("[ADO-MCP] Using Azure CLI Bearer token (no PAT needed).");
      return { header: `Bearer ${result}`, type: "bearer" };
    }
  } catch {
    // az not installed or not logged in — fall through
  }
  return null;
}

// ─── ADO Client ────────────────────────────────────────────────────────────
class ADOClient {
  constructor() {
    this.org     = process.env.ADO_ORG     || "";
    this.project = process.env.ADO_PROJECT || "";
    const pat    = process.env.ADO_PAT     || "";

    if (!this.org || !this.project) {
      console.error("[ADO-MCP] WARNING: ADO_ORG and ADO_PROJECT are required.");
    }

    // Auth priority: PAT → Azure CLI Bearer token
    if (pat) {
      this.authHeader = "Basic " + Buffer.from(":" + pat).toString("base64");
    } else {
      const cli = getAzureCliToken();
      if (cli) {
        this.authHeader = cli.header;
      } else {
        console.error("[ADO-MCP] WARNING: No ADO_PAT and Azure CLI token unavailable. Run 'az login' first.");
        this.authHeader = "";
      }
    }

    this.baseUrl = `https://dev.azure.com/${this.org}/${this.project}/_apis`;
    this.vstsUrl = `https://dev.azure.com/${this.org}/${this.project}/_apis`;

    this.http = axios.create({
      headers: {
        Authorization: this.authHeader,
        "Content-Type":  "application/json",
        Accept: "application/json",
      },
    });
  }

  // ── GET work item by ID ──────────────────────────────────────────────────
  async getWorkItem(id, fields = null) {
    const params = { "api-version": "7.1" };
    if (fields) params["$expand"] = "all";
    const url = `${this.baseUrl}/wit/workitems/${id}`;
    const res = await this.http.get(url, { params });
    return res.data;
  }

  // ── WIQL query ───────────────────────────────────────────────────────────
  async queryWorkItems(wiql) {
    const url = `${this.baseUrl}/wit/wiql`;
    const res = await this.http.post(
      url,
      { query: wiql },
      { params: { "api-version": "7.1" } }
    );
    // Batch-fetch details for up to 20 items
    const ids = (res.data.workItems || []).slice(0, 20).map((w) => w.id);
    if (!ids.length) return [];
    const details = await this.http.get(`${this.baseUrl}/wit/workitems`, {
      params: {
        ids: ids.join(","),
        "api-version": "7.1",
        "$expand": "relations",
      },
    });
    return details.data.value;
  }

  // ── UPDATE work item fields ──────────────────────────────────────────────
  async updateWorkItem(id, patches) {
    // patches: [{ op, path, value }] — JSON Patch format
    const url = `${this.baseUrl}/wit/workitems/${id}`;
    const res = await this.http.patch(url, patches, {
      params: { "api-version": "7.1" },
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json-patch+json",
      },
    });
    return res.data;
  }

  // ── ADD comment ──────────────────────────────────────────────────────────
  async addComment(id, text) {
    const url = `${this.baseUrl}/wit/workitems/${id}/comments`;
    const res = await this.http.post(
      url,
      { text },
      { params: { "api-version": "7.1-preview.3" } }
    );
    return res.data;
  }

  // ── CREATE work item ─────────────────────────────────────────────────────
  async createWorkItem(type, fields) {
    // fields: { "System.Title": "...", "System.Description": "...", ... }
    const patches = Object.entries(fields).map(([path, value]) => ({
      op: "add",
      path: `/fields/${path}`,
      value,
    }));
    const url = `${this.baseUrl}/wit/workitems/$${encodeURIComponent(type)}`;
    const res = await this.http.post(url, patches, {
      params: { "api-version": "7.1" },
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json-patch+json",
      },
    });
    return res.data;
  }

  // ── LIST sprints/iterations ──────────────────────────────────────────────
  async listSprints(teamName = null) {
    const team = teamName || this.project + " Team";
    const url  = `https://dev.azure.com/${this.org}/${this.project}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations`;
    const res  = await this.http.get(url, { params: { "api-version": "7.1" } });
    return res.data.value || [];
  }

  // ── GET tasks for an agent role ──────────────────────────────────────────
  async getMyTasks(role) {
    // Map role → ADO tag or assigned-to filter
    const roleTagMap = {
      pm:  "agent:pm",
      dev: "agent:dev",
      qa:  "agent:qa",
      ba:  "agent:ba",
    };
    const tag = roleTagMap[role] || `agent:${role}`;

    // Also query by "Assigned To" if env has ADO_EMAIL
    const email = process.env.ADO_EMAIL || "";
    let wiql;

    if (email) {
      wiql = `SELECT [System.Id],[System.Title],[System.State],[System.AssignedTo],[System.Tags]
              FROM WorkItems
              WHERE [System.TeamProject] = '${this.project}'
              AND [System.AssignedTo] = '${email}'
              AND [System.State] NOT IN ('Done','Closed','Removed')
              ORDER BY [System.ChangedDate] DESC`;
    } else {
      wiql = `SELECT [System.Id],[System.Title],[System.State],[System.Tags]
              FROM WorkItems
              WHERE [System.TeamProject] = '${this.project}'
              AND [System.Tags] CONTAINS '${tag}'
              AND [System.State] NOT IN ('Done','Closed','Removed')
              ORDER BY [System.ChangedDate] DESC`;
    }
    return await this.queryWorkItems(wiql);
  }
}

// ─── Format helpers ────────────────────────────────────────────────────────
function formatWorkItem(item) {
  if (!item || !item.fields) return JSON.stringify(item);
  const f = item.fields;
  const lines = [
    `**#${item.id} — ${f["System.Title"] || "(no title)"}**`,
    `Type: ${f["System.WorkItemType"] || "?"}  |  State: ${f["System.State"] || "?"}`,
    f["System.AssignedTo"]
      ? `Assigned: ${f["System.AssignedTo"].displayName || f["System.AssignedTo"]}`
      : "",
    f["System.Tags"] ? `Tags: ${f["System.Tags"]}` : "",
    f["System.IterationPath"] ? `Sprint: ${f["System.IterationPath"]}` : "",
    f["System.Description"]
      ? `\nDescription:\n${stripHtml(f["System.Description"]).slice(0, 400)}`
      : "",
    `\nURL: https://dev.azure.com/${process.env.ADO_ORG || ""}/${encodeURIComponent(
      f["System.TeamProject"] || ""
    )}/_workitems/edit/${item.id}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatList(items) {
  if (!items.length) return "No work items found.";
  return items.map((i) => formatWorkItem(i)).join("\n\n---\n\n");
}

// ─── Tool definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "ado_get_work_item",
    description:
      "Get a single Azure DevOps work item by its numeric ID. Returns title, state, description, assigned-to, tags, and URL.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Work item ID (numeric)" },
      },
      required: ["id"],
    },
  },
  {
    name: "ado_search_work_items",
    description:
      "Search work items using a WIQL query string, or a plain-text keyword search by title. Returns up to 20 results.",
    inputSchema: {
      type: "object",
      properties: {
        wiql: {
          type: "string",
          description:
            "Full WIQL query (optional). If omitted, uses `keyword` for a title search.",
        },
        keyword: {
          type: "string",
          description: "Plain keyword to search in work item titles (used if wiql is not provided).",
        },
        state: {
          type: "string",
          description:
            "Filter by state: Active | New | Resolved | Done | In Progress (optional)",
        },
        type: {
          type: "string",
          description:
            "Filter by work item type: Epic | Feature | User Story | Task | Bug (optional)",
        },
      },
    },
  },
  {
    name: "ado_update_work_item",
    description:
      "Update one or more fields on an existing work item. Common fields: title, state, description, assignedTo, tags, iterationPath, storyPoints.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Work item ID to update" },
        title:         { type: "string",  description: "New title" },
        state:         { type: "string",  description: "New state: Active | New | Resolved | Done | In Progress | Closed" },
        description:   { type: "string",  description: "New description (HTML allowed)" },
        assignedTo:    { type: "string",  description: "Email or display name of assignee" },
        tags:          { type: "string",  description: "Semicolon-separated tags" },
        iterationPath: { type: "string",  description: "Sprint/iteration path" },
        storyPoints:   { type: "number",  description: "Story points / effort" },
        priority:      { type: "number",  description: "Priority 1-4" },
        acceptanceCriteria: { type: "string", description: "Acceptance criteria (HTML allowed)" },
      },
      required: ["id"],
    },
  },
  {
    name: "ado_add_comment",
    description:
      "Add a discussion comment to a work item. Use this to post Claude's output, analysis, or progress notes directly onto the ADO task.",
    inputSchema: {
      type: "object",
      properties: {
        id:   { type: "number", description: "Work item ID" },
        text: { type: "string", description: "Comment text (HTML supported, markdown will be auto-wrapped)" },
      },
      required: ["id", "text"],
    },
  },
  {
    name: "ado_create_work_item",
    description:
      "Create a new work item (Task, User Story, Bug, etc.) under the configured project.",
    inputSchema: {
      type: "object",
      properties: {
        type:        { type: "string", description: "Work item type: Task | User Story | Bug | Feature | Epic" },
        title:       { type: "string", description: "Title of the work item" },
        description: { type: "string", description: "Description (HTML allowed)" },
        assignedTo:  { type: "string", description: "Email or display name of assignee" },
        tags:        { type: "string", description: "Semicolon-separated tags (e.g. agent:dev;sprint3)" },
        parentId:    { type: "number", description: "Parent work item ID (for child tasks)" },
        storyPoints: { type: "number", description: "Story points / effort estimate" },
        iterationPath: { type: "string", description: "Sprint/iteration path" },
      },
      required: ["type", "title"],
    },
  },
  {
    name: "ado_get_my_tasks",
    description:
      "Get open tasks relevant to this agent's role, either by tag (agent:pm, agent:dev, agent:qa, agent:ba) or by assigned email (ADO_EMAIL env var). Use at session start to understand what needs to be done.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Agent role: pm | dev | qa | ba. Defaults to ADO_AGENT_ROLE env var.",
          enum: ["pm", "dev", "qa", "ba"],
        },
      },
    },
  },
  {
    name: "ado_complete_task",
    description:
      "Mark a work item as Done and post Claude's output as a comment. Use when Claude finishes implementing/delivering a task.",
    inputSchema: {
      type: "object",
      properties: {
        id:     { type: "number", description: "Work item ID to complete" },
        output: { type: "string", description: "Claude's output/summary to attach as comment" },
        state:  {
          type: "string",
          description: "Target state (default: Done). Use 'Resolved' for bugs.",
          default: "Done",
        },
      },
      required: ["id", "output"],
    },
  },
  {
    name: "ado_list_sprints",
    description:
      "List all sprints/iterations for the project team. Useful for scoping work.",
    inputSchema: {
      type: "object",
      properties: {
        teamName: {
          type: "string",
          description: "Team name (optional, defaults to '<Project> Team')",
        },
      },
    },
  },
];

// ─── MCP Server ────────────────────────────────────────────────────────────
const server = new Server(
  { name: "ado-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const ado = new ADOClient();

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// Call tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── ado_get_work_item ──────────────────────────────────────────────
      case "ado_get_work_item": {
        const item = await ado.getWorkItem(args.id);
        return { content: [{ type: "text", text: formatWorkItem(item) }] };
      }

      // ── ado_search_work_items ──────────────────────────────────────────
      case "ado_search_work_items": {
        let wiql = args.wiql;
        if (!wiql) {
          const conditions = [
            `[System.TeamProject] = '${ado.project}'`,
          ];
          if (args.keyword) {
            conditions.push(`[System.Title] CONTAINS '${args.keyword}'`);
          }
          if (args.state) {
            conditions.push(`[System.State] = '${args.state}'`);
          }
          if (args.type) {
            conditions.push(`[System.WorkItemType] = '${args.type}'`);
          }
          wiql = `SELECT [System.Id],[System.Title],[System.State],[System.AssignedTo],[System.Tags]
                  FROM WorkItems
                  WHERE ${conditions.join(" AND ")}
                  ORDER BY [System.ChangedDate] DESC`;
        }
        const items = await ado.queryWorkItems(wiql);
        return { content: [{ type: "text", text: formatList(items) }] };
      }

      // ── ado_update_work_item ───────────────────────────────────────────
      case "ado_update_work_item": {
        const fieldMap = {
          title:              "System.Title",
          state:              "System.State",
          description:        "System.Description",
          assignedTo:         "System.AssignedTo",
          tags:               "System.Tags",
          iterationPath:      "System.IterationPath",
          storyPoints:        "Microsoft.VSTS.Scheduling.StoryPoints",
          priority:           "Microsoft.VSTS.Common.Priority",
          acceptanceCriteria: "Microsoft.VSTS.Common.AcceptanceCriteria",
        };
        const patches = [];
        for (const [key, field] of Object.entries(fieldMap)) {
          if (args[key] !== undefined) {
            patches.push({ op: "add", path: `/fields/${field}`, value: args[key] });
          }
        }
        if (!patches.length) {
          return { content: [{ type: "text", text: "No fields to update provided." }] };
        }
        const updated = await ado.updateWorkItem(args.id, patches);
        return {
          content: [{
            type: "text",
            text: `✅ Work item #${args.id} updated.\n${formatWorkItem(updated)}`,
          }],
        };
      }

      // ── ado_add_comment ────────────────────────────────────────────────
      case "ado_add_comment": {
        // Wrap plain text in HTML paragraph for ADO rendering
        const html = args.text.startsWith("<")
          ? args.text
          : `<p>${args.text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
        const result = await ado.addComment(args.id, html);
        return {
          content: [{
            type: "text",
            text: `✅ Comment added to #${args.id} (comment id: ${result.id})`,
          }],
        };
      }

      // ── ado_create_work_item ───────────────────────────────────────────
      case "ado_create_work_item": {
        const fields = {
          "System.Title": args.title,
        };
        if (args.description)   fields["System.Description"]   = args.description;
        if (args.assignedTo)    fields["System.AssignedTo"]    = args.assignedTo;
        if (args.tags)          fields["System.Tags"]          = args.tags;
        if (args.iterationPath) fields["System.IterationPath"] = args.iterationPath;
        if (args.storyPoints)   fields["Microsoft.VSTS.Scheduling.StoryPoints"] = args.storyPoints;

        const created = await ado.createWorkItem(args.type, fields);

        // Link to parent if provided
        if (args.parentId) {
          await ado.updateWorkItem(created.id, [{
            op: "add",
            path: "/relations/-",
            value: {
              rel: "System.LinkTypes.Hierarchy-Reverse",
              url: `https://dev.azure.com/${ado.org}/${ado.project}/_apis/wit/workitems/${args.parentId}`,
              attributes: { comment: "Created by Claude" },
            },
          }]);
        }

        return {
          content: [{
            type: "text",
            text: `✅ Created #${created.id}: ${args.title}\n${formatWorkItem(created)}`,
          }],
        };
      }

      // ── ado_get_my_tasks ───────────────────────────────────────────────
      case "ado_get_my_tasks": {
        const role = args.role || process.env.ADO_AGENT_ROLE || "dev";
        const items = await ado.getMyTasks(role);
        const header = `**Open tasks for role: ${role}** (${items.length} found)\n\n`;
        return { content: [{ type: "text", text: header + formatList(items) }] };
      }

      // ── ado_complete_task ──────────────────────────────────────────────
      case "ado_complete_task": {
        const targetState = args.state || "Done";
        // 1. Update state to Done
        await ado.updateWorkItem(args.id, [
          { op: "add", path: "/fields/System.State", value: targetState },
        ]);
        // 2. Add Claude output as comment
        const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const commentHtml = `
          <p><strong>✅ Completed by Claude Code</strong> — ${timestamp}</p>
          <hr/>
          <p>${args.output.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>
        `;
        const comment = await ado.addComment(args.id, commentHtml);
        return {
          content: [{
            type: "text",
            text: `✅ #${args.id} marked as "${targetState}" + output posted as comment (id: ${comment.id})`,
          }],
        };
      }

      // ── ado_list_sprints ───────────────────────────────────────────────
      case "ado_list_sprints": {
        const sprints = await ado.listSprints(args.teamName);
        if (!sprints.length) return { content: [{ type: "text", text: "No sprints found." }] };
        const lines = sprints.map((s) => {
          const start = s.attributes?.startDate?.slice(0, 10) || "?";
          const end   = s.attributes?.finishDate?.slice(0, 10) || "?";
          const state = s.attributes?.timeFrame || "";
          return `- **${s.name}** (${start} → ${end}) ${state === "current" ? "← current" : ""}`;
        });
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    // Return structured error so Claude can self-correct
    const status = err.response?.status;
    const detail = err.response?.data?.message || err.message;
    return {
      content: [{
        type: "text",
        text: `❌ ADO API Error ${status || ""}: ${detail}`,
      }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[ADO-MCP] Server running on stdio — ready for Claude Code.");
