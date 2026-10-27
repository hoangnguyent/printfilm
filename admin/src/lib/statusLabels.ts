/** Project pipeline status → English label */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SCRIPTING: "Generating Script",
  SCRIPT_READY: "Script Ready",
  IMAGING: "Generating Storyboards",
  IMAGE_READY: "Storyboards Ready",
  VIDEOING: "Generating Video",
  VIDEO_READY: "Video Ready",
  AUDIOING: "Generating Voice",
  COMPOSING: "Composing",
  AUDITING: "Under Review",
  DONE: "Completed",
  REJECTED: "Rejected",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** Order payment status → English */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  closed: "Closed",
};

/** Work audit / visibility → English */
export const AUDIT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  passed: "Approved",
  rejected: "Rejected",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  private: "Private",
  unlisted: "Unlisted",
};

/** Wallet ledger kind → English */
export const LEDGER_KIND_LABELS: Record<string, string> = {
  topup: "Top-up",
  grant: "Grant",
  adjust: "Adjustment",
  freeze: "Freeze",
  unfreeze: "Unfreeze",
  settle: "Settlement",
  refund: "Refund",
};

/** Payment channel → English */
export const PAY_TYPE_LABELS: Record<string, string> = {
  alipay: "Alipay",
  wxpay: "WeChat Pay",
};

/** Unified task platform status → English */
export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  leased: "Leased",
  running: "Running",
  awaiting_poll: "Awaiting Poll",
  awaiting_review: "Awaiting Review",
  cancel_requested: "Cancelling",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Task domain → English */
export const TASK_DOMAIN_LABELS: Record<string, string> = {
  drama: "Drama",
  kepu: "AI Short Video",
  tools: "Tools",
  studio: "Studio",
  api: "Open API",
};

/** Task type → English (lightweight synchronous and platform tasks) */
export const TASK_TYPE_LABELS: Record<string, string> = {
  agent_chat: "Drama Assistant Chat",
  skill_optimize: "Skill Prompt Optimization",
  voice_prompt: "Character Voice Description",
  content_expand: "Topic Expansion",
  script_summary: "Script Summary",
  episode_script: "Episode Script",
  fragment_plan: "AI Storyboard",
  fragment_video: "Storyboard Video",
  seed_assets: "Asset Extraction",
  asset_image: "Asset Image Generation",
  asset_video: "Asset Video Generation",
  voice_synthesis: "Voice Synthesis",
  project_pipeline: "Short Video Pipeline",
  shot_regen_image: "Regenerate Shot Image",
  shot_regen_video: "Regenerate Shot Video",
  shot_regen_audio: "Regenerate Shot Audio",
  project_regen_audio: "Regenerate Full Voice Track",
  project_compose_only: "Compose Only",
  v1_image: "API Image Generation",
  v1_video: "API Video Generation",
  v1_seedance: "API Seedance",
  tool_image: "Tool Image Generation",
  tool_video: "Tool Video Generation",
};

// Resolve project status display text
export function projectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status] ?? status;
}

// Resolve order status display text
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

// Resolve audit status display text
export function auditStatusLabel(status: string): string {
  return AUDIT_STATUS_LABELS[status] ?? status;
}

// Resolve visibility display text
export function visibilityLabel(status: string): string {
  return VISIBILITY_LABELS[status] ?? status;
}

// Resolve ledger kind display text
export function ledgerKindLabel(kind: string): string {
  return LEDGER_KIND_LABELS[kind] ?? kind;
}

// Resolve pay type display text
export function payTypeLabel(payType: string): string {
  return PAY_TYPE_LABELS[payType] ?? payType;
}

// Resolve task status display text
export function taskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

// Resolve task domain display text
export function taskDomainLabel(domain: string): string {
  return TASK_DOMAIN_LABELS[domain] ?? domain;
}

// Resolve task type display text
export function taskTypeLabel(taskType: string): string {
  return TASK_TYPE_LABELS[taskType] ?? taskType;
}

/** Filter options for project status select (value stays English for API) */
export const PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
