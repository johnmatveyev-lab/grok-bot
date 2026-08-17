export const COMPUTER_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List files and folders in the shared computer workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace path, default /workspace" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read a text file from the shared workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path such as /workspace/notes.md" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Create or overwrite a text file in the shared workspace. Use this to leave finished work.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description: "Run a shell command in /workspace on the shared computer.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_page",
      description: "Open a public http(s) URL in the computer browser and return extracted text.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description: "Persist a durable working preference, fact, or rule for this Bot.",
      parameters: {
        type: "object",
        properties: {
          note: { type: "string" },
        },
        required: ["note"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_routine",
      description: "Create a scheduled routine owned by this Bot.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          schedule: { type: "string", description: "Human schedule such as weekdays 8:00 AM" },
          instructions: { type: "string" },
        },
        required: ["name", "schedule", "instructions"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_skill",
      description: "Save the current method as a reusable skill.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          instructions: { type: "string" },
        },
        required: ["name", "instructions"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "request_approval",
      description: "Pause and ask the human to approve an external or irreversible action.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string" },
          detail: { type: "string" },
        },
        required: ["action", "detail"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "message_bot",
      description: "Hand work to another named Bot on this account.",
      parameters: {
        type: "object",
        properties: {
          bot_name: { type: "string" },
          message: { type: "string" },
        },
        required: ["bot_name", "message"],
      },
    },
  },
];

export function prettyToolName(name: string): string {
  const map: Record<string, string> = {
    list_files: "Listing files",
    read_file: "Reading a file",
    write_file: "Writing a file",
    run_command: "Using the terminal",
    browse_page: "Browsing the web",
    save_memory: "Updating memory",
    create_routine: "Creating a routine",
    create_skill: "Saving a skill",
    request_approval: "Asking for approval",
    message_bot: "Messaging a Bot",
  };
  return map[name] || name.replace(/_/g, " ");
}
