Content is user-generated and unverified.


560
Learn how to customize
import React, { useState, useEffect } from "react";

const C = {
  purple: "#2B0F4C", purpleSoft: "#3D2166", teal: "#E4F4F1", tealDeep: "#8FD4C7",
  green: "#329424", greenSoft: "#E3F3DF", red: "#C0392B", redSoft: "#FBEAE7",
  ink: "#1A0B30", paper: "#FBFAF7",
};

const QUESTIONS_1 = [
  // ---- Module 1 ----
  {
    s: "A", domain: "LLM Fundamentals", pick: 1,
    q: "Two runs of the same prompt at temperature 0 return slightly different wording. Which explanation is correct?",
    options: [
      "Sampling can still introduce variation; temperature 0 favours the likeliest tokens but does not hard-guarantee identical output",
      "This is impossible at temperature 0, so one of the two calls must have silently used a different model version or returned a cached response from an earlier request",
      "Streaming was left on for one of the calls",
      "The two calls used different context windows",
    ],
    correct: [0],
    why: "Even at temperature 0, determinism is not guaranteed. The long option asserts a false impossibility; streaming and window size do not explain wording variation.",
  },
  {
    s: "A", domain: "Prompt Engineering", pick: 2,
    q: "Which TWO statements about prompting modes are accurate? (Pick 2)",
    options: [
      "Single-shot includes exactly one worked example",
      "Multi-shot examples guide the output on that call, at extra token cost",
      "Zero-shot always outperforms few-shot once the task is well-specified",
      "Multi-shot permanently fine-tunes the model on the examples",
    ],
    correct: [0, 1],
    why: "Single-shot is one example; multi-shot adds several to shape output per call at token cost. Examples do not fine-tune the model, and zero-shot is not universally superior once specified.",
  },
  {
    s: "A", domain: "API Mechanics", pick: 1,
    q: "A multi-turn session grows until a request exceeds the window mid-generation. What happens?",
    options: [
      "The output is truncated and the response carries a context-window-exceeded stop reason",
      "The request is silently accepted and the model drops whichever earlier turns it judges least relevant to make room for the rest",
      "The window auto-expands for that call",
      "The call returns a 200 with empty content",
    ],
    correct: [0],
    why: "Overflowing mid-generation yields truncated output with a model_context_window_exceeded stop reason. The window is fixed: it neither silently drops turns nor expands.",
  },
  {
    s: "A", domain: "Model Selection", pick: 1,
    q: "You have many trivial calls and occasional hard ones, and want to pay for deep reasoning only when it helps. Which fits?",
    options: [
      "Adaptive thinking, with effort scaled to the task",
      "Extended thinking pinned to maximum effort on every call, so quality is never at risk on the genuinely hard ones",
      "Fast mode on every call",
      "A larger model tier for all calls",
    ],
    correct: [0],
    why: "Adaptive thinking spends reasoning effort only where it changes the answer. Always-max overpays on trivial calls, fast-mode-everywhere underserves the hard ones, and a bigger tier does not target the mix.",
  },
  {
    s: "A", domain: "Cost & Tokens", pick: 1,
    q: "A large, stable system prompt is sent on every call in a high-volume app. What does prompt caching do, and what is its limit?",
    options: [
      "It reuses the stable prefix at reduced cost, but the cache expires and must be refreshed, and only the unchanged prefix benefits",
      "It makes all later calls free regardless of what changes in the prompt",
      "It reduces output-token cost specifically",
      "It only works in batch mode",
    ],
    correct: [0],
    why: "Caching cuts the cost of re-sending an unchanged prefix, but caches expire and only the stable portion is cached. It does not make calls free, target output tokens, or require batch.",
  },

  // ---- Module 2 ----
  {
    s: "B", domain: "Prompt Engineering", pick: 2,
    q: "Match each prompt failure to the missing technique. Which TWO pairings are correct? (Pick 2)",
    options: [
      "Output in the wrong shape → add an output constraint",
      "Drift across turns → tighten and complete the system prompt",
      "Hallucinated structure → raise the temperature",
      "Wrong shape → add more few-shot examples of reasoning",
    ],
    correct: [0, 1],
    why: "Wrong shape signals a missing output constraint; drift signals an underspecified system prompt. A hallucinated structure needs few-shot examples (not temperature), and shape is not fixed by reasoning examples.",
  },
  {
    s: "B", domain: "Output Handling", pick: 1,
    q: "Prompt-only formatting keeps failing on untested inputs that break your parser. Best next step?",
    options: [
      "Constrain output in the API: JSON schema for the response and strict tool use for arguments",
      "Expand the prompt with an exhaustive set of formatting rules and several reminders, then retry any input whose output fails to parse until it eventually conforms to the schema",
      "Lower temperature to 0 and trust the output",
      "Switch to a bigger model",
    ],
    correct: [0],
    why: "Move control into the API with structured outputs and strict tool use. The long option is more of the prompt-only approach that already failed; temperature and model size do not enforce structure.",
  },
  {
    s: "B", domain: "API Mechanics", pick: 1,
    q: "When should a streamed turn be written into conversation history?",
    options: [
      "Only after message_stop",
      "Once the first content_block_start event arrives, so the stored history stays current with the model in real time",
      "After the first token",
      "Whenever the socket closes for any reason",
    ],
    correct: [0],
    why: "A stream ending is not a message completing: commit only after message_stop, discarding partial turns on interruption. Committing early risks storing a half-built turn.",
  },
  {
    s: "B", domain: "Tools & MCPs", pick: 1,
    q: "Two tools are both described as retrieving information and Claude often calls the wrong one. Best single fix?",
    options: [
      "Add to each description a clear statement of when NOT to use it",
      "Give each tool a richer, strongly-typed input schema with distinctive parameter names so the model has more signal to tell them apart",
      "Delete one of the tools",
      "Increase the model tier",
    ],
    correct: [0],
    why: "Claude matches on the description, so an exclusion condition resolves most wrong-tool bugs. The long option is the trap: differing input schemas do not help when descriptions overlap.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "You're wiring an agent whose tool can irreversibly modify a customer system. Where does the human checkpoint belong?",
    options: [
      "In the design, gating the irreversible action before the loop is built",
      "After the first production write, added once you have watched the agent behave on real traffic and can place the gate precisely",
      "Only in the retry handler",
      "It can be skipped if tests passed",
    ],
    correct: [0],
    why: "For irreversible actions the gate goes into the design before the loop is wired. Waiting until after the first write, or only on retry, lets the irreversible action through first.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "Production sessions turn out short and numerous, unlike the long dev sessions, and in-context memory now fails early. Which model most likely fits?",
    options: [
      "External storage that persists state across the many short sessions",
      "Keep in-context memory but raise max_tokens each session so history has more room to accumulate before it fails",
      "Stateless for every session",
      "Summarised in-context memory",
    ],
    correct: [0],
    why: "State must survive across many short sessions, which external storage provides. Raising max_tokens does not survive session boundaries, stateless drops needed continuity, and summarised memory is still in-context.",
  },
  {
    s: "B", domain: "API Mechanics", pick: 1,
    q: "Before writing multimodal ingestion, you estimate image cost. Which statement is accurate?",
    options: [
      "Visual tokens scale with image dimensions and the per-image ceiling varies by model tier, so a high-resolution original can cost many times a thumbnail",
      "All images cost a flat token amount regardless of size or model",
      "Images are billed only on output tokens",
      "Describing images in text is always cheaper than sending them",
    ],
    correct: [0],
    why: "Image cost grows with dimensions and the ceiling differs by tier, so resolution matters a lot. Flat pricing and output-only billing are wrong, and text description is not universally cheaper.",
  },
  {
    s: "B", domain: "Tools & MCPs", pick: 1,
    q: "You connect three MCP servers to reuse maintained tools. What must you manage?",
    options: [
      "Each server's tool definitions load into context whether or not they are used, adding cost",
      "Once connected, the servers take over tool routing and your hand-written custom tools can no longer be registered in the same application",
      "All three must use stdio",
      "The context window permanently grows",
    ],
    correct: [0],
    why: "Connected servers load their definitions into context regardless of use, so connect deliberately. The long option invents a restriction that does not exist.",
  },
  {
    s: "B", domain: "Model Selection", pick: 1,
    q: "Across a multi-turn exchange using extended thinking, what must happen to thinking blocks?",
    options: [
      "They must be returned unchanged",
      "They should be summarised and re-sent so history stays compact while preserving the reasoning for later turns",
      "They should be deleted before the next call",
      "They belong in the system prompt",
    ],
    correct: [0],
    why: "Thinking blocks must be returned unchanged or the next request fails. Summarising, deleting, or relocating them breaks the exchange.",
  },

  // ---- Module 3 ----
  {
    s: "C", domain: "Claude Code", pick: 2,
    q: "Configuring Claude Code for a trusted refactor that must auto-approve edits, block destructive shell commands, and never read .env.production. Which TWO settings pieces are correct? (Pick 2)",
    options: [
      'allow ["Bash(npm run:*)"], deny ["Bash(rm:*)", "Bash(git push:*)"]',
      'deny ["Read(.env.production)"]',
      'defaultMode "bypassPermissions"',
      'allow ["Bash(*)", "Edit(*)"] with no destructive-command gate',
    ],
    correct: [0, 1],
    why: "Allowing safe commands while denying destructive ones gates shell execution, and denying Read(.env.production) enforces the path restriction at the settings layer. bypassPermissions removes the guard, and an unrestricted allow is the opposite of the requirement.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 1,
    q: "Your settings auto-approve edits. Mid-refactor the agent proposes editing a deployment-config file that several production services read. Where should a human gate sit for this one action?",
    options: [
      "A human reviews and approves this specific change before the write executes, because a wrong value is hard to undo and reaches systems beyond the file",
      "Nowhere; the settings already auto-approve edits",
      "Add bypassPermissions so the agent never pauses",
      "Review it after the write, in the next pull request",
    ],
    correct: [0],
    why: "Auto-approving edits is fine as a default, but the worst-case high-cost action still warrants a human gate before the write. Reviewing after the fact is too late for a change that reaches production services.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 2,
    q: "A PreToolUse hook must block a disallowed read. Which TWO are true? (Pick 2)",
    options: [
      "It must use PreToolUse, because that fires before the tool executes",
      "Exiting with code 2 blocks the call, and text written to stderr becomes the message Claude sees",
      "PostToolUse could also block, by inspecting the result and undoing the read",
      "Exiting 0 with the reason on stdout is what signals the block",
    ],
    correct: [0, 1],
    why: "Only PreToolUse can block, and the hook signals a block with exit code 2 plus a reason on stderr. PostToolUse runs after the tool, so it cannot prevent the read, and exit 0 allows the call.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A developer wants a review-checklist Skill to load when they ask for a review in the Claude Code terminal. What must be configured?",
    options: [
      "Place SKILL.md in .claude/skills with a description that matches review requests",
      "Define the agent as an API resource that lists the skill and set the managed-agents beta header on the calls, writing the skill so its steps do not depend on any local files",
      "Send the code-execution and skills beta headers on every request",
      "Set settingSources explicitly for the Agent SDK",
    ],
    correct: [0],
    why: "In the Claude Code terminal, a Skill loads from .claude/skills when its description matches the request. The long option is the Anthropic-hosted-agent setup; the others belong to the Messages API and Agent SDK runtimes.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A scheduled headless job uses the Agent SDK and expects the Skill to load from the repo. What must be configured?",
    options: [
      "Enable filesystem sources by setting settingSources explicitly so the agent loads skills from the project, rather than relying on a default, and confirm the current default against the Agent SDK reference",
      "Place SKILL.md in .claude/skills and rely on the terminal default",
      "Set the managed-agents beta header",
      "Send the code-execution and skills beta headers",
    ],
    correct: [0],
    why: "For an Agent SDK job that must load skills from the repo, set settingSources explicitly rather than trusting a default. The terminal placement, managed-agents header, and code-execution headers belong to other runtimes.",
  },
  {
    s: "C", domain: "Configuration Management", pick: 1,
    q: "A SKILL.md runs on the author's machine but breaks when a teammate clones the repo, because step 1 calls /Users/alexmorgan/projects/deploy-utils/validate.sh. Correct fix?",
    options: [
      "Reference the script from the project root via CLAUDE_PROJECT_DIR so it resolves wherever the repo is cloned",
      "Replace it with another absolute path that points to a shared network drive everyone can reach",
      "Use a home-directory shortcut like ~/projects/deploy-utils/validate.sh",
      "Remove the step so the skill no longer calls an external script",
    ],
    correct: [0],
    why: "The defect is the absolute path to the author's home directory; referencing from CLAUDE_PROJECT_DIR resolves from the repo root anywhere. Another absolute path or a home shortcut just moves the same problem, and removing the step drops the capability.",
  },
  {
    s: "C", domain: "MCP Server Development", pick: 1,
    q: "A security-scanning MCP server must be deployed to every developer's Claude Code installation across the org. Which transport and scope fit?",
    options: [
      "HTTP + Enterprise (managed settings)",
      "stdio + Local, installed once on each machine and shared informally so each developer keeps control of their own copy",
      "HTTP + Project (.mcp.json)",
      "stdio or HTTP + Local",
    ],
    correct: [0],
    why: "An org-wide mandate for every install is an enterprise-scope, HTTP-transport deployment through managed settings. Local scopes are per-developer, and project scope covers one team's repo, not the whole organisation.",
  },

  // ---- Module 4 ----
  {
    s: "D", domain: "Eval & Debugging", pick: 2,
    q: "Which TWO success criteria are specific enough to build an eval against? (Pick 2)",
    options: [
      "A two-sentence summary that lists every action item and its owner",
      "A refund decision of exactly 'approve' or 'deny' with a one-line reason",
      "A helpful, high-quality summary of the thread",
      "A response that satisfies the user",
    ],
    correct: [0, 1],
    why: "Gradeable criteria state a checkable output. 'Every action item and its owner' and a constrained 'approve/deny plus reason' can be graded; 'helpful' and 'satisfies the user' are too vague to check.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "In the failure-handling section of a design doc, what is the core task?",
    options: [
      "Enumerate the errors production will throw, mark each retriable or terminal, and define the user-facing outcome when recovery fails",
      "Wrap every external call in an automatic retry loop that keeps trying until it succeeds, since most production failures are transient and clear on their own within a few attempts",
      "Raise the request timeout",
      "Switch to a larger model for resilience",
    ],
    correct: [0],
    why: "Failure handling means naming each error, classifying it retriable or terminal, and stating the fallback for the user. Blind retry loops, longer timeouts, and bigger models are not an error path.",
  },
  {
    s: "D", domain: "Model Selection", pick: 1,
    q: "When should hard cost and latency budgets be set?",
    options: [
      "Before the architecture is decided",
      "After the system is built and profiled under real traffic, when you finally have accurate numbers to base the ceilings on",
      "Only once costs exceed forecast",
      "At the first incident review",
    ],
    correct: [0],
    why: "Set hard budgets before architecture so you can check the design against them before writing code. Waiting until after the build, an overrun, or an incident means the budget never shaped the design.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "Naming the trust boundary on paper turns least privilege into something you can…?",
    options: [
      "Enforce with a hook, rather than a setting you remember to add later",
      "Guarantee automatically, because documenting the boundary is itself what applies the restriction at runtime across every tool the agent can reach",
      "Skip, if the model is well-behaved",
      "Defer entirely to the security team",
    ],
    correct: [0],
    why: "A named boundary becomes an enforceable design decision, implemented with a hook. Documentation alone enforces nothing at runtime, and least privilege cannot be skipped or wholly delegated away.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "You must grade thousands of open-ended summaries where exact-match won't work. Sound approach?",
    options: [
      "An LLM-as-judge scoring against explicit criteria, validated against a human-labelled sample",
      "Trust each summary's own stated confidence and grade on that, since the model has the most context on whether it succeeded",
      "Exact-string match to a reference",
      "Eyeball a handful and extrapolate",
    ],
    correct: [0],
    why: "Open-ended grading at scale uses an LLM judge against explicit criteria, calibrated to human labels. Self-reported confidence is unreliable, exact-match fails on free text, and a handful of samples does not generalise.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "An agent returns a wrong answer. What most directly isolates whether the tool, the model, or the orchestration failed?",
    options: [
      "A trace of the run",
      "Re-reading the final answer closely to infer from its wording where the reasoning must have gone wrong",
      "Rerunning it a few times",
      "Swapping in a bigger model",
    ],
    correct: [0],
    why: "A step-by-step trace shows where the run diverged, isolating tool versus model versus orchestration. Re-reading, rerunning, and model swaps are guesses that do not localise the fault.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "An MCP connection trace shows 401 on both the first attempt and the retry, with the credential read as a plaintext value from a file at a known path. Correct fix?",
    options: [
      "Rotate the rejected key so the connection can authenticate, and move the credential out of the file into a runtime environment variable so it is never stored in plaintext again",
      "Rotate the key and write the new value back into the same credentials file, since a fresh key is what the service will accept",
      "Switch this service from API-key auth to OAuth",
      "Add a retry with backoff so a third attempt can succeed",
    ],
    correct: [0],
    why: "Two problems are stacked: a rejected key and an insecurely stored one, so both must be fixed. Rotating back into the same file leaves the storage defect, OAuth does not match a service-account identity, and backoff does not fix a rejected key.",
  },

  // ---- Module 5 ----
  {
    s: "E", domain: "Applications & Integration", pick: 1,
    q: "A regulated client requires that data never leave their existing cloud. How should this drive platform choice?",
    options: [
      "Run on the provider (Bedrock or Vertex) that keeps data inside the client's cloud and compliance boundary",
      "Default to the first-party API, since it is always cheapest and gets new models first, then layer network controls on top to satisfy the auditors",
      "Only local self-hosting can ever be compliant",
      "Pick whichever platform has the newest model",
    ],
    correct: [0],
    why: "When data residency governs, choose the platform that keeps data in the client's cloud and compliance boundary. Cost, model recency, and an assumption that only local hosting is compliant all miss the constraint.",
  },
  {
    s: "E", domain: "Configuration Management", pick: 2,
    q: "Preparing a build for reuse and safe deployment. Which TWO practices matter most? (Pick 2)",
    options: [
      "Pin the model version in production",
      "Version your prompts so a change can be attributed and rolled back",
      "Always deploy on the newest model automatically to stay current",
      "Keep prompts inline and unversioned to reduce overhead",
    ],
    correct: [0, 1],
    why: "Pinning the model and versioning prompts make changes deliberate, attributable, and reversible. Auto-upgrading and unversioned inline prompts remove exactly the control that reuse and rollback depend on.",
  },
];

const QUESTIONS_2 = [
  // Module 1
  {
    s: "A", domain: "LLM Fundamentals", pick: 1,
    q: "A regression test flakes because it compares the model's output to a fixed expected string. Best fix?",
    options: [
      "Assert on the structure or key facts of the output rather than an exact string, since generation is non-deterministic",
      "Pin temperature to 0 and assume output is now byte-identical every run, keeping the exact-string assertion in place",
      "Retry the test until it happens to pass",
      "Move the test to the largest model tier",
    ],
    correct: [0],
    why: "Generation is non-deterministic, so grade on structure or key facts, not an exact string. Temperature 0 reduces variation but does not guarantee identical bytes, and retrying or upsizing does not make the assertion valid.",
  },
  {
    s: "A", domain: "API Mechanics", pick: 2,
    q: "Which TWO of these consume the context budget as a conversation grows? (Pick 2)",
    options: [
      "Accumulated tool results",
      "Prior turns kept in history",
      "The model's parameter count",
      "The temperature setting",
    ],
    correct: [0, 1],
    why: "History and tool outputs both accumulate in the window and spend the fixed budget. Parameter count and temperature are model settings, not context the window holds.",
  },
  {
    s: "A", domain: "Model Selection", pick: 1,
    q: "A workload is simple and latency-sensitive and does not need step-by-step reasoning. Which setting fits?",
    options: [
      "Skip extended thinking, enabling it only where a reasoning pass changes the answer",
      "Turn on maximum-effort extended thinking so even the simple answers are extra reliable and you never regret it later",
      "Always route to the largest model",
      "Pin adaptive thinking to its highest effort permanently",
    ],
    correct: [0],
    why: "Reasoning effort should be spent only where it changes the answer. Maxing thinking or the model tier on simple, latency-sensitive work just adds cost and latency.",
  },
  {
    s: "A", domain: "Cost & Tokens", pick: 1,
    q: "In a long agent session the same instruction prefix is re-sent every turn. What reduces the repeated input cost?",
    options: [
      "Cache checkpoints on the stable prefix",
      "Lowering max_tokens each turn so responses are shorter, which brings the per-turn input cost down as the session goes on",
      "Switching the session to batch mode",
      "Adding more few-shot examples",
    ],
    correct: [0],
    why: "Cache checkpoints let the unchanged prefix be reused at reduced cost. max_tokens caps output not input, batch does not suit a live session, and more examples add tokens.",
  },

  // Module 2
  {
    s: "B", domain: "Prompt Engineering", pick: 1,
    q: "Over a long conversation the model's output format slowly drifts from what you asked. Which technique addresses this failure type?",
    options: [
      "Complete and tighten the system prompt so the format rule is stated durably",
      "Add three few-shot examples of the desired reasoning steps to every user message so the model re-anchors on structure each turn",
      "Raise the temperature",
      "Switch models partway through",
    ],
    correct: [0],
    why: "Drift across turns points to an underspecified system prompt, so fix it there. Piling reasoning examples into every user turn is costly and off-target, and temperature or model swaps do not address drift.",
  },
  {
    s: "B", domain: "Prompt Engineering", pick: 2,
    q: "User-submitted text is concatenated straight into your prompt template and sometimes overrides your instructions. Which TWO help at the prompt layer? (Pick 2)",
    options: [
      "Delimit and label the user text clearly as data",
      "Keep trusted instructions in the system prompt, separate from user content",
      "Ask users nicely not to include instructions",
      "Truncate all user input to a fixed short length",
    ],
    correct: [0, 1],
    why: "Delimiting user input as data and separating trusted instructions into the system prompt both blunt injection. A polite request is unenforceable, and blanket truncation mangles legitimate input.",
  },
  {
    s: "B", domain: "Prompt Engineering", pick: 1,
    q: "Where do durable role and safety rules hold most reliably against later user turns?",
    options: [
      "The system prompt",
      "Repeated verbatim inside every assistant response, so the model is continually reminded of them throughout the conversation",
      "The final user message",
      "A tool result",
    ],
    correct: [0],
    why: "The system prompt is the authoritative, stable home for durable rules. Repeating them in assistant turns is fragile and wasteful, and user or tool content is lower priority.",
  },
  {
    s: "B", domain: "Output Handling", pick: 1,
    q: "Your parser occasionally breaks on output that is valid JSON but includes a prose preamble. Most robust production handling?",
    options: [
      "Constrain to JSON-only and validate against a schema, repairing or rejecting malformed output before it flows downstream",
      "Set temperature to 0, which removes formatting variation entirely so a preamble can never appear again",
      "Trust the output and parse it directly",
      "Increase max_tokens",
    ],
    correct: [0],
    why: "Constrain the output and validate defensively before it moves on. Temperature 0 reduces but does not eliminate stray prose, trusting the output is what breaks, and max_tokens is unrelated.",
  },
  {
    s: "B", domain: "Tools & MCPs", pick: 1,
    q: "An agent calls a search tool far more often than a create tool, even when creation is intended. Their descriptions overlap. Best first fix?",
    options: [
      "Rewrite the descriptions so each states its distinct purpose and when not to use it",
      "Reorder the tools so the create tool is listed first, since the model tends to prefer whichever tool appears earlier in the list",
      "Remove the search tool",
      "Raise the temperature",
    ],
    correct: [0],
    why: "Overlapping descriptions cause wrong-tool selection, so make each description distinct with an exclusion condition. List order is not the lever, removing a tool drops a capability, and temperature does not help.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "You can write out the exact fixed sequence of steps a task always follows. Which architecture is right, and why?",
    options: [
      "A workflow, because the path is known and coding it avoids the cost and nondeterminism of an agent",
      "An agent, because agents are more capable and future-proof and you can always constrain it later if the extra latency and cost become a problem in production",
      "A single mega-prompt containing all steps",
      "Independent, unordered calls",
    ],
    correct: [0],
    why: "A known, fixed path is a workflow: deterministic and cheaper. Reaching for an agent adds nondeterminism and cost you do not need, and a mega-prompt or unordered calls cannot reliably sequence the work.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "An agent that can issue refunds is going to production, and refunds are irreversible. Correct design choice?",
    options: [
      "A human approval gate before the refund executes, wired in at design time",
      "Detailed logging and alerting, so if a wrong refund goes out the on-call engineer is notified within minutes and can begin the reversal",
      "A low temperature to reduce risky behaviour",
      "A polite system-prompt reminder to be careful",
    ],
    correct: [0],
    why: "Irreversible actions get a human gate before execution, designed in. Logging and alerting are after the money moved, and temperature or a prompt reminder are not enforceable controls.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "A research agent must read 40 documents and produce one cited synthesis, but everything in one context degrades quality. Best approach?",
    options: [
      "Have subagents extract from each document in isolation, then synthesise from the compact extracts",
      "Load all 40 at once and raise max_tokens as high as the model allows so nothing has to be left out of the single context",
      "Use only the documents that fit comfortably",
      "Lower the temperature",
    ],
    correct: [0],
    why: "Isolating each document in a subagent keeps contexts clean and feeds synthesis compact extracts. Cramming all 40 in is the bloat that degraded quality, dropping documents loses data, and temperature is irrelevant.",
  },
  {
    s: "B", domain: "API Mechanics", pick: 1,
    q: "A one-off image is analysed once; a logo is reused across thousands of requests. How should each be supplied?",
    options: [
      "Inline the one-off as base64, and put the reused logo behind the Files API so it isn't re-uploaded each call",
      "Inline both as base64 every time, since inlining is simplest and the extra bytes on the reused asset are negligible at scale",
      "Describe both in text to avoid image tokens",
      "Batch both regardless of latency needs",
    ],
    correct: [0],
    why: "Inline base64 suits one-off images; the Files API suits assets reused across requests so they aren't re-sent each time. Inlining a reused asset repeatedly wastes tokens, and text description or forced batching miss the point.",
  },
  {
    s: "B", domain: "Model Selection", pick: 1,
    q: "Across turns you use extended thinking. What is the requirement on the returned thinking blocks?",
    options: [
      "Send them back unchanged on the next turn",
      "Compress them into a short summary so the growing history doesn't blow the context budget, while still keeping the reasoning available",
      "Delete them before the next call",
      "Relocate them into the system prompt",
    ],
    correct: [0],
    why: "Thinking blocks must be returned unchanged or the next request fails. Summarising, deleting, or relocating them breaks the exchange.",
  },

  // Module 3
  {
    s: "C", domain: "Claude Code", pick: 1,
    q: "You point Claude Code at an unfamiliar third-party repo you don't fully trust. What permission posture fits the first pass?",
    options: [
      "Read-only plan mode to explore and propose before any edits",
      "bypassPermissions, so exploration is fast and uninterrupted, on the reasoning that you'll review everything in the final diff before merging anyway",
      "Approve every file read manually",
      "Disable all tools",
    ],
    correct: [0],
    why: "Match authority to risk: on an untrusted repo, plan mode explores read-only before changing anything. bypassPermissions grants far too much too early, approving every read is needless friction, and disabling tools defeats exploration.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 2,
    q: "You must guarantee an agent can neither run rm nor read secrets/config.json, whatever it is asked. Which TWO settings pieces enforce this? (Pick 2)",
    options: [
      'deny ["Bash(rm:*)"]',
      'deny ["Read(secrets/config.json)"]',
      'defaultMode "bypassPermissions"',
      'allow ["Bash(*)"]',
    ],
    correct: [0, 1],
    why: "Explicit deny rules at the settings layer block the destructive command and the secret read regardless of the session. bypassPermissions removes guards, and an unrestricted Bash allow does the opposite.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 2,
    q: "A hook must prevent a tool from writing outside the project directory. Which TWO are correct? (Pick 2)",
    options: [
      "Use the PreToolUse event, since it fires before the write executes",
      "Exit with code 2 and put the reason on stderr to block it",
      "Use PostToolUse and roll the write back afterwards",
      "Exit 0 with the reason on stdout",
    ],
    correct: [0, 1],
    why: "Only PreToolUse can block, and the hook signals a block with exit code 2 plus a reason on stderr. PostToolUse runs after the write, and exit 0 allows the call.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A service calls the Messages API and wants a Skill to run as part of the request. What must be configured?",
    options: [
      "Send the code-execution and skills beta headers, and write the skill so its steps don't depend on local files or tools",
      "Place SKILL.md in .claude/skills and let the terminal pick it up",
      "Set settingSources explicitly for the Agent SDK",
      "Set the managed-agents beta header and list the skill on an agent resource",
    ],
    correct: [0],
    why: "For a Messages API request, send the code-execution and skills beta headers and keep the skill free of local-file dependencies. The terminal placement, settingSources, and managed-agents header belong to other runtimes.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A product team wants one Skill to run inside a long-running agent that Anthropic hosts, reachable by an agent ID across sessions. What's required?",
    options: [
      "Define the agent as an API resource that lists the skill and set the managed-agents beta header, writing the skill to avoid local-file dependencies since it runs in Anthropic's sandbox",
      "Place SKILL.md in .claude/skills",
      "Set settingSources explicitly",
      "Send only the code-execution header",
    ],
    correct: [0],
    why: "An Anthropic-hosted agent addressed by ID is defined as an API resource listing the skill, with the managed-agents beta header, and the skill must not depend on local files. The others are the terminal and SDK runtimes.",
  },
  {
    s: "C", domain: "Configuration Management", pick: 1,
    q: "A plugin's SKILL.md hardcodes a tool at /Users/dev/tools/lint.sh and fails for teammates. Best fix?",
    options: [
      "Reference it from the project root via CLAUDE_PROJECT_DIR",
      "Point every teammate's machine at a shared network mount at that same absolute path and document the mount in the README so setups stay consistent",
      "Use a home-directory shortcut like ~/tools/lint.sh",
      "Delete the step so the skill no longer calls the script",
    ],
    correct: [0],
    why: "The defect is the machine-specific absolute path; CLAUDE_PROJECT_DIR resolves from the repo root anywhere. A shared mount or home shortcut just relocates the same fragility, and deleting the step drops the capability.",
  },
  {
    s: "C", domain: "MCP Server Development", pick: 1,
    q: "A local SQLite inspection tool you use only on your own machine. Which transport and scope fit?",
    options: [
      "stdio + Local",
      "HTTP + Enterprise via managed settings, so it is centrally governed and consistently available to you across every environment you might ever work in",
      "HTTP + Project (.mcp.json)",
      "HTTP + Local",
    ],
    correct: [0],
    why: "A personal, same-machine tool uses stdio at local scope. Enterprise managed settings are for org-wide mandates, and project scope shares with a team, neither of which this needs.",
  },

  // Module 4
  {
    s: "D", domain: "Eval & Debugging", pick: 2,
    q: "Which TWO of these are gradeable success criteria you could build an eval against? (Pick 2)",
    options: [
      "Output valid JSON with fields sentiment (positive/negative/neutral) and confidence (0-1)",
      "Classify the ticket into exactly one of five named categories",
      "Produce a genuinely useful triage",
      "Handle the ticket well",
    ],
    correct: [0, 1],
    why: "A constrained JSON schema and a one-of-five classification are checkable. 'Useful' and 'handle it well' are too vague to grade against.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "Writing the failure-handling section of a design doc, what must you decide for each error?",
    options: [
      "Whether it is retriable or terminal, and what the user gets when it can't be recovered",
      "The exact library and language for the retry, so the section is concrete enough for an engineer to build from without any further design work",
      "Whether it is worth logging at all",
      "Which larger model tier to fail over to",
    ],
    correct: [0],
    why: "Failure handling classifies each error retriable or terminal and defines the user-facing fallback. Naming implementation libraries is too low-level for the decision, and logging or tier-swaps are not the error path.",
  },
  {
    s: "D", domain: "Model Selection", pick: 1,
    q: "In the cost-and-latency section of a design doc, what is the 'reliability floor'?",
    options: [
      "The minimum reliability the design must hold and cannot trade away for cost or speed",
      "The lowest cost reachable if you are willing to accept as many dropped requests and timeouts as that price requires",
      "The cheapest model available",
      "The p99 latency target",
    ],
    correct: [0],
    why: "The reliability floor is the minimum reliability you refuse to trade for cost or latency. It is not a cost figure, a model choice, or a latency percentile.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "In the trust-boundary section, which content should be treated as untrusted?",
    options: [
      "Anything the agent reads that someone else can write, such as fetched web pages and tool output",
      "Only text arriving over an unencrypted connection, since transport security is what determines whether input can be trusted",
      "The developer's own system prompt",
      "Compiled application constants",
    ],
    correct: [0],
    why: "Untrusted means anything outside your control that another party can write, chiefly fetched content and tool output. Encryption is about transport, not authorship, and your own prompt and constants are trusted.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "A page fetched by a summariser contains hidden text telling the agent to email a file to an external address. Most effective mitigation?",
    options: [
      "Least privilege: the summariser has no email capability, so injected instructions can't reach a send action, and untrusted content is kept separate from instructions",
      "Add a system-prompt line telling the model to ignore instructions embedded in fetched pages",
      "Scan fetched pages for the word 'ignore'",
      "Switch to a larger model",
    ],
    correct: [0],
    why: "Least privilege means the tool simply cannot perform the injected action, which is the durable defense alongside isolating untrusted content. A prompt instruction is bypassable, keyword scanning is brittle, and a bigger model can be more compliant.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "An agent's answer is wrong. The trace shows the tool returned correct data. Where is the failure?",
    options: [
      "In the model's use of the data, not the tool",
      "In the integration layer, because whenever a final answer is wrong the fault lies in how the tool output was parsed and handed back to the model",
      "In the network",
      "In the API key configuration",
    ],
    correct: [0],
    why: "The tool returned correct data, so the fault is in how the model reasoned over it. The sweeping claim about the integration layer is false, and network and key issues would not produce correct tool data plus a wrong answer.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "A committed credentials file exposed an API key. Two things are true: the key is being rejected, and it's stored in plaintext. Correct fix?",
    options: [
      "Rotate the key and move it out of the file into an environment variable referenced at runtime",
      "Rotate the key and re-commit the new value to the same file so the app keeps working with no code changes, then restrict who can read the repo",
      "Switch the service to OAuth",
      "Add a retry with backoff so a later attempt succeeds",
    ],
    correct: [0],
    why: "Both problems must be fixed: rotate the rejected key and stop storing it in plaintext by moving it to an environment variable. Re-committing leaves the storage defect, OAuth does not fit a service credential, and backoff does not fix a rejected key.",
  },

  // Module 5
  {
    s: "E", domain: "Applications & Integration", pick: 1,
    q: "Your team already runs everything on AWS and needs Claude in the same account for governance. How should that shape platform choice?",
    options: [
      "Use Amazon Bedrock so Claude runs within the existing AWS governance and data boundary",
      "Use the first-party API and rebuild your governance tooling around it, since staying on one vendor's native platform is worth the migration regardless of where your data lives today",
      "Self-host only, as that is the sole compliant option",
      "Pick whichever platform shipped the newest model",
    ],
    correct: [0],
    why: "When governance and data residency point to an existing cloud, run Claude through that cloud's platform (here, Bedrock). Rebuilding tooling elsewhere, assuming only self-hosting is compliant, or chasing model recency all miss the constraint.",
  },
  {
    s: "E", domain: "Configuration Management", pick: 2,
    q: "Shipping a reusable accelerator that must survive model updates. Which TWO practices matter most? (Pick 2)",
    options: [
      "Pin the model version and upgrade deliberately after evals",
      "Version prompts so changes are attributable and reversible",
      "Auto-adopt each new model on release to stay current",
      "Keep prompts inline and unversioned to stay lightweight",
    ],
    correct: [0, 1],
    why: "Pinning the model and versioning prompts make change deliberate and reversible, which is what surviving updates requires. Auto-adopting and unversioned inline prompts remove exactly that control.",
  },
];

const QUESTIONS_3 = [
  // Module 1
  {
    s: "A", domain: "LLM Fundamentals", pick: 1,
    q: "A CI check re-runs the same summariser twice and asserts the two outputs are byte-identical. It fails at random. Best fix?",
    options: [
      "Assert on structure and key facts instead of an exact match, since generation is non-deterministic",
      "Set temperature to 0 and keep the byte-identical assertion, treating the output as fully reproducible now",
      "Loop the check until it passes",
      "Run the check on the biggest model tier",
    ],
    correct: [0],
    why: "Outputs vary run to run, so grade on structure or key facts. Temperature 0 narrows but does not guarantee identical bytes, and looping or upsizing does not make an exact-match assertion valid.",
  },
  {
    s: "A", domain: "API Mechanics", pick: 2,
    q: "As a chat session lengthens, which TWO things grow inside the context window? (Pick 2)",
    options: [
      "Retained prior turns",
      "Accumulated tool outputs",
      "The model's weight count",
      "The sampling seed",
    ],
    correct: [0, 1],
    why: "Prior turns and tool outputs both accumulate and spend the fixed budget. Weight count and sampling seed are not content the window stores.",
  },
  {
    s: "A", domain: "Model Selection", pick: 1,
    q: "A high-volume endpoint answers trivial FAQ-style questions and must feel snappy. Which reasoning setting fits?",
    options: [
      "Leave extended thinking off, enabling it only where a reasoning pass would change the answer",
      "Run maximum-effort extended thinking everywhere so even trivial answers are extra safe and you never regret it",
      "Send every call to the largest model",
      "Keep adaptive thinking pinned to its highest effort at all times",
    ],
    correct: [0],
    why: "Spend reasoning only where it changes the answer. Maxing thinking or the model tier on trivial, latency-sensitive traffic just adds cost and delay.",
  },
  {
    s: "A", domain: "Cost & Tokens", pick: 1,
    q: "A coding agent resends the same large, unchanging repo-guidelines block on every turn. What cuts the repeated input cost?",
    options: [
      "Cache checkpoints on the stable block",
      "Trimming max_tokens each turn so replies get shorter and the per-turn input cost drops over the session",
      "Moving the agent to batch mode",
      "Adding a few more examples to the block",
    ],
    correct: [0],
    why: "Caching the unchanged block reuses it at reduced cost. max_tokens caps output not input, batch does not fit a live agent, and more examples add tokens.",
  },

  // Module 2
  {
    s: "B", domain: "Prompt Engineering", pick: 1,
    q: "Ten turns into a conversation, the assistant starts ignoring the JSON format you specified at the start. Which technique fixes this failure type?",
    options: [
      "State the format rule durably in the system prompt and tighten what was underspecified",
      "Attach three few-shot reasoning examples to every user turn so the model keeps re-anchoring on the format",
      "Bump the temperature up",
      "Swap to a different model mid-conversation",
    ],
    correct: [0],
    why: "Drift across turns traces to an underspecified system prompt, so fix it there. Reasoning examples in every turn are costly and off-target, and temperature or model changes do not address drift.",
  },
  {
    s: "B", domain: "Prompt Engineering", pick: 2,
    q: "Support tickets are pasted verbatim into your prompt template and occasionally contain text that hijacks your instructions. Which TWO help at the prompt layer? (Pick 2)",
    options: [
      "Wrap and label the ticket text clearly as data",
      "Keep your trusted instructions in the system prompt, apart from the ticket content",
      "Add a note asking users not to embed instructions",
      "Cut every ticket to a short fixed length",
    ],
    correct: [0, 1],
    why: "Delimiting the untrusted text as data and separating trusted instructions into the system prompt both reduce injection. A request is unenforceable, and truncation destroys legitimate content.",
  },
  {
    s: "B", domain: "Prompt Engineering", pick: 1,
    q: "You keep restating the tone and safety rules inside each user message, and later turns still override them. Where should those rules live?",
    options: [
      "In the system prompt",
      "Restated in full inside every assistant reply so the model is reminded of them continuously through the chat",
      "In the last user message before output",
      "In a tool result",
    ],
    correct: [0],
    why: "Durable rules belong in the system prompt, the highest-priority, stable placement. Repeating them in assistant turns is fragile, and user or tool content sits lower in priority.",
  },
  {
    s: "B", domain: "Output Handling", pick: 1,
    q: "You feed Claude's output into a typed API client that rejects anything but strict JSON, yet the model sometimes prepends a sentence. Most robust handling?",
    options: [
      "Require JSON-only, validate against a schema, and repair or reject malformed output before the client sees it",
      "Drop temperature to 0, which fully removes formatting variation so no sentence can ever slip in again",
      "Feed the raw output to the client and let it parse",
      "Raise max_tokens so the sentence has room",
    ],
    correct: [0],
    why: "Constrain and validate before the output reaches the client. Temperature 0 lowers but does not remove stray prose, passing raw output is what fails, and max_tokens is unrelated.",
  },
  {
    s: "B", domain: "Tools & MCPs", pick: 1,
    q: "Claude keeps invoking lookup_user when a task actually needs search_orders, and the two descriptions read almost the same. Best first fix?",
    options: [
      "Rewrite each description to state its distinct purpose and when not to use it",
      "List search_orders before lookup_user, since the model tends to favour whichever tool comes first",
      "Delete lookup_user",
      "Turn the temperature up",
    ],
    correct: [0],
    why: "Overlapping descriptions cause the wrong pick, so make each distinct with an exclusion condition. Ordering is not the lever, deleting a tool loses a capability, and temperature does not help.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "A nightly ETL always runs the same five steps in the same fixed order. Which architecture is right, and why?",
    options: [
      "A workflow, since the path is fully known and coding it avoids an agent's cost and nondeterminism",
      "An agent, since agents are more capable and future-proof and you can rein it in later if the added latency and cost hurt in production",
      "One large prompt holding all five steps",
      "Five independent calls with no ordering",
    ],
    correct: [0],
    why: "A fixed, known path is a workflow: deterministic and cheaper. An agent adds nondeterminism you do not need, and a mega-prompt or unordered calls cannot reliably sequence the steps.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "An agent can permanently delete customer records, and deletion cannot be undone. Correct design choice?",
    options: [
      "A human approval gate before the delete runs, built in at design time",
      "Thorough audit logging and alerts, so a wrong delete pages the on-call engineer within minutes to start recovery",
      "A low temperature to keep it cautious",
      "A firm system-prompt instruction to double-check before deleting",
    ],
    correct: [0],
    why: "Irreversible actions get a human gate before execution, designed in. Logging and alerts come after the record is gone, and temperature or a prompt line are not enforceable controls.",
  },
  {
    s: "B", domain: "Agents & Workflows", pick: 1,
    q: "You must turn 60 PDFs into one brief that cites exact figures, but putting them all in one context ruins quality. Best approach?",
    options: [
      "Use subagents to extract from each PDF in isolation, then synthesise from the compact extracts",
      "Feed all 60 in at once and push max_tokens as high as the model permits so nothing is left out",
      "Include only the PDFs that fit comfortably",
      "Reduce the temperature",
    ],
    correct: [0],
    why: "Subagents keep each PDF in a clean context and hand synthesis compact extracts. Loading all 60 is the bloat that hurt quality, dropping PDFs loses data, and temperature is irrelevant.",
  },
  {
    s: "B", domain: "API Mechanics", pick: 1,
    q: "A product photo is analysed once; a brand watermark image rides on every single request. How should each be supplied?",
    options: [
      "Inline the one-off photo as base64, and serve the repeated watermark through the Files API so it isn't re-uploaded each call",
      "Inline both as base64 on every call, since inlining is simplest and the repeated bytes are negligible at scale",
      "Convert both to text descriptions",
      "Send both through the Batches API regardless of latency",
    ],
    correct: [0],
    why: "Inline base64 suits a one-off; the Files API suits an asset reused across requests so it isn't re-sent. Re-inlining the watermark wastes tokens, and text or forced batching miss the point.",
  },
  {
    s: "B", domain: "Model Selection", pick: 1,
    q: "You use extended thinking across several turns. What is required of the thinking blocks?",
    options: [
      "They must be returned unchanged on the next turn",
      "They should be condensed into a summary so a growing history won't overflow the budget, while the reasoning stays available",
      "They should be stripped out before the next call",
      "They should be moved into the system prompt",
    ],
    correct: [0],
    why: "Thinking blocks must go back unchanged or the next request fails. Condensing, stripping, or relocating them breaks the exchange.",
  },

  // Module 3
  {
    s: "C", domain: "Claude Code", pick: 1,
    q: "You open an inherited legacy repo you didn't write and don't fully trust. What permission posture fits the first pass?",
    options: [
      "Read-only plan mode, to explore and propose before touching anything",
      "bypassPermissions, so the exploration runs uninterrupted, on the logic that you'll review the whole diff before merging anyway",
      "Manual approval on every file read",
      "All tools disabled",
    ],
    correct: [0],
    why: "Match authority to risk: plan mode explores read-only before editing an untrusted repo. bypassPermissions grants far too much too early, approving each read is friction, and disabling tools blocks exploration.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 2,
    q: "You must guarantee an agent can neither run sudo commands nor read config/prod.key, whatever it is asked. Which TWO settings pieces enforce this? (Pick 2)",
    options: [
      'deny ["Bash(sudo:*)"]',
      'deny ["Read(config/prod.key)"]',
      'defaultMode "bypassPermissions"',
      'allow ["Bash(*)"]',
    ],
    correct: [0, 1],
    why: "Settings-layer deny rules block the privileged command and the secret read regardless of the session. bypassPermissions strips guards, and an unrestricted Bash allow does the opposite.",
  },
  {
    s: "C", domain: "Security & Safety", pick: 2,
    q: "A hook must stop the agent from deleting files outside /workspace. Which TWO are correct? (Pick 2)",
    options: [
      "Use PreToolUse, because it fires before the delete executes",
      "Exit code 2 with the reason on stderr signals the block",
      "Use PostToolUse and undo the delete after it runs",
      "Exit 0 and print the reason to stdout",
    ],
    correct: [0, 1],
    why: "Only PreToolUse can block, and the block is signalled by exit code 2 with the reason on stderr. PostToolUse runs after the delete, and exit 0 permits the call.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A backend service calls the Messages API and wants a Skill to run as part of that request. What must be configured?",
    options: [
      "Send the code-execution and skills beta headers, and author the skill so its steps need no local files or tools",
      "Drop SKILL.md into .claude/skills and rely on the terminal to find it",
      "Set settingSources explicitly, as the Agent SDK requires",
      "Set the managed-agents beta header and list the skill on an agent resource",
    ],
    correct: [0],
    why: "A Messages API request needs the code-execution and skills beta headers, with the skill free of local-file dependencies. The terminal placement, settingSources, and managed-agents header belong to other runtimes.",
  },
  {
    s: "C", domain: "Tools & MCPs", pick: 1,
    q: "A team wants one Skill to run inside a long-running agent that Anthropic hosts, addressed by an agent ID across sessions. What's required?",
    options: [
      "Define the agent as an API resource that lists the skill and set the managed-agents beta header, with the skill written to avoid local files since it runs in Anthropic's sandbox",
      "Place SKILL.md in .claude/skills",
      "Set settingSources explicitly",
      "Send only the code-execution header",
    ],
    correct: [0],
    why: "An Anthropic-hosted agent by ID is an API resource that lists the skill, with the managed-agents header, and the skill cannot depend on local files. The others are the terminal and SDK setups.",
  },
  {
    s: "C", domain: "Configuration Management", pick: 1,
    q: "A plugin's SKILL.md hardcodes a script at /Users/sam/bin/format.sh and breaks for everyone who clones the repo. Best fix?",
    options: [
      "Reference it from the project root via CLAUDE_PROJECT_DIR",
      "Have every teammate mount a shared drive at that exact absolute path and document it in the README so setups match",
      "Swap it for a home shortcut like ~/bin/format.sh",
      "Remove the step so the skill stops calling the script",
    ],
    correct: [0],
    why: "The machine-specific absolute path is the defect; CLAUDE_PROJECT_DIR resolves from the repo root anywhere. A shared mount or home shortcut just relocates the fragility, and removing the step drops the capability.",
  },
  {
    s: "C", domain: "MCP Server Development", pick: 1,
    q: "A personal Markdown-notes query tool that only ever runs on your own laptop. Which transport and scope fit?",
    options: [
      "stdio + Local",
      "HTTP + Enterprise through managed settings, so it stays centrally governed and reliably available to you everywhere you might work",
      "HTTP + Project (.mcp.json)",
      "HTTP + Local",
    ],
    correct: [0],
    why: "A personal, same-machine tool is stdio at local scope. Enterprise managed settings are for org-wide mandates and project scope shares with a team, neither of which this needs.",
  },

  // Module 4
  {
    s: "D", domain: "Eval & Debugging", pick: 2,
    q: "Which TWO of these are gradeable success criteria you could build an eval against? (Pick 2)",
    options: [
      "Return a risk score from 0-100 with one of a fixed set of named reason codes",
      "Label the email as spam or not_spam",
      "Give a smart, helpful reply",
      "Be accurate",
    ],
    correct: [0, 1],
    why: "A bounded score with a fixed reason code and a binary spam label are checkable. 'Smart, helpful' and 'accurate' are too vague to grade.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "In the failure-handling section of a design doc, what must you decide for each error?",
    options: [
      "Whether it's retriable or terminal, and what the user gets when it can't be recovered",
      "The precise library and language for the retry, so an engineer could build the section directly with no further design",
      "Whether it's worth logging",
      "Which bigger model to fail over to",
    ],
    correct: [0],
    why: "Failure handling classifies each error retriable or terminal and sets the user-facing fallback. Naming libraries is too low-level, and logging or tier-swaps are not the error path.",
  },
  {
    s: "D", domain: "Model Selection", pick: 1,
    q: "In the cost-and-latency section of a design doc, what does the 'reliability floor' mean?",
    options: [
      "The minimum reliability the design must hold and cannot trade away for cost or speed",
      "The lowest possible cost, reached by accepting as many dropped requests and timeouts as that price demands",
      "The cheapest available model",
      "The p99 latency target",
    ],
    correct: [0],
    why: "The reliability floor is the minimum reliability you refuse to trade for cost or latency. It is not a cost figure, a model choice, or a latency percentile.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "When you map trust boundaries, which content should you treat as untrusted?",
    options: [
      "Anything the agent reads that someone else can write, like fetched pages and tool output",
      "Only content that arrives unencrypted, since transport security is what decides whether input can be trusted",
      "The developer's own system prompt",
      "Constants compiled into the binary",
    ],
    correct: [0],
    why: "Untrusted means anything outside your control that another party can write, chiefly fetched content and tool output. Encryption is about transport, not authorship, and your own prompt and constants are trusted.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "A calendar assistant reads event descriptions that users write. One description says 'delete all my events.' Most effective mitigation?",
    options: [
      "Least privilege: the assistant that reads descriptions has no delete capability, so an injected instruction can't reach a destructive action, and untrusted text stays separate from instructions",
      "Add a system-prompt line telling the model to ignore instructions found in event descriptions",
      "Scan descriptions for words like 'delete'",
      "Move to a larger, more instruction-following model",
    ],
    correct: [0],
    why: "Least privilege means the reading path simply cannot delete, which is the durable defense alongside isolating untrusted text. A prompt instruction is bypassable, keyword scanning is brittle, and a more compliant model can be more susceptible.",
  },
  {
    s: "D", domain: "Eval & Debugging", pick: 1,
    q: "A booking agent quotes the wrong price. The trace shows the pricing tool returned the correct number. Where is the failure?",
    options: [
      "In how the model used the correct data, not in the tool",
      "In the integration layer, since a wrong final answer always means the tool output was mishandled on the way back to the model",
      "In the network",
      "In the API key configuration",
    ],
    correct: [0],
    why: "The tool returned the right number, so the fault is in the model's use of it. The blanket claim about the integration layer is false, and network or key issues would not yield correct tool data plus a wrong answer.",
  },
  {
    s: "D", domain: "Security & Safety", pick: 1,
    q: "A .env file holding a database password was pushed to a public repo. It's still in use. Correct response?",
    options: [
      "Rotate the password and move it out of the committed file into an environment variable referenced at runtime",
      "Rotate the password and commit the new value back to the same .env so nothing else has to change, then make the repo private",
      "Switch the database to OAuth",
      "Add retry with backoff around the connection",
    ],
    correct: [0],
    why: "A pushed secret is compromised: rotate it and stop committing it by moving to an environment variable. Re-committing leaves the exposure pattern, making the repo private does not undo the leak, and OAuth or backoff are unrelated.",
  },

  // Module 5
  {
    s: "E", domain: "Applications & Integration", pick: 1,
    q: "A client mandates that all data stay inside their existing Google Cloud organisation. How should that shape platform choice?",
    options: [
      "Run Claude through Google Vertex AI so it stays within the client's cloud and governance boundary",
      "Use the first-party API and recreate the client's governance controls around it, since staying on the native platform is worth the migration wherever the data currently sits",
      "Insist on self-hosting as the only compliant path",
      "Choose whichever platform released the newest model",
    ],
    correct: [0],
    why: "When data residency points to an existing cloud, run Claude through that cloud's platform, here Vertex AI. Rebuilding controls elsewhere, assuming only self-hosting is compliant, or chasing model recency all miss the constraint.",
  },
  {
    s: "E", domain: "Configuration Management", pick: 2,
    q: "You're packaging a reusable accelerator that must keep working across model updates. Which TWO practices matter most? (Pick 2)",
    options: [
      "Pin the model version and upgrade deliberately after running evals",
      "Version the prompts so any change is attributable and reversible",
      "Auto-adopt each new model the day it ships",
      "Keep prompts inline and unversioned to stay lightweight",
    ],
    correct: [0, 1],
    why: "Pinning the model and versioning prompts make change deliberate and reversible, which is what surviving updates needs. Auto-adopting and unversioned inline prompts remove that control.",
  },
];

const QUESTIONS_4 = [
  // ── Model Selection & Optimization ─────────────────────────────
  {
    domain: "Configuration Management", pick: 1,
    q: "A production assistant's behaviour changed overnight with no deploy. The config references the model by a floating alias rather than a dated version string. What happened, and what is the fix?",
    options: [
      "The alias moved to a newer model release; pin a dated version and promote upgrades deliberately after evals",
      "The API silently retrained the model on your traffic; opt out of training in the console",
      "A cache served stale completions; clear the prompt cache",
      "Temperature drifted upward over time; reset it to the configured value",
    ],
    correct: [0],
    why: "Floating aliases follow new releases, so behaviour can change without any deploy on your side. Pinning a dated version makes upgrades deliberate. The API does not retrain into your endpoint, caches return your own prefix not stale answers, and temperature does not drift.",
  },
  {
    domain: "Cost & Tokens", pick: 1,
    q: "Finance asks for per-feature Claude spend, but you currently have no numbers at all. What is the first practical step?",
    options: [
      "Read the usage field returned on each API response and record input/output tokens per feature",
      "Estimate from character counts, since tokens are roughly four characters each and the approximation is close enough for accounting",
      "Divide the monthly invoice evenly across features",
      "Enable extended thinking to get more detailed billing",
    ],
    correct: [0],
    why: "Every response reports its token usage; logging that per feature gives real numbers. Character-count estimates drift by content type, an even split hides the actual drivers, and thinking has nothing to do with billing detail.",
  },
  {
    domain: "Cost & Tokens", pick: 1,
    q: "You enabled prompt caching but the hit rate is near zero. The prompt is assembled as: [today's date] + [user profile] + [20k-token policy manual] + [question]. Why?",
    options: [
      "The dynamic date and profile sit before the manual, so the prefix is never identical between calls; move stable content first and dynamic content after it",
      "Caching needs the Batches API and cannot work on synchronous calls",
      "20k tokens exceeds the maximum cacheable prefix size",
      "Caching only applies to output tokens, so input assembly is irrelevant",
    ],
    correct: [0],
    why: "A cache matches on an identical prefix; leading dynamic content breaks the match every call. Put the stable manual first and dynamic values after. Caching works on synchronous calls, 20k is well within cacheable size, and caching is an input-side mechanism.",
  },
  {
    domain: "Model Selection", pick: 1,
    q: "One endpoint serves both trivial lookups and occasional gnarly multi-constraint planning. You want one configuration that spends reasoning only where warranted. Which option?",
    options: [
      "Adaptive thinking, letting effort scale with the task",
      "Extended thinking locked to the maximum effort level, so the hard cases are always covered and the easy ones simply finish a little slower",
      "Fast mode on all calls",
      "Two separate deployments with a human routing between them",
    ],
    correct: [0],
    why: "Adaptive thinking scales effort per task, which is exactly the mixed-load fit. Max-effort everywhere pays thinking cost on trivial lookups, fast mode underserves the hard cases, and human routing does not scale.",
  },
  {
    domain: "API Mechanics", pick: 1,
    q: "Under burst load some calls return 429 rate-limit errors and some return 529 overloaded errors. Correct client behaviour?",
    options: [
      "Retry with exponential backoff and jitter, respecting any retry-after guidance, and shed or queue non-urgent work",
      "Retry 429s in a tight loop since the limit resets quickly, and treat 529s as permanent failures to surface to users at once",
      "Immediately fail over every call to a different model tier",
      "Raise max_tokens so each call does more and you need fewer of them",
    ],
    correct: [0],
    why: "Both are transient: back off with jitter and queue what can wait. Tight-looping worsens the burst, 529s are not permanent, blanket tier failover changes behaviour without fixing load, and max_tokens does not reduce request rate meaningfully.",
  },

  // ── Applications & Integration ────────────────────────────────
  {
    domain: "API Mechanics", pick: 2,
    q: "You are assembling a streamed response that includes a tool call. Which TWO statements are correct? (Pick 2)",
    options: [
      "A tool call's JSON arguments arrive incrementally across delta events and must be accumulated before parsing",
      "The end of the HTTP stream is not itself confirmation of a complete message; completion is signalled by the stop event",
      "Each delta event is a complete, independently parseable JSON argument object",
      "Tool calls are never included in streamed responses",
    ],
    correct: [0, 1],
    why: "Streaming delivers tool arguments in partial deltas that you accumulate, and completion is signalled by the stop event rather than the socket closing. Deltas are fragments, not standalone JSON, and tool calls absolutely stream.",
  },
  {
    domain: "API Mechanics", pick: 2,
    q: "You submitted 80,000 requests to the Message Batches API. Which TWO describe how results work? (Pick 2)",
    options: [
      "You poll the batch for completion and then retrieve results within the processing window",
      "Individual requests can succeed or fail independently, so results must be checked per item",
      "Results stream back to you live over a held-open connection as each item completes",
      "If any single request errors, the whole batch is rolled back and refunded",
    ],
    correct: [0, 1],
    why: "Batches are asynchronous: you poll, then fetch results, and each item carries its own success or error. There is no held-open live stream, and one failed item does not roll back the batch.",
  },
  {
    domain: "API Mechanics", pick: 1,
    q: "An inspector app sends four photos of the same site and asks Claude to compare them. How is this structured?",
    options: [
      "All four as image blocks in one message alongside the text instruction, so the model sees them together",
      "Four separate conversations, one per image, then a fifth call to merge the four answers, since a message can hold at most one image",
      "As URLs pasted into the prompt text",
      "Only as a PDF, since multiple raw images are unsupported",
    ],
    correct: [0],
    why: "A single message can carry multiple image blocks with text, letting the model compare them directly. Splitting into per-image calls loses the comparison, pasted URLs are not image input, and raw multiple images are fully supported.",
  },
  {
    domain: "Applications & Integration", pick: 1,
    q: "A support tool reuses one long-running Claude conversation for all customers to 'preserve context.' What is wrong with this design?",
    options: [
      "One customer's details leak into another's answers; each user or case needs its own conversation with only its own context",
      "Nothing, provided the context window is large enough to hold all the customers' histories at once",
      "It is only a problem for latency, since a long conversation responds slower",
      "It breaks prompt caching",
    ],
    correct: [0],
    why: "Session hygiene: sharing one conversation across customers bleeds one user's data into another's responses, a privacy and correctness failure. A big window does not fix cross-customer leakage, and latency or caching are not the core issue.",
  },
  {
    domain: "Applications & Integration", pick: 1,
    q: "A RAG assistant answers confidently but users can't tell which retrieved document supports which claim. Best improvement?",
    options: [
      "Instruct the model to ground each claim in the supplied passages and cite which passage supports it, and validate that cited passages actually exist",
      "Raise the retrieval count from 5 to 50 passages so more supporting material is always present somewhere in the context",
      "Lower the temperature so answers sound less confident",
      "Move the passages into the system prompt",
    ],
    correct: [0],
    why: "Grounded, citable answers come from instructing citation against the supplied passages and validating the citations. Fifty passages add noise and cost, temperature does not create attribution, and relocation changes nothing about citing.",
  },
  {
    domain: "Software Engineering", pick: 1,
    q: "Your Python service uses the Anthropic SDK. A teammate says using the SDK means you're no longer calling the REST API. What is accurate?",
    options: [
      "The SDK wraps the same REST API, adding typed helpers, retries, and auth handling; the underlying HTTP calls are identical",
      "The SDK speaks a proprietary binary protocol that bypasses HTTP entirely, which is why it is faster than raw REST calls",
      "The SDK runs the model locally",
      "The SDK is required; raw REST calls are not supported",
    ],
    correct: [0],
    why: "Client SDKs wrap the REST API with ergonomics like typing, retries, and auth; the wire calls are the same HTTP. There is no proprietary bypass, nothing runs locally, and raw REST remains fully supported.",
  },

  // ── Prompt & Context Engineering ──────────────────────────────
  {
    domain: "Prompt Engineering", pick: 1,
    q: "Free-text user input flows into a prompt that also contains your instructions. Beyond delimiting, what is the input-sanitization step?",
    options: [
      "Strip or neutralise control-like content in the user text, such as markup that mimics your delimiters or role labels, before it enters the prompt",
      "Spell-check and grammar-correct the user text so the model reads it more accurately and is less likely to misinterpret the request",
      "Convert the text to uppercase so instructions stand out",
      "Hash the user text and include only the hash",
    ],
    correct: [0],
    why: "Sanitization neutralises content that could impersonate your prompt structure, like fake delimiters or role labels. Spell-checking is cosmetic, uppercase changes nothing about injection, and hashing destroys the content the model needs.",
  },
  {
    domain: "Context Engineering", pick: 1,
    q: "Your RAG pipeline embeds entire 30-page documents as single chunks. Retrieval 'works' but answers are vague and the context fills instantly. What is the fix?",
    options: [
      "Chunk documents into smaller, semantically coherent passages so retrieval returns focused, relevant pieces instead of whole documents",
      "Keep whole-document chunks but raise the retrieval count so the model has even more full documents to draw from on each question",
      "Switch the embedding model to a larger one",
      "Ask the model to ignore irrelevant parts",
    ],
    correct: [0],
    why: "Whole-document chunks blunt retrieval precision and blow the budget; smaller coherent passages return exactly the relevant material. More whole documents worsens both problems, a bigger embedder does not fix granularity, and 'ignore the rest' still pays for the rest.",
  },
  {
    domain: "Context Engineering", pick: 1,
    q: "A day-long agent session must continue, but history has grown near the window limit and old tool outputs are mostly stale. Which lever fits?",
    options: [
      "Compact the history: summarise or prune stale turns and tool outputs while preserving decisions and open state",
      "Start deleting the system prompt and tool definitions first, since they are the largest single blocks in the window",
      "Raise max_tokens",
      "Increase the temperature to make replies shorter",
    ],
    correct: [0],
    why: "Compaction summarises or prunes stale history while keeping what still matters. The system prompt and tool definitions are load-bearing, max_tokens governs output not history, and temperature does not manage the window.",
  },

  // ── Agents & Workflows ────────────────────────────────────────
  {
    domain: "Agents & Workflows", pick: 1,
    q: "A hard-coded five-step workflow handles invoices, but a new supplier's invoices arrive in unpredictable formats and the workflow breaks on them. What does this signal architecturally?",
    options: [
      "Inputs now fall outside the codeable path, so the variable part warrants an agent that can decide steps at runtime",
      "The workflow needs more steps: enumerate every supplier format as its own branch and add a branch each time a new one appears",
      "The model tier is too small",
      "The workflow should be replaced by a single large prompt",
    ],
    correct: [0],
    why: "Workflows fit paths you can write down; when inputs fall off the path, the variable portion is agent territory. Enumerating every format is a losing race, tier is not the issue, and a mega-prompt is neither.",
  },
  {
    domain: "Agents & Workflows", pick: 1,
    q: "In a manager/supervisor hierarchy, what is the manager's job?",
    options: [
      "Decompose the goal, delegate subtasks to specialised subagents, and integrate their results",
      "Execute every subtask itself while the subagents observe and provide feedback on its work at each step",
      "Enforce the API rate limits across the team of agents",
      "Cache the subagents' prompts",
    ],
    correct: [0],
    why: "The manager decomposes, delegates to specialists, and integrates. It does not do all the work with subagents as reviewers, and rate limiting or caching are infrastructure concerns, not the hierarchy's role.",
  },
  {
    domain: "Agents & Workflows", pick: 1,
    q: "Your team is hand-rolling state passing, retries, and branching between eight agent steps, and it's becoming spaghetti. What are frameworks like LangGraph, Strands, or PydanticAI for?",
    options: [
      "They provide the orchestration layer: graph or typed control flow, explicit state, and retries, so you stop hand-rolling the plumbing",
      "They fine-tune the model so it internalises the eight steps and no orchestration code is needed at all afterwards",
      "They replace the need for tool schemas",
      "They are vector databases for retrieval",
    ],
    correct: [0],
    why: "Agentic abstraction frameworks structure multi-step control flow, state, and recovery. They do not fine-tune models, tools still need schemas, and they are not vector stores.",
  },
  {
    domain: "Agents & Workflows", pick: 1,
    q: "During a Claude Code session, a side-quest (auditing a dependency tree) threatens to flood the main conversation with output. What is the idiomatic move?",
    options: [
      "Hand the audit to a subagent, which works in its own context and returns just the findings to the main thread",
      "Run the audit in the main thread but ask for terse output, keeping everything in one place so nothing is lost between contexts",
      "Abort the audit and do it manually later",
      "Open a second terminal and paste results across",
    ],
    correct: [0],
    why: "Subagents isolate noisy side-work in their own context and return a compact result, keeping the main thread clean. Terse-but-inline still spends the main window, and aborting or manual pasting throws away the tooling.",
  },

  // ── Tools & MCPs ──────────────────────────────────────────────
  {
    domain: "Tools & MCPs", pick: 1,
    q: "One tool queries your internal database from the backend; another reads the highlighted text in the user's browser tab. What distinguishes them?",
    options: [
      "The database tool is server-side, executed by your backend; the highlight reader must be client-side, executed where the user's state lives",
      "Both must be server-side, since tools always execute on the server that hosts the agent and the browser state is fetched over an API",
      "Both are built-in tools",
      "The difference is only their schema format",
    ],
    correct: [0],
    why: "Execution location follows where the data lives: backend data is server-side; live browser state can only be read client-side. A server cannot see the user's in-page selection, and this is an execution distinction, not a schema one.",
  },
  {
    domain: "Tools & MCPs", pick: 1,
    q: "In an agent harness, a wire-transfer tool must never run on the model's say-so alone. Which tool-usage pattern applies?",
    options: [
      "An approval pattern: the harness intercepts the call and requires explicit confirmation before dispatching it",
      "Prompt-level guidance: a firm system-prompt paragraph explaining the gravity of transfers so the model self-restricts reliably",
      "Naming the tool something less inviting",
      "Lowering the temperature on calls that mention money",
    ],
    correct: [0],
    why: "The harness-level approval pattern gates dispatch outside the model's discretion. Prompt guidance is probabilistic, naming is irrelevant, and temperature does not gate execution.",
  },
  {
    domain: "Tools & MCPs", pick: 1,
    q: "An MCP server should offer users a named, parameterised 'weekly-report' template they can invoke on demand. Which MCP primitive is this?",
    options: [
      "A prompt",
      "A tool, since anything the user triggers by name is by definition an action the server performs on their behalf",
      "A resource",
      "A transport",
    ],
    correct: [0],
    why: "Named, parameterised, user-invoked templates are MCP prompts. Tools are model-invoked actions, resources are readable data, and a transport is the communication channel.",
  },
  {
    domain: "Tools & MCPs", pick: 1,
    q: "You wrote a formatting Skill but Claude rarely loads it, even on obviously relevant tasks. First thing to check?",
    options: [
      "The skill's description, since Claude loads a skill by matching the description against the task",
      "The skill's file size, since larger SKILL.md files rank higher in the loader and small ones are skipped",
      "Whether the skill is written in YAML rather than markdown",
      "The model's temperature",
    ],
    correct: [0],
    why: "Skills load on demand by description match, so a vague description means it never triggers. Size does not rank skills, SKILL.md is markdown, and temperature is unrelated.",
  },
  {
    domain: "Tools & MCPs", pick: 1,
    q: "You need current exchange rates inside Claude answers. The capability already exists as a maintained internal MCP server other teams use. Build a custom tool anyway?",
    options: [
      "No; connect the maintained server and spend your effort elsewhere, accepting its tool definitions in your context",
      "Yes; a hand-written custom tool is always preferable to a shared server because you control the schema end to end and avoid a network dependency",
      "No; paste today's rates into the system prompt each morning",
      "Yes, but only as a Skill",
    ],
    correct: [0],
    why: "A maintained, shared MCP server is exactly the reuse case: connect it rather than duplicating. 'Custom is always better' ignores maintenance cost, pasted rates go stale immediately, and a Skill is instructions, not a live data feed.",
  },

  // ── Claude Code ───────────────────────────────────────────────
  {
    domain: "Claude Code", pick: 2,
    q: "CLAUDE.md files exist at both the user level (~/.claude) and in the project repo. Which TWO are true? (Pick 2)",
    options: [
      "Both are loaded, with personal preferences at user level and shared project conventions in the repo",
      "The project-level file is the one teammates receive via version control",
      "Only one file can be active at a time, and the user-level file always wins",
      "The user-level file is committed to the repo automatically",
    ],
    correct: [0, 1],
    why: "The CLAUDE.md hierarchy layers user-level personal context with version-controlled project conventions, and it is the repo file that teammates share. They are not mutually exclusive, and nothing commits your user file for you.",
  },
  {
    domain: "Claude Code", pick: 1,
    q: "A CI pipeline must run Claude Code on every pull request with no human attached. Which invocation fits?",
    options: [
      "Headless print mode with the prompt passed non-interactively",
      "Interactive mode with an expect-script that answers the confirmation prompts the way a human operator would",
      "The desktop app on a virtual display",
      "Streaming mode in an attached terminal session",
    ],
    correct: [0],
    why: "Headless print mode is the non-interactive invocation designed for CI. Scripting fake keystrokes into interactive mode is fragile, and a desktop app or attached terminal is not how pipelines run.",
  },

  // ── Security & Safety ─────────────────────────────────────────
  {
    domain: "Security & Safety", pick: 2,
    q: "A triage assistant receives full customer records but only needs the message text and product name. Which TWO practices apply? (Pick 2)",
    options: [
      "Send only the fields the task needs, stripping the rest before the API call",
      "Redact or tokenise identifiers that must pass through, so raw PII isn't in the prompt",
      "Send the full record but instruct the model not to read the sensitive fields",
      "Encrypt the API key more strongly",
    ],
    correct: [0, 1],
    why: "Data minimisation means unneeded PII never leaves your system, and pass-through identifiers get redacted or tokenised. Telling the model to ignore fields still transmits them, and key encryption is unrelated to prompt contents.",
  },
  {
    domain: "Security & Safety", pick: 1,
    q: "One incident: a user typed instructions to make the assistant produce disallowed content. Another: a fetched webpage carried hidden text redirecting the agent. How do these differ?",
    options: [
      "The first is a jailbreak attempt via direct user input; the second is prompt injection via untrusted third-party content, and each is mitigated at a different layer",
      "They are the same attack, since in both cases text changed the model's behaviour, so one mitigation covers both identically",
      "The first is harmless because the user is authenticated",
      "The second is impossible if the page loaded over HTTPS",
    ],
    correct: [0],
    why: "Jailbreaks come from the user directly; injection rides in through untrusted content the system fetches, and the defenses differ (policy and refusals vs isolation and least privilege). They are not one attack, authentication does not make abuse harmless, and HTTPS says nothing about page content.",
  },
  {
    domain: "Security & Safety", pick: 2,
    q: "One API key is shared across dev, staging, and production, held in a team password note. Which TWO changes matter most? (Pick 2)",
    options: [
      "Separate keys per environment so a leaked dev key cannot touch production",
      "Move keys into a secrets manager with access control and rotation, out of shared notes",
      "Rename the key so its environment is obvious",
      "Base64-encode the key inside the note",
    ],
    correct: [0, 1],
    why: "Per-environment keys contain blast radius, and a secrets manager adds access control and rotation that a shared note cannot. Renaming is cosmetic and base64 is encoding, not protection.",
  },
  {
    domain: "Security & Safety", pick: 1,
    q: "Your safety review asks why you have a content policy in the system prompt AND output filtering AND tool-level least privilege. What principle are you applying?",
    options: [
      "Guardrail layering: no single control is relied on, so a bypass of one layer is caught by another",
      "Redundancy for its own sake, which the review should flag as waste since the strongest single control makes the other two unnecessary",
      "Defense by obscurity",
      "Compliance theatre required by the auditor",
    ],
    correct: [0],
    why: "Layered guardrails assume any single control can fail and back it with independent ones. Removing layers because one seems strongest recreates a single point of failure, and neither obscurity nor theatre describes overlapping enforceable controls.",
  },

  // ── Eval, Testing & Debugging ─────────────────────────────────
  {
    domain: "Eval & Debugging", pick: 1,
    q: "A teammate 'slightly improves' the extraction prompt and ships it directly; accuracy quietly drops for a week. What process change prevents this?",
    options: [
      "Run the eval suite on every prompt change and gate the deploy on the results, treating prompts like code",
      "Restrict prompt edits to senior engineers, whose judgement makes regressions unlikely enough that a formal gate adds little",
      "Freeze the prompt permanently",
      "Have the model self-assess whether the new prompt is better",
    ],
    correct: [0],
    why: "Prompts are behaviour: version them and gate changes on the eval suite, exactly like code. Seniority does not catch silent regressions, freezing blocks improvement, and self-assessment is not measurement.",
  },
  {
    domain: "Eval & Debugging", pick: 1,
    q: "A weather agent reports the wrong city. The trace shows the model called get_weather with city='Paris, Texas' while the user asked about Paris, France; the tool returned correct data for what it was asked. Where is the fault?",
    options: [
      "In the model's argument construction, an output-layer failure, not in the tool or the integration",
      "In the integration layer, since the harness should have corrected the city argument before dispatching the call to the tool",
      "In the tool, which should have guessed the intended city",
      "In the network between harness and tool",
    ],
    correct: [0],
    why: "The trace isolates it: the model built the wrong argument, so the failure is model output. The tool honestly answered what it was asked, harnesses do not silently rewrite arguments, and the network delivered everything correctly.",
  },
];

const QUESTIONS_5 = [
  {
    domain: "Understanding Requirements", pick: 1,
    q: "A stakeholder says 'the bot should understand customer intent.' Before building anything, what is the right next step?",
    options: [
      "Translate this into concrete functional requirements: which intents, what fields to extract, and what counts as a correct classification",
      "Start building immediately and let the model's general capability handle whatever 'intent' turns out to mean",
      "Pick the largest model so intent understanding is as strong as possible regardless of scope",
      "Write the system prompt first and derive requirements from what it ends up doing",
    ],
    correct: [0],
    why: "Vague business language must become checkable functional requirements before design starts. Building first, oversizing the model, or reverse-engineering requirements from a prompt all skip the step that makes the system buildable and testable.",
  },
  {
    domain: "Systems Life Cycle", pick: 1,
    q: "A Claude feature has shipped and is live. Which activity belongs to the operate-and-maintain phase of the life cycle, not an earlier phase?",
    options: [
      "Monitoring production quality and cost, and triaging regressions as the model or usage pattern shifts",
      "Writing the initial functional requirements",
      "Selecting which model tier to prototype with",
      "Designing the eval suite for the first release",
    ],
    correct: [0],
    why: "Operate-and-maintain is about post-launch monitoring and response to drift or regressions. Requirements, tier selection, and eval design happen earlier, during design and build.",
  },
  {
    domain: "Claude Application Design", pick: 1,
    q: "The same feature must work inside claude.ai, through the API, and inside Claude Code. A teammate assumes one well-written prompt will behave identically everywhere. What's the flaw?",
    options: [
      "Each surface wraps the prompt in different default context and instruction placement, so identical wording can still behave differently across them",
      "There is no flaw; a single prompt is guaranteed to behave identically across every interface",
      "Only the API supports system prompts",
      "Claude Code ignores system prompts entirely",
    ],
    correct: [0],
    why: "Different interfaces layer different default context and instruction handling around the same words, so behaviour can diverge. The API does support system prompts and Claude Code does not ignore them, and no interface guarantees identical behaviour by default.",
  },
  {
    domain: "Claude Application Design", pick: 1,
    q: "A plugin your app depends on requires plugin B at version 2.x, but you've pinned plugin B at 1.x elsewhere in the project. What kind of problem is this?",
    options: [
      "A plugin dependency conflict that must be resolved by aligning versions or isolating the plugins before either can be trusted in production",
      "A harmless duplication, since plugins do not share state and version numbers are cosmetic",
      "A pure performance issue that only affects load time",
      "Something only the model can resolve at runtime by picking whichever version seems newer",
    ],
    correct: [0],
    why: "Conflicting version requirements across plugins is a dependency conflict that needs explicit resolution, exactly like any software dependency graph. It is not cosmetic, not purely a performance concern, and not something the model silently arbitrates.",
  },
  {
    domain: "Configuration Management", pick: 2,
    q: "Your app pins claude-model-2026-06-15 in production. A new dated version is released with a documented breaking change to how it formats numbered lists. Which TWO are correct next steps?",
    options: [
      "Test the new version against your eval suite and downstream parser before promoting it",
      "Read the release notes for the specific breaking change and check whether your prompt or parser depends on the old formatting",
      "Upgrade immediately in production, since a dated release is always safe to adopt without testing",
      "Ignore the release notes since breaking changes only apply to floating aliases, not dated versions",
    ],
    correct: [0, 1],
    why: "A documented breaking change demands checking your specific dependency on the old behaviour and validating the new version against evals before promoting it. Dated versions are not automatically safe to adopt blind, and breaking changes affect anyone consuming that version, not just floating aliases.",
  },
  {
    domain: "Claude API Mechanics", pick: 1,
    q: "You invoke Claude through a third-party vendor's hosted endpoint rather than the first-party API. Which statement is accurate?",
    options: [
      "The Messages API request and response shape stays consistent, but authentication, available headers, and some access patterns can differ by vendor",
      "Third-party vendors run a completely different model that merely shares the same name",
      "Streaming is only available through the first-party API",
      "Tool use is unavailable when invoked through a third-party vendor",
    ],
    correct: [0],
    why: "Vendor-hosted access generally preserves the Messages API shape while differing in auth and some platform-specific details. It is the same model family, and streaming and tool use are not first-party exclusives.",
  },
  {
    domain: "Claude API Mechanics", pick: 1,
    q: "A single large system prompt is followed by a per-user profile block that changes daily, then the user's question. You want to cache as much as possible without caching stale profile data. What's the right move?",
    options: [
      "Place a cache breakpoint after the stable system prompt and a separate one after the profile block, so each stable segment is cached independently",
      "Cache the whole assembled prompt as one block, accepting that the profile section forces a full cache miss every time it changes",
      "Disable caching entirely since any dynamic content anywhere in the prompt invalidates the whole mechanism",
      "Move the profile block after the user's question so it no longer matters where it sits",
    ],
    correct: [0],
    why: "Multiple cache breakpoints let you cache each stable segment independently, so the daily profile change only invalidates its own segment, not the whole prefix. Caching as one block or disabling it entirely wastes the win available from the stable system prompt, and moving the profile block after the question does not by itself fix cache segmentation.",
  },
  {
    domain: "Software Engineering Foundations", pick: 1,
    q: "A 2,000-line 'do everything' prompt-handling function has become unreadable and every change risks breaking something else. What is the appropriate response?",
    options: [
      "Refactor incrementally into smaller, well-named functions with clear responsibilities, backed by tests, rather than rewriting from scratch",
      "Leave it alone since prompt-handling code is inherently unstructurable",
      "Rewrite it entirely from a blank file in one sitting with no tests",
      "Add a large explanatory comment at the top and continue extending the function as before",
    ],
    correct: [0],
    why: "Incremental, tested refactoring reduces risk while improving structure, which is the standard response to a growing single-responsibility violation. A full rewrite with no tests risks losing behaviour, a comment does not fix the structural problem, and 'it can't be structured' is simply false.",
  },
  {
    domain: "Software Engineering Foundations", pick: 1,
    q: "Two engineers each add a Claude-calling feature to the same file over the same sprint with no code review step. What SDLC practice is missing?",
    options: [
      "Code review integrated into the merge process, catching conflicting assumptions before they reach production",
      "A larger context window, which would have let one engineer see the other's changes automatically",
      "A more capable model, which would have resolved the conflicting assumptions on its own",
      "Prompt caching, which prevents merge conflicts",
    ],
    correct: [0],
    why: "Code review is the SDLC step that catches conflicting assumptions before merge; skipping it is exactly what let two independent changes collide. Context window size, model capability, and caching do not address a missing human review step.",
  },
  {
    domain: "LLM Fundamentals", pick: 1,
    q: "A colleague claims 'zero-shot' means the model has zero context about the task. What's the accurate description?",
    options: [
      "Zero-shot means no worked examples are given, though task instructions can still be detailed; the model has no example demonstrations to pattern-match against",
      "Zero-shot means the system prompt must be empty",
      "Zero-shot means the model ignores the user's question entirely",
      "Zero-shot only applies to classification tasks, never open-ended generation",
    ],
    correct: [0],
    why: "Zero-shot refers to the absence of example demonstrations, not the absence of instructions; you can still give detailed task instructions with zero examples. It does not require an empty system prompt, does not ignore the question, and applies beyond classification.",
  },
  {
    domain: "Technical Fundamentals", pick: 1,
    q: "A dashboard needs to show tokens streaming in over a persistent connection, with the server able to push updates without the client re-requesting. Which underlying technology is being described?",
    options: [
      "A websocket, which keeps a persistent bidirectional connection open",
      "A one-off synchronous REST call repeated on a polling interval",
      "The Message Batches API",
      "A CDN cache",
    ],
    correct: [0],
    why: "A websocket provides the persistent, bidirectional connection needed for server-pushed streaming updates. Polling re-requests repeatedly rather than staying open, Batches is asynchronous and non-live, and a CDN cache serves static content rather than a live stream.",
  },
  {
    domain: "Model Selection and Tradeoffs", pick: 1,
    q: "A legal-document summarizer must catch subtle contractual nuance, and an internal wiki search bot just needs to find the right page fast. How should tiers differ?",
    options: [
      "Use a higher-capability tier for the nuanced legal task and a faster, cheaper tier for the simpler retrieval-style task",
      "Use the same tier for both, since consistency across features matters more than matching capability to task difficulty",
      "Use the cheapest tier for both to control cost uniformly",
      "Use the highest tier for both to avoid any risk of missing something",
    ],
    correct: [0],
    why: "Matching tier to task difficulty is the core selection tradeoff: nuance-heavy work justifies a higher tier, and simple retrieval does not need it. Uniform tier choice in either direction either overpays or underserves one of the two tasks.",
  },
  {
    domain: "Agent Construction with Claude", pick: 1,
    q: "You're deciding between running an agent yourself on your own infrastructure versus using an Anthropic-hosted managed agent deployment. What's the core tradeoff?",
    options: [
      "Self-hosting gives you full control over infrastructure and data flow at the cost of operating it yourself; a managed deployment reduces operational burden at the cost of less infrastructure control",
      "There is no meaningful difference; both options run identically with identical operational responsibilities",
      "Self-hosting is always cheaper regardless of the team's operational capacity",
      "Managed deployment is only available for non-agentic use cases",
    ],
    correct: [0],
    why: "The tradeoff is control and operational burden versus convenience: self-hosting means you own the infrastructure, managed hosting shifts that operational load elsewhere. The two are not equivalent, cost depends on context rather than being universally lower for self-hosting, and managed deployment is squarely an agentic-use option.",
  },
  {
    domain: "Agent Patterns and Frameworks", pick: 2,
    q: "Which TWO are recognised agent design patterns for handling multi-step tasks?",
    options: [
      "A tool-use loop where the agent repeatedly calls tools and incorporates results until done",
      "Delegating a bounded subtask to a subagent that returns a compact result",
      "Hard-coding every possible input as its own branch so no runtime decision is ever needed",
      "Disabling all tools to force the model to reason purely from its own knowledge",
    ],
    correct: [0, 1],
    why: "The tool-use loop and subagent delegation are established agent patterns for multi-step work. Branching every possible input by hand is the workflow approach taken to an unworkable extreme, and disabling tools removes the agentic capability rather than patterning it.",
  },
  {
    domain: "Output Handling", pick: 1,
    q: "An assistant confidently states a statistic that sounds authoritative but cannot be traced to any source you gave it. What practice would have caught this before it reached the user?",
    options: [
      "Skepticism toward confident output: validate specific claims against your source material rather than trusting fluent, confident phrasing",
      "Nothing; if the phrasing is confident and fluent, the content is reliable",
      "Raising the temperature, since more varied phrasing tends to self-correct factual errors",
      "Switching to a smaller model, which hallucinates less than larger ones",
    ],
    correct: [0],
    why: "Confident, fluent phrasing is not evidence of accuracy, so specific claims need validation against real sources. Trusting fluency is exactly the failure mode, temperature does not fix factual grounding, and model size alone does not guarantee lower hallucination rates.",
  },
  {
    domain: "Output Handling", pick: 1,
    q: "Your API client currently does `json.loads(response)` with no try/except. What is the minimum defensive-parsing improvement?",
    options: [
      "Wrap the parse in error handling, validate the parsed structure against an expected schema, and define a fallback for malformed output",
      "Nothing needs to change as long as the prompt asks for JSON",
      "Increase max_tokens so the JSON is less likely to be malformed",
      "Add more few-shot examples of JSON output only, with no code-level changes at all",
    ],
    correct: [0],
    why: "Defensive parsing means handling the error, validating structure, and defining a fallback in code, since a prompt request alone does not guarantee conformance. max_tokens does not guarantee valid syntax, and examples help but do not substitute for code-level defense.",
  },
  {
    domain: "AI Application Security", pick: 1,
    q: "A request reaches your Claude-powered admin panel with a valid session cookie. Before letting it delete a user account, what must you additionally verify?",
    options: [
      "Authorization: that this specific authenticated identity is permitted to perform this specific action, not merely that they are logged in at all",
      "Nothing further; a valid session cookie is sufficient proof the action should proceed",
      "Only that the request is over HTTPS",
      "Only that the model itself agrees the action seems reasonable",
    ],
    correct: [0],
    why: "Authentication proves who someone is; authorization separately checks whether that identity may perform this specific action. A valid session alone does not establish permission, HTTPS protects transport not permission, and the model's own judgement is not an access control.",
  },
  {
    domain: "Guardrails and Safe Deployment", pick: 1,
    q: "Your content policy is enforced only by a single line in the system prompt. What is the recommended improvement per secure-by-design principles?",
    options: [
      "Layer independent enforcement: policy guidance in the prompt plus output-side filtering plus scoped tool permissions, so no single control is a single point of failure",
      "Make the system-prompt line longer and more emphatic, since a sufficiently detailed instruction is an adequate standalone control",
      "Remove the system-prompt line since it adds no value on its own",
      "Rely on the user to self-police what they ask for",
    ],
    correct: [0],
    why: "Secure-by-design calls for layered, independent controls rather than one probabilistic instruction. A longer prompt line is still a single, bypassable layer, removing it entirely drops even that layer, and user self-policing is not a control at all.",
  },
  {
    domain: "Claude Hooks", pick: 1,
    q: "You want a guarantee that a specific shell command can never run, no matter what the agent decides mid-session. Which mechanism actually provides a guarantee, as opposed to a strong suggestion?",
    options: [
      "A hook that deterministically intercepts and blocks the command before execution",
      "A detailed system-prompt paragraph forbidding that command",
      "Choosing a model known for being cautious",
      "Setting a lower temperature for that session",
    ],
    correct: [0],
    why: "A hook enforces deterministically at the point of execution, which is what a guarantee requires. A prompt instruction, a cautious model, or a lower temperature are all probabilistic and can be overridden by circumstances the guidance did not anticipate.",
  },
  {
    domain: "Identity, Secrets, and Key Management", pick: 1,
    q: "Your team wants to know, after the fact, exactly which service account accessed a sensitive internal tool and when. What capability does this require?",
    options: [
      "Authorized access monitoring and logging tied to identity, so actions can be attributed and reviewed after the fact",
      "A larger context window, so the model remembers who called it",
      "A single shared service account for simplicity",
      "Prompt caching on the tool's description",
    ],
    correct: [0],
    why: "After-the-fact attribution requires identity-tied access logging and monitoring. Context window size has nothing to do with audit trails, a single shared account destroys attributability, and caching a description is unrelated to access logs.",
  },
  {
    domain: "Tool Implementation", pick: 1,
    q: "You are designing a tool set for an agent and want to minimise wrong-tool selection from the start, before any bugs appear in production. Which practice addresses this proactively?",
    options: [
      "Write each tool's description to be mutually distinct, including when not to use it, and keep the tool set focused rather than sprawling",
      "Add as many tools as possible upfront so the agent has maximum flexibility for any future task",
      "Give every tool an identical, generic description so the agent isn't biased toward any one of them",
      "Rely on the model's general judgement and skip writing descriptions with much detail",
    ],
    correct: [0],
    why: "Distinct, well-scoped descriptions with explicit boundaries are the proactive defense against wrong-tool selection. A sprawling tool set or generic descriptions both increase ambiguity, and skipping detail leaves the model with nothing to disambiguate on.",
  },
  {
    domain: "Tool Implementation", pick: 1,
    q: "A tool call fails because the downstream service is temporarily down. What should the tool return to the agent?",
    options: [
      "A structured error indicating the failure is transient and retriable, distinct from a permanent or invalid-input failure",
      "An empty string with no further information",
      "The same generic error message regardless of whether the failure is temporary or permanent",
      "A silently truncated partial result with no indication anything went wrong",
    ],
    correct: [0],
    why: "A structured, categorised error lets the agent decide to retry, wait, or escalate appropriately. An empty string or generic message gives no actionable signal, and a silent partial result actively misleads the agent into treating a failure as success.",
  },
  {
    domain: "MCP Server Development", pick: 1,
    q: "An MCP server exposes a large static company glossary that Claude should be able to read into context when relevant, without the model needing to invoke an action to fetch it each time. Which MCP primitive fits best?",
    options: [
      "A resource",
      "A tool, since any content the model uses must be fetched through an explicit tool call",
      "A prompt template",
      "A transport setting",
    ],
    correct: [0],
    why: "Resources are the MCP primitive for exposing readable reference data the model can pull into context. Tools represent actions rather than passive reference data, prompts are user-invoked templates, and a transport is the communication channel, not content.",
  },
  {
    domain: "Agentic Customization", pick: 1,
    q: "A capability needs to call three different internal REST services with complex auth, be reused across five separate Claude applications, and be maintained by a dedicated platform team. Which approach fits best?",
    options: [
      "An MCP server, maintained centrally and connected to by each of the five applications",
      "A Skill duplicated into each of the five applications' repositories",
      "Five separate hand-written custom tools, one per application, kept manually in sync",
      "One shared, hardcoded block of instructions pasted into each application's system prompt",
    ],
    correct: [0],
    why: "Centralized maintenance, complex auth, and reuse across many applications is exactly the MCP server case. Duplicating a Skill or hand-syncing five custom tools both create maintenance burden the centralized server avoids, and pasted instructions cannot perform authenticated REST calls at all.",
  },
  {
    domain: "Agent Architecture", pick: 1,
    q: "A task's steps are mostly fixed, but one step occasionally needs the agent to choose between two valid approaches based on data it hasn't seen before. How should this be architected?",
    options: [
      "A workflow overall, with a small bounded agentic decision point only at the one variable step",
      "A fully autonomous agent for every step, since any variability anywhere means the whole task should be agentic",
      "A rigid workflow with no agentic step, requiring a human to manually pick the approach every time",
      "Two entirely separate hard-coded workflows, one per possible approach, chosen at random",
    ],
    correct: [0],
    why: "Mostly-fixed steps with one point of genuine judgement call for a workflow with a small bounded agentic decision, not a wholesale switch to autonomy. Full autonomy overcorrects for one variable point, a fully rigid workflow can't make the judgement call at all, and random selection ignores the data meant to inform the choice.",
  },
  {
    domain: "Agentic Customization", pick: 1,
    q: "A capability is purely a set of written instructions and reference examples for how to format a specific report, used only within Claude Code by one team, with no external system to call. Which approach fits, and why not an MCP server?",
    options: [
      "A Skill; there is no external capability or live system to expose, so a server would add operational overhead for no benefit",
      "An MCP server, because any reusable capability should default to a server regardless of whether it calls anything external",
      "A custom tool, since tools are the default choice whenever multiple people will use something",
      "Hard-coded into CLAUDE.md with no other structure, since it's team-specific",
    ],
    correct: [0],
    why: "Instructions and reference material with nothing external to call is the textbook Skill case; standing up a server here adds cost with no corresponding capability gained. Tools represent actions rather than formatting guidance, and while CLAUDE.md could hold some of this, a Skill is the structured, reusable form built for exactly this need.",
  },
  {
    domain: "Prompt Engineering", pick: 2,
    q: "Which TWO of these are examples of output constraints, as distinct from few-shot examples?",
    options: [
      "Specifying a maximum word count and a required set of JSON fields",
      "Requiring the response to omit any preamble and start directly with the answer",
      "Showing three worked input-output pairs before the real task",
      "Explaining the company's mission statement for context",
    ],
    correct: [0, 1],
    why: "A word limit and required field set, plus a no-preamble rule, are direct constraints on the shape of the output. Worked pairs are few-shot examples rather than constraints, and a mission-statement explanation is background context, not a constraint on output form.",
  },
  {
    domain: "Prompt Engineering", pick: 1,
    q: "A prompt buries the single most important instruction in the middle of six paragraphs of background. The model keeps missing it. What is the most direct fix?",
    options: [
      "Move the critical instruction to the beginning or end of the prompt, where models attend most reliably, and trim unnecessary background",
      "Repeat the six paragraphs of background twice so the instruction gets more total exposure",
      "Switch to a lower temperature so the model reads more carefully",
      "Add the instruction as a sixth occurrence in the middle so it appears more often",
    ],
    correct: [0],
    why: "Long inputs are read less reliably in the middle, so critical instructions belong at the start or end, with unneeded background trimmed. Doubling background or repeating mid-document placement does not fix the position problem, and temperature does not affect positional attention.",
  },
  {
    domain: "Context Engineering", pick: 1,
    q: "Two independent subagents each need a large shared reference document to complete their separate parts of a task, but the documents should not pollute each other's follow-up reasoning with the other's intermediate steps.",
    options: [
      "Give each subagent its own isolated context containing the shared reference, so their intermediate reasoning never crosses over",
      "Run both subagents in a single shared context so they can see each other's reasoning as it happens",
      "Give the reference document to only one subagent and have it verbally summarise the whole thing to the other",
      "Skip giving the document to either and let both reason from general knowledge instead",
    ],
    correct: [0],
    why: "Context isolation through separate subagent contexts lets each hold the shared reference without their intermediate reasoning bleeding together. A single shared context defeats the isolation goal, one subagent narrating to the other loses fidelity, and skipping the reference entirely abandons the actual source material.",
  },
];

const QUESTIONS_6 = [
  {
    domain: "Claude API Mechanics", pick: 1,
    q: "A moderation feature must flag live chat messages in under a second, and separately re-score the entire message archive once a month for a compliance report. How should these two needs be split?",
    options: [
      "Synchronous calls for live moderation; the Batches API for the monthly archive re-score",
      "Batches API for both, since consolidating everything onto one API path simplifies the codebase",
      "Synchronous calls for both, accepting the higher cost on the monthly re-score to avoid maintaining two code paths",
      "Streaming for the monthly re-score, since streaming is the cheapest option regardless of urgency",
    ],
    correct: [0],
    why: "Each workload matches its own SLA: live moderation needs realtime response, and the tolerant monthly job belongs on Batches for cost. Consolidating either way sacrifices either latency or cost for no real benefit, and streaming does not reduce per-token cost.",
  },
  {
    domain: "Claude API Mechanics", pick: 2,
    q: "Which TWO scenarios genuinely justify the Batches API over synchronous calls?",
    options: [
      "Re-indexing a document library overnight with no user waiting on the result",
      "Scoring a backlog of 200,000 support tickets for a weekly dashboard",
      "Answering a customer's question in a live chat widget",
      "Validating a form field as the user types",
    ],
    correct: [0, 1],
    why: "Both are large, latency-tolerant jobs with no one waiting on an immediate response, the batch sweet spot. Live chat and as-you-type validation both need an immediate synchronous response.",
  },
  {
    domain: "Model Selection and Tradeoffs", pick: 1,
    q: "A new model version is released with materially better reasoning but a documented change to how it escapes special characters in code output. Your pipeline parses that output with regex tuned to the old escaping. What is the safe migration path?",
    options: [
      "Test the new version against your parser and eval suite in staging, update the regex if needed, then promote deliberately",
      "Upgrade in production immediately, since better reasoning always outweighs a small formatting difference",
      "Ignore the new version permanently to avoid ever touching the parser again",
      "Turn off the parser and pass raw output straight to users",
    ],
    correct: [0],
    why: "A documented breaking change to output formatting demands validating and adjusting the dependent code before promotion. Upgrading blind risks silently breaking the parser, permanently freezing loses real capability gains, and disabling the parser abandons validation entirely.",
  },
  {
    domain: "Cost and Token Management", pick: 1,
    q: "You want to forecast next quarter's Claude spend for a feature that's growing 15% month over month. What inputs does a sound cost model need?",
    options: [
      "Historical token usage per request, the growth rate, and current per-token pricing, projected forward",
      "Only the current month's total invoice, extrapolated by guesswork",
      "The number of engineers on the team",
      "The size of the context window, regardless of how much of it is actually used per call",
    ],
    correct: [0],
    why: "A cost model needs actual usage data, a growth assumption, and pricing, projected forward systematically. Team size is irrelevant to spend, a single invoice extrapolated by guesswork lacks a growth basis, and window size alone says nothing about tokens actually consumed.",
  },
  {
    domain: "Tool Implementation", pick: 1,
    q: "An agent has both a client-side tool (reads the user's current form input) and a server-side tool (queries a production database). A refactor accidentally swaps their execution locations. What breaks first?",
    options: [
      "The tool meant to read live client state can no longer see it once it's forced to run server-side, since the server has no visibility into the user's in-browser state",
      "Nothing breaks, since tools are interchangeable regardless of where they execute",
      "Only latency changes; both tools still function identically otherwise",
      "The database tool becomes faster once running client-side",
    ],
    correct: [0],
    why: "Client-side tools depend on access to the user's local browser state, which a server cannot see; swapping execution location breaks that access entirely. Tools are not interchangeable across execution boundaries, and a database query running client-side would typically fail or be insecure, not simply run faster.",
  },
  {
    domain: "Tool Implementation", pick: 1,
    q: "A single tool named handle_request currently does lookup, validation, and notification all in one call, and the agent frequently gets confused about what result it will get back. What is the most direct fix?",
    options: [
      "Split it into three focused tools, each with one clear responsibility and a description that reflects it",
      "Rename the tool to something more exciting so it's memorable to the model",
      "Add a fourth responsibility so it's clearly the 'do everything' tool",
      "Leave the tool as is but add a longer usage example in the system prompt",
    ],
    correct: [0],
    why: "Splitting an overloaded tool into focused, single-responsibility tools with matching descriptions removes the ambiguity about what each call returns. Renaming or adding more responsibilities does not address the confusion, and a longer example patches around a design problem rather than fixing it.",
  },
  {
    domain: "Agent Architecture", pick: 1,
    q: "A workflow currently branches on eleven different document types with a dedicated code path for each, and a twelfth type just appeared with no existing path. The team's instinct is to add a twelfth branch. What should you consider instead?",
    options: [
      "Whether the branching factor itself signals this is now agent territory, since new document types keep appearing faster than branches can be written",
      "Immediately writing the twelfth branch, since workflows should always be extended to cover every new case as it appears",
      "Deleting all eleven existing branches and starting over with no clear replacement",
      "Ignoring the twelfth document type entirely until a branch is convenient to write",
    ],
    correct: [0],
    why: "A workflow whose branch count keeps growing faster than you can maintain is the signal to reconsider the architecture, not just add branch twelve. Endless branch-adding is the losing race that motivated the reconsideration, deleting everything with no plan is reckless, and ignoring new input types loses real work.",
  },
  {
    domain: "Agent Construction with Claude", pick: 1,
    q: "You're deciding whether to build a custom agent loop from scratch or use the Claude Agent SDK. Your team has no existing orchestration code and a tight deadline. What does the SDK offer that changes the calculus?",
    options: [
      "Built-in handling for the tool-use loop, context management, and common agent patterns, reducing what you must build and test yourself",
      "A completely different model with different capabilities than the raw API",
      "Guaranteed lower per-token pricing versus calling the API directly",
      "Automatic conversion of any workflow into an agent regardless of whether that fits the task",
    ],
    correct: [0],
    why: "The Agent SDK provides scaffolding for the loop and common patterns, cutting the amount of custom orchestration code a tight deadline would otherwise require. It is the same underlying model family, does not change per-token pricing, and does not override the workflow-versus-agent decision for you.",
  },
  {
    domain: "Prompt Engineering", pick: 1,
    q: "A tone-of-voice instruction sits in the system prompt, and a conflicting tone instruction appears in the user's message. Which generally takes precedence, and why does this matter for design?",
    options: [
      "The system prompt is the higher-priority, more durable placement, so critical constraints belong there rather than relying on user messages to enforce them",
      "The user message always overrides the system prompt with no exceptions in any case",
      "Whichever instruction is longer wins",
      "Neither takes precedence; the model picks arbitrarily and this is unpredictable by design",
    ],
    correct: [0],
    why: "The system prompt carries durable priority, which is exactly why critical constraints belong there rather than being left to a user message to reinforce. Length is not the deciding factor, and precedence is not arbitrary, it follows deliberate placement.",
  },
  {
    domain: "Prompt Engineering", pick: 1,
    q: "Your instructions ask the model to 'be concise,' but responses stay long regardless. What refinement is more likely to work?",
    options: [
      "Replace the vague adjective with a specific constraint, such as a maximum sentence or word count",
      "Repeat the word 'concise' several times in the same sentence for emphasis",
      "Remove the instruction entirely, since vague adjectives never influence length at all",
      "Switch to a different model tier without changing the instruction",
    ],
    correct: [0],
    why: "A concrete constraint gives the model something specific to satisfy, unlike a vague adjective open to interpretation. Repetition of the same vague word does not add precision, dropping the instruction abandons the goal, and a tier swap does not fix an underspecified constraint.",
  },
  {
    domain: "Context Engineering", pick: 1,
    q: "An agent's context contains the full text of 12 API responses from earlier tool calls, most of which are no longer relevant to the current step, and quality is degrading. What is the appropriate context management move?",
    options: [
      "Prune the stale tool outputs, keeping only what remains relevant to the current step, to reclaim budget and reduce noise",
      "Leave all 12 in place since removing any tool output risks losing information the agent might need eventually",
      "Add a 13th tool call to compensate",
      "Switch to a smaller model so the existing context fits more comfortably",
    ],
    correct: [0],
    why: "Pruning stale, no-longer-relevant tool outputs is the direct fix for both budget pressure and quality degradation from noise. Keeping everything indefinitely is what caused the problem, adding another call adds more clutter, and a smaller model does not resolve an oversized, noisy context.",
  },
  {
    domain: "Claude Application Design", pick: 1,
    q: "Your application's schema for a structured extraction task has 40 optional fields, and the model frequently fills in plausible-looking but incorrect values for fields that weren't actually present in the source document. What design issue does this point to?",
    options: [
      "The schema likely needs a way to represent 'field not found' explicitly, rather than forcing a value into every field regardless of whether it's supported by the input",
      "The model tier is too small and should simply be upgraded",
      "The document input format is unsupported",
      "The schema has too few fields and should be expanded further",
    ],
    correct: [0],
    why: "Forcing a value into every field encourages fabrication when the source lacks that data; an explicit null or not-found representation lets the model report absence honestly. Model tier is not the driver of a schema design gap, the input format is not implicated, and adding more fields compounds rather than fixes the issue.",
  },
  {
    domain: "Claude Application Design", pick: 1,
    q: "Multiple features in your app each maintain their own separate conversation with Claude for the same end user, and none of them share any awareness of the others. A user complains the assistant 'forgets' things between features. What's the actual architecture answer here?",
    options: [
      "This may be an intentional design tradeoff: some features genuinely warrant separate, isolated conversations, and cross-feature memory is a distinct feature to design deliberately if wanted, not an automatic default",
      "Every feature must always share one giant conversation so nothing is ever forgotten",
      "The context window is too small and must be increased before anything else can be considered",
      "This is always a bug that must be fixed by merging all conversations",
    ],
    correct: [0],
    why: "Session boundaries are a design choice: isolated conversations per feature are often correct for scoping and privacy, and shared cross-feature memory, if wanted, needs to be built deliberately rather than assumed. Forcing one shared conversation ignores legitimate isolation needs, window size is not the driver here, and calling it an automatic bug skips the actual design tradeoff.",
  },
  {
    domain: "AI Application Security", pick: 2,
    q: "A document-processing agent reads uploaded files from anonymous users before any human review. Which TWO practices reduce the risk of those files carrying manipulative embedded instructions?",
    options: [
      "Treat uploaded file content as untrusted data, isolated from the agent's own instructions",
      "Scope the agent's available actions tightly, so even a manipulated read cannot trigger a sensitive operation",
      "Trust the content fully once the file passes a virus scan, since malware and prompt injection are the same category of risk",
      "Increase the model's context window so it can read the whole file at once",
    ],
    correct: [0, 1],
    why: "Isolating untrusted file content from trusted instructions, plus tightly scoping available actions, are the two levers that blunt embedded manipulation. A virus scan addresses malware, not textual injection, which is a different risk entirely, and context window size has no bearing on injection resistance.",
  },
  {
    domain: "AI Application Security", pick: 1,
    q: "A user directly asks your assistant, in plain conversation, to roleplay as an unrestricted version of itself with no rules. Is this the same category of risk as a webpage with hidden malicious instructions, and does it need the same fix?",
    options: [
      "No; this is a jailbreak attempt via direct conversation, addressed through policy and refusal training, whereas the webpage case is injection via untrusted content, addressed through isolation and least privilege",
      "Yes; both are identical attacks solved by the exact same single technical control",
      "No; the direct request is not a risk at all since the user is a legitimate, authenticated party",
      "Yes, but only because both involve text",
    ],
    correct: [0],
    why: "These are genuinely distinct risk categories with distinct mitigations: jailbreak attempts are handled through the model's own policy and refusal behaviour, while content injection is handled through isolating untrusted data and limiting what it can trigger. Being authenticated does not make a jailbreak attempt harmless, and 'both involve text' is too shallow a similarity to imply one fix covers both.",
  },
  {
    domain: "Guardrails and Safe Deployment", pick: 1,
    q: "Your team is deciding where to place a content-policy check: only once, at the very end after the full response is generated, or additionally earlier in the pipeline. What does layering suggest?",
    options: [
      "Check at multiple points, since an end-only check misses the chance to prevent an issue earlier and provides no depth if that single check is bypassed or misses something",
      "A single end-of-pipeline check is always sufficient and additional checks are pure redundancy with no value",
      "Policy checks should only ever run on user input, never on the model's own output",
      "Policy checks are unnecessary if the system prompt already states the policy",
    ],
    correct: [0],
    why: "Layered guardrails at multiple points reduce reliance on any single check catching everything. A lone end check has no backup if it fails, restricting checks to input-only ignores output-side risk entirely, and a system-prompt statement alone is a probabilistic control, not a full guardrail.",
  },
  {
    domain: "Identity, Secrets, and Key Management", pick: 1,
    q: "A contractor's temporary access to your Claude API key needs to end automatically when their contract does, without anyone remembering to manually revoke it. What capability addresses this?",
    options: [
      "Scoped, time-limited credentials or access grants tied to identity, rather than a long-lived shared key with indefinite validity",
      "A stronger password on the shared key",
      "Asking the contractor to delete the key from their notes when they leave",
      "Increasing the rate limit on the key so contractor usage doesn't interfere with production traffic",
    ],
    correct: [0],
    why: "Time-bound, identity-scoped credentials expire on their own, removing the dependence on someone remembering to revoke access manually. A stronger password does not add an expiry, relying on the departing contractor to self-revoke is not a control, and rate limits address throughput, not access lifecycle.",
  },
  {
    domain: "Debugging and Error Handling", pick: 1,
    q: "A multi-step agent produces a wrong final report. The trace shows the retrieval tool returned the correct documents, and the model's summary of them is accurate, but a formatting tool downstream truncated the summary mid-sentence before it reached the user. Where is the fault?",
    options: [
      "In the formatting tool or its integration into the pipeline, since both retrieval and model reasoning were correct up to that point",
      "In the model's reasoning, since a wrong final report always originates from the model regardless of what the trace shows",
      "In the retrieval tool, since it's the earliest step and therefore always the first thing to suspect",
      "In the user's original request, since it must have been ambiguous",
    ],
    correct: [0],
    why: "Tracing shows the fault entering exactly where the truncation occurred, downstream of correct retrieval and correct model reasoning, so the formatting tool or its wiring is where to look. Blaming the model or the earliest step by default ignores what the trace actually shows, and nothing in the trace implicates the original request.",
  },
  {
    domain: "Debugging and Error Handling", pick: 1,
    q: "An error handler currently catches every exception type identically and always tells the user to 'try again later,' whether the cause is a bad user input, a rate limit, or a permanent server error. What is the improvement?",
    options: [
      "Classify errors by type and recoverability, and choose the recovery strategy and user-facing message per category rather than one generic response",
      "Keep the single generic message, since users don't need to know the distinction between error types",
      "Log the errors in more detail internally without changing what the user is ever told",
      "Remove error handling entirely and let exceptions surface raw to the user",
    ],
    correct: [0],
    why: "Different error categories call for different recovery strategies and different user messaging, which a single blanket response cannot provide. Users benefit from knowing whether to retry, fix input, or wait, better internal logging alone doesn't change the poor user experience, and removing handling entirely is a regression, not an improvement.",
  },
  {
    domain: "MCP Server Development", pick: 1,
    q: "You're choosing a transport for an MCP server that will be called by a client on a different machine over the network, with no requirement for a persistent open connection between calls. Which fits best, and why not stdio?",
    options: [
      "An HTTP-based transport, since it supports request-based network communication; stdio assumes a local subprocess sharing standard input and output on the same machine",
      "stdio, since it works over any network as long as both machines are on the same subnet",
      "Either works identically regardless of whether the client and server share a machine",
      "A raw TCP socket is the only valid choice for any MCP server",
    ],
    correct: [0],
    why: "HTTP-based transport fits a remote, request-oriented client-server relationship; stdio is designed for a local subprocess communicating over shared standard input and output, not cross-machine networking. The two transports are not interchangeable regardless of topology, and MCP is not limited to raw TCP sockets as the only network option.",
  },
  {
    domain: "MCP Server Development", pick: 1,
    q: "Your MCP server currently returns raw, unvalidated data straight from an upstream API to Claude, including occasional malformed records. What server-side practice would improve robustness?",
    options: [
      "Validate and normalise the data before returning it, so malformed upstream records don't reach the model as if they were clean",
      "Pass everything through unchanged, since validation is solely the responsibility of whichever application calls the server",
      "Stop returning any data at all if the upstream service is ever imperfect",
      "Cache the malformed records so they are returned consistently every time",
    ],
    correct: [0],
    why: "A well-built server validates and normalises what it returns, rather than passing upstream imperfections straight through as if clean. Deferring entirely to the calling application ignores the server's own responsibility, refusing all data over occasional flaws is an overcorrection, and caching malformed records preserves the very problem being raised.",
  },
  {
    domain: "Agentic Customization", pick: 1,
    q: "A capability must call a live, authenticated internal API and also needs to be reachable identically from three unrelated internal tools your company builds. Weighing Skills, custom tools, and MCP, which fits, and what rules out a Skill here?",
    options: [
      "An MCP server; a Skill is instructional content and cannot itself make authenticated live API calls on its own",
      "A Skill, since Skills can natively perform any authenticated API call given the right description",
      "A custom tool duplicated by hand into each of the three consuming tools",
      "None of the three approaches fit a live authenticated API",
    ],
    correct: [0],
    why: "Live, authenticated API access reused across multiple consumers is the MCP server case; a Skill is packaged instructions and reference material, not a mechanism for making live authenticated calls itself. Hand-duplicating a custom tool three times creates the exact maintenance burden a shared server avoids, and this is squarely within scope for one of the three approaches.",
  },
  {
    domain: "Software Engineering Foundations", pick: 1,
    q: "A team wants to add Claude-based text classification to an existing synchronous request-handling pipeline that currently blocks on every I/O call. What foundational concern should be addressed before adding the new blocking API call?",
    options: [
      "Whether the pipeline should move to asynchronous, non-blocking I/O so a slow classification call doesn't stall unrelated requests",
      "Whether the classification labels should be stored as strings or integers",
      "Whether the git branch naming convention should change",
      "Whether the team's code editor supports syntax highlighting for the new code",
    ],
    correct: [0],
    why: "Adding another blocking network call to an already-blocking pipeline is exactly the concurrency concern to address before shipping, since one slow call would otherwise stall unrelated work. Label storage format, branch naming, and editor tooling are unrelated to the concurrency risk being introduced.",
  },
  {
    domain: "Systems Life Cycle", pick: 1,
    q: "Which of these activities most clearly belongs to the design phase rather than the build or operate phases of the systems life cycle?",
    options: [
      "Deciding the overall architecture, including workflow-versus-agent tradeoffs and model tier selection, before writing implementation code",
      "Fixing a production incident that occurred last night",
      "Writing the actual integration code against the chosen API",
      "Monitoring live cost dashboards after launch",
    ],
    correct: [0],
    why: "Architectural decisions made before implementation begins are squarely design-phase work. Fixing an incident and monitoring dashboards are operate-phase activities, and writing the integration code is build-phase, both of which come after design decisions are made.",
  },
  {
    domain: "Understanding Requirements", pick: 1,
    q: "A requirement states 'the system must respond quickly.' What is missing that would make this usable for design and testing?",
    options: [
      "A concrete, measurable target, such as a specific latency percentile under a specific load, so it can be checked objectively",
      "Nothing; 'quickly' is specific enough to design and test against directly",
      "A list of every possible future feature the system might ever need",
      "The name of the engineer responsible for writing the code",
    ],
    correct: [0],
    why: "A vague adjective like 'quickly' cannot be checked without a concrete, measurable target such as a latency percentile under a defined load. It is not sufficiently specific as written, an exhaustive future feature list is unrelated to this gap, and naming an engineer does not make the requirement testable.",
  },
  {
    domain: "Agent Patterns and Frameworks", pick: 1,
    q: "An agent's memory currently holds every tool call and result from the entire session with no pruning, and by turn 40 the agent starts repeating earlier mistakes it should have already learned from. What does this suggest about how memory is being used?",
    options: [
      "Raw accumulation without summarisation or structuring may bury the useful signal in volume, so what's kept needs curating, not just retained indefinitely",
      "Memory should be disabled entirely, since any memory clearly makes agents worse over time",
      "The agent needs a larger context window and nothing else needs to change",
      "The problem is unrelated to memory and is purely a model-capability issue",
    ],
    correct: [0],
    why: "Unstructured accumulation can bury useful signal under volume; the fix is curating what's retained rather than keeping everything indefinitely or dropping memory altogether. A bigger window without curation still drowns in the same noise, and this is a memory-management issue, not simply a capability ceiling.",
  },
];

const SETS = [
  { id: 1, label: "Practice Set I", questions: QUESTIONS_1 },
  { id: 2, label: "Practice Set II", questions: QUESTIONS_2 },
  { id: 3, label: "Practice Set III", questions: QUESTIONS_3 },
  { id: 4, label: "Practice Set IV", questions: QUESTIONS_4 },
  { id: 5, label: "Practice Set V", questions: QUESTIONS_5 },
  { id: 6, label: "Practice Set VI", questions: QUESTIONS_6 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function shuffleOptions(q) {
  const order = shuffle(q.options.map((_, i) => i));
  const options = order.map((i) => q.options[i]);
  const correct = q.correct.map((c) => order.indexOf(c));
  return { ...q, options, correct };
}
function buildDeck(questions) { return shuffle(questions).map(shuffleOptions); }
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

const Disclaimer = () => (
  <p style={{ fontSize: 11.5, color: "#B9A8D8", textAlign: "center", maxWidth: 700, marginTop: 18, lineHeight: 1.5 }}>
    Independent study tool based on publicly available exam guide material. Not affiliated with, endorsed by, or sourced from Anthropic's official exam content.
  </p>
);

function Header({ subtitle }) {
  return (
    <div style={{ width: "100%", maxWidth: 720, marginBottom: 20 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(22px,4vw,28px)", color: "#fff", lineHeight: 1.1 }}>
        Claude Certified Developer <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "clamp(12px,2vw,15px)", color: "#B9A8D8" }}>· Made by Anas Riad</span>
      </div>
      <div style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "#B9A8D8", fontWeight: 600, marginTop: 2 }}>
        {subtitle}
      </div>
    </div>
  );
}

function btn(bg, fg, disabled) {
  return {
    width: "100%", padding: "14px 20px", borderRadius: 13, border: "none",
    background: bg, color: fg, fontSize: 15, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
    transition: "background .15s",
  };
}

const wrapStyle = {
  minHeight: "100vh",
  background: `radial-gradient(1200px 600px at 80% -10%, ${C.purpleSoft} 0%, ${C.purple} 55%)`,
  fontFamily: "'Inter', system-ui, sans-serif", color: C.paper,
  padding: "clamp(16px, 4vw, 48px)", display: "flex", flexDirection: "column",
  alignItems: "center", boxSizing: "border-box",
};
const cardStyle = {
  width: "100%", maxWidth: 720, background: C.paper, color: C.ink, borderRadius: 22,
  padding: "clamp(22px, 4vw, 38px)", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", boxSizing: "border-box",
};

function HomeScreen({ onSelect }) {
  return (
    <div style={wrapStyle}>
      <Header subtitle="Foundations · Exam Prep" />
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
          color: C.green, marginBottom: 10,
        }}>
          Mock exam preparation
        </div>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(24px,4.5vw,32px)",
          color: C.purple, margin: "0 0 14px", lineHeight: 1.2,
        }}>
          Claude Certified Developer<br />Foundations Practice
        </h1>
        <p style={{ fontSize: 14.5, color: "#555", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 28px" }}>
          Six independent 30-question practice sets, scenario-based, built to mirror the
          real exam's format and difficulty. Pick any set below to begin. Each question
          shows instant feedback with a full explanation.
        </p>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          marginBottom: 22,
        }}>
          <div style={{ height: 1, flex: 1, background: "#E1DED7" }} />
          <span style={{
            fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15,
            color: C.purple, whiteSpace: "nowrap",
          }}>
            Get started
          </span>
          <div style={{ height: 1, flex: 1, background: "#E1DED7" }} />
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12, marginBottom: 8,
        }}>
          {SETS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                padding: "18px 12px", borderRadius: 14, border: `1.5px solid ${C.tealDeep}`,
                background: C.teal, color: C.purple, cursor: "pointer",
                fontFamily: "'Inter', sans-serif", transition: "all .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.tealDeep; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.teal; }}
            >
              <span style={{
                fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 26, color: C.purple,
              }}>
                {s.id}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: "#3E7A6E" }}>30 questions</span>
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12.5, color: "#999", marginTop: 18, marginBottom: 0, lineHeight: 1.5 }}>
          Your progress is <strong>not saved</strong>. If you refresh or close this page mid-quiz,
          you'll need to start that set over from question 1.
        </p>
      </div>
      <Disclaimer />
    </div>
  );
}

function QuizScreen({ set, onHome }) {
  const [deck, setDeck] = useState(() => buildDeck(set.questions));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState([]);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const total = deck.length;
  const question = deck[idx];
  const isCorrect = checked && arraysEqual(selected, question.correct);

  const toggle = (i) => {
    if (checked) return;
    if (question.pick === 1) setSelected([i]);
    else setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < question.pick ? [...prev, i] : prev
    );
  };
  const check = () => {
    if (selected.length !== question.pick) return;
    setChecked(true);
    setResults((r) => [...r, { correct: arraysEqual(selected, question.correct), domain: question.domain }]);
  };
  const next = () => {
    if (idx + 1 >= total) setDone(true);
    else { setIdx(idx + 1); setSelected([]); setChecked(false); }
  };
  const restart = () => {
    setDeck(buildDeck(set.questions)); setIdx(0); setSelected([]);
    setChecked(false); setResults([]); setDone(false);
  };

  const score = results.filter((r) => r.correct).length;
  const byDomain = {};
  results.forEach((r) => {
    if (!byDomain[r.domain]) byDomain[r.domain] = { c: 0, t: 0 };
    byDomain[r.domain].t += 1; if (r.correct) byDomain[r.domain].c += 1;
  });

  if (done) {
    const pct = Math.round((score / total) * 100);
    const pass = pct >= 72;
    return (
      <div style={wrapStyle}>
        <Header subtitle={`Foundations · ${set.label}`} />
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(15px,2.5vw,17px)", letterSpacing: 2, textTransform: "uppercase", color: C.green, fontWeight: 600 }}>
            {set.label} complete
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(52px,12vw,80px)", fontWeight: 700, lineHeight: 1, margin: "10px 0 2px", color: C.purple }}>
            {score}<span style={{ color: C.tealDeep, fontSize: "0.5em" }}>/{total}</span>
          </div>
          <div style={{ fontSize: 15, color: pass ? C.green : C.red, fontWeight: 600, marginBottom: 4 }}>
            {pct}% {pass ? "· above the 72% cut line" : "· below the 72% cut line"}
          </div>
          <p style={{ fontSize: 14, color: "#555", margin: "0 0 22px" }}>
            {pass ? "Solid pass. Review any red domains below if you'd like." : "Below the cut line, review the red domains below."}
          </p>
          <div style={{ textAlign: "left", marginBottom: 24 }}>
            {Object.entries(byDomain).map(([d, v]) => {
              const p = Math.round((v.c / v.t) * 100);
              return (
                <div key={d} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                    <span>{d}</span><span style={{ color: p >= 72 ? C.green : C.red }}>{v.c}/{v.t}</span>
                  </div>
                  <div style={{ height: 8, background: "#EEE", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${p}%`, height: "100%", background: p >= 72 ? C.green : C.red, borderRadius: 99, transition: "width .5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={restart} style={btn(C.purple, C.paper)}>Retake this set</button>
            <button onClick={onHome} style={btn(C.teal, C.purple)}>← Choose another set</button>
          </div>
        </div>
        <Disclaimer />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <Header subtitle={`Foundations · ${set.label}`} />
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button onClick={onHome} style={{
            background: "none", border: "none", color: "#9A8CB8", fontSize: 12,
            fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: 0,
          }}>
            ← Home
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.green }}>
            {question.domain}
          </span>
          <span style={{ fontSize: 13, color: "#999", fontWeight: 600 }}>{idx + 1} / {total}</span>
        </div>
        <div style={{ height: 6, background: "#ECECEC", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ width: `${((idx + (checked ? 1 : 0)) / total) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.tealDeep}, ${C.green})`, borderRadius: 99, transition: "width .4s" }} />
        </div>

        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(18px,3vw,22px)", fontWeight: 600, lineHeight: 1.35, margin: "0 0 4px", color: C.purple }}>
          {question.q}
        </h2>
        {question.pick > 1 && (
          <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 14 }}>
            Select {question.pick} · chosen {selected.length}
          </div>
        )}
        {question.pick === 1 && <div style={{ height: 14 }} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {question.options.map((opt, i) => {
            const isSel = selected.includes(i);
            const isRight = question.correct.includes(i);
            let bg = "#fff", border = "#E1DED7", fg = C.ink, mark = null;
            if (!checked && isSel) { bg = C.teal; border = C.tealDeep; }
            if (checked && isRight) { bg = C.greenSoft; border = C.green; fg = "#1E5E16"; mark = "✓"; }
            if (checked && isSel && !isRight) { bg = C.redSoft; border = C.red; fg = C.red; mark = "✗"; }
            return (
              <button key={i} onClick={() => toggle(i)} disabled={checked}
                style={{
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  background: bg, border: `1.5px solid ${border}`, color: fg,
                  borderRadius: 13, padding: "13px 15px", fontSize: 14.5, fontWeight: 500,
                  cursor: checked ? "default" : "pointer", transition: "all .15s",
                  fontFamily: "'Inter', sans-serif", lineHeight: 1.45,
                }}>
                <span style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: question.pick > 1 ? 7 : 99,
                  border: `1.5px solid ${isSel || (checked && isRight) ? border : "#CFC9BE"}`,
                  background: (checked && isRight) ? C.green : (checked && isSel && !isRight) ? C.red : isSel ? C.tealDeep : "#fff",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {mark || (isSel && !checked ? "•" : "")}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {checked && (
          <div style={{
            marginTop: 18, padding: "14px 16px", borderRadius: 13,
            background: isCorrect ? C.greenSoft : C.redSoft,
            border: `1.5px solid ${isCorrect ? C.green : C.red}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: isCorrect ? "#1E5E16" : C.red, marginBottom: 4 }}>
              {isCorrect ? "Correct" : "Not quite"}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "#333" }}>{question.why}</div>
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          {!checked ? (
            <button onClick={check} disabled={selected.length !== question.pick}
              style={btn(selected.length === question.pick ? C.purple : "#CFC9BE", C.paper, selected.length !== question.pick)}>
              Check answer
            </button>
          ) : (
            <button onClick={next} style={btn(C.green, "#fff")}>
              {idx + 1 >= total ? "See results" : "Next question →"}
            </button>
          )}
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home"); // "home" | 1..6

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  if (view === "home") {
    return <HomeScreen onSelect={(id) => setView(id)} />;
  }
  const set = SETS.find((s) => s.id === view);
  return <QuizScreen key={view} set={set} onHome={() => setView("home")} />;
}
