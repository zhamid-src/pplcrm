import { PcIconNameType } from '@icons/icons.index';

export type SettingsFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'select'
  | 'toggle'
  | 'password'
  | 'url'
  | 'date';

export interface SettingsOptionConfig {
  label: string;
  value: string;
}

export interface SettingsFieldConfig {
  key: string;
  label: string;
  type: SettingsFieldType;
  placeholder?: string;
  helper?: string;
  options?: SettingsOptionConfig[];
  defaultValue?: unknown;
}

export interface SettingsSectionConfig {
  id: string;
  title: string;
  description: string;
  icon: PcIconNameType;
  fields: SettingsFieldConfig[];
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'organization',
    title: 'Organization',
    description: 'Tenant branding, contact details, and campaign defaults.',
    icon: 'cog-6-tooth',
    fields: [
      {
        key: 'organization.name',
        label: 'Organization Name',
        type: 'text',
        placeholder: 'PeopleCRM',
        defaultValue: '',
      },
      {
        key: 'organization.contact_email',
        label: 'Primary Contact Email',
        type: 'email',
        placeholder: 'hello@example.com',
        defaultValue: '',
      },
      {
        key: 'organization.phone',
        label: 'Contact Phone',
        type: 'tel',
        placeholder: '(555) 555-1234',
        defaultValue: '',
      },
      {
        key: 'organization.address',
        label: 'Mailing Address',
        type: 'textarea',
        placeholder: '123 Main St, Springfield, USA',
        defaultValue: '',
      },
      {
        key: 'campaign.reporting_period',
        label: 'Reporting Period',
        type: 'select',
        defaultValue: 'monthly',
        options: [
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
        ],
      },
      {
        key: 'campaign.primary_goal',
        label: 'Primary Goal Metric',
        type: 'text',
        placeholder: 'Doors knocked, donations, etc.',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'communications',
    title: 'Communications',
    description: 'Email delivery, inbox routing, and compliance copy.',
    icon: 'envelope',
    fields: [
      {
        key: 'communications.default_from_name',
        label: 'Default From Name',
        type: 'text',
        placeholder: 'PeopleCRM Team',
        defaultValue: '',
      },
      {
        key: 'communications.default_from_email',
        label: 'Default From Email',
        type: 'email',
        placeholder: 'sender@example.com',
        defaultValue: '',
      },
      {
        key: 'communications.reply_to',
        label: 'Reply-to Email',
        type: 'email',
        placeholder: 'reply@example.com',
        defaultValue: '',
      },
      {
        key: 'communications.footer_disclaimer',
        label: 'Email Footer Disclaimer',
        type: 'textarea',
        placeholder: 'Paid for by PeopleCRM Campaign…',
        defaultValue: '',
      },
      {
        key: 'communications.auto_unsubscribe_footer',
        label: 'Automatically add unsubscribe link to email footer',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'communications.inbox_routing',
        label: 'Inbox Routing Rules',
        type: 'text',
        placeholder: 'donations@example.com, press@example.com',
        defaultValue: '',
      },
      {
        key: 'communications.sendgrid_api_key',
        label: 'SendGrid API Key',
        type: 'password',
        placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxx',
        defaultValue: '',
        helper: 'API key for this organization\'s SendGrid sub-user account.',
      },
      {
        key: 'communications.sendgrid_subuser_username',
        label: 'SendGrid Subuser Username',
        type: 'text',
        placeholder: 'subuser_username',
        defaultValue: '',
        helper: 'If using a master SendGrid key, specify the subuser username for this organization.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Tenant-wide notification defaults and escalation.',
    icon: 'bell',
    fields: [
      { key: 'notifications.email_enabled', label: 'Enable Email Alerts', type: 'toggle', defaultValue: true },
      { key: 'notifications.in_app_enabled', label: 'Enable In-app Alerts', type: 'toggle', defaultValue: true },
      {
        key: 'notifications.digest_cadence',
        label: 'Digest Cadence',
        type: 'select',
        defaultValue: 'daily',
        options: [
          { label: 'Off', value: 'off' },
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
        ],
      },
      {
        key: 'notifications.task_escalation_hours',
        label: 'Task Escalation (hours)',
        type: 'number',
        defaultValue: 24,
      },
    ],
  },
  {
    id: 'data',
    title: 'People & Data',
    description: 'Import, tagging, and data retention across the tenant.',
    icon: 'users',
    fields: [
      {
        key: 'data.import_strategy',
        label: 'Import Deduplication Strategy',
        type: 'select',
        defaultValue: 'email',
        options: [
          { label: 'Email only', value: 'email' },
          { label: 'Phone only', value: 'phone' },
          { label: 'Email + Phone', value: 'email_phone' },
          { label: 'Loose match', value: 'loose' },
        ],
      },
      {
        key: 'data.auto_tag',
        label: 'Automatic Tag for Imports',
        type: 'text',
        placeholder: 'New Prospect',
        defaultValue: '',
      },
      { key: 'data.retention_days', label: 'Data Retention (days)', type: 'number', defaultValue: 365 },
      { key: 'data.double_opt_in', label: 'Require Double Opt-in', type: 'toggle', defaultValue: true },
      {
        key: 'data.gdpr_contact',
        label: 'Privacy Contact Email',
        type: 'email',
        placeholder: 'privacy@example.com',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'access',
    title: 'Teams & Access',
    description: 'Role defaults, session policies, and volunteer controls.',
    icon: 'user-group',
    fields: [
      {
        key: 'access.default_role',
        label: 'Default Invite Role',
        type: 'select',
        defaultValue: 'editor',
        options: [
          { label: 'Viewer', value: 'viewer' },
          { label: 'Editor', value: 'editor' },
          { label: 'Admin', value: 'admin' },
        ],
      },
      {
        key: 'access.invite_requires_approval',
        label: 'Require Admin Approval for Invites',
        type: 'toggle',
        defaultValue: false,
      },
      { key: 'access.mfa_required', label: 'Require MFA for all users', type: 'toggle', defaultValue: false },
      { key: 'access.enforce_strong_passwords', label: 'Enforce Strong Passwords', type: 'toggle', defaultValue: true },
      {
        key: 'access.allowed_ips',
        label: 'Allowed IP Ranges (comma separated)',
        type: 'text',
        placeholder: '192.168.1.1/24',
        defaultValue: '',
      },
      { key: 'access.session_timeout_minutes', label: 'Session Timeout (minutes)', type: 'number', defaultValue: 60 },
      { key: 'access.volunteer_self_signup', label: 'Allow Volunteer Self-signup', type: 'toggle', defaultValue: true },
    ],
  },
  {
    id: 'workflow',
    title: 'Workflow & Tasks',
    description: 'Boards, SLA timers, and automation defaults.',
    icon: 'clipboard-document-list',
    fields: [
      {
        key: 'workflow.kanban_columns',
        label: 'Kanban Columns (comma separated)',
        type: 'text',
        placeholder: 'Backlog, In Progress, Review, Done',
        defaultValue: '',
      },
      { key: 'workflow.task_sla_hours', label: 'Task SLA (hours)', type: 'number', defaultValue: 72 },
      {
        key: 'workflow.auto_assign_to_owner',
        label: 'Auto Assign to Record Owner',
        type: 'toggle',
        defaultValue: false,
      },
      { key: 'workflow.shift_length_hours', label: 'Volunteer Shift Length (hours)', type: 'number', defaultValue: 3 },
      {
        key: 'workflow.reminder_lead_minutes',
        label: 'Reminder Lead Time (minutes)',
        type: 'number',
        defaultValue: 60,
      },
    ],
  },
  {
    id: 'sla',
    title: 'SLA Configuration',
    description: 'Configure Service Level Agreements (SLAs) for tasks and emails, including working days and hours.',
    icon: 'clock',
    fields: [
      {
        key: 'sla.tasks_hours',
        label: 'Task SLA Target (working hours)',
        type: 'number',
        defaultValue: 24,
      },
      {
        key: 'sla.emails_hours',
        label: 'Email SLA Target (working hours)',
        type: 'number',
        defaultValue: 24,
      },
      {
        key: 'sla.working_days',
        label: 'Working Days (comma-separated: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun)',
        type: 'text',
        defaultValue: '1,2,3,4,5',
      },
      {
        key: 'sla.working_hours_start',
        label: 'Working Hours Start (HH:MM)',
        type: 'text',
        defaultValue: '09:00',
      },
      {
        key: 'sla.working_hours_end',
        label: 'Working Hours End (HH:MM)',
        type: 'text',
        defaultValue: '17:00',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Global UI defaults that users can override locally.',
    icon: 'sun',
    fields: [
      {
        key: 'appearance.theme',
        label: 'Default Theme',
        type: 'select',
        defaultValue: 'system',
        options: [
          { label: 'System', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      {
        key: 'appearance.date_format',
        label: 'Date Format',
        type: 'select',
        defaultValue: 'MMMM d, yyyy',
        options: [
          { label: 'January 10, 2025', value: 'MMMM d, yyyy' },
          { label: '01/10/2025', value: 'MM/dd/yyyy' },
          { label: '10/01/2025', value: 'dd/MM/yyyy' },
        ],
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & API',
    description: 'Storage, webhooks, analytics, and external vendor keys.',
    icon: 'cloud-arrow-up',
    fields: [
      {
        key: 'integrations.azure_blob_connection',
        label: 'Azure Blob Connection String',
        type: 'password',
        placeholder: 'DefaultEndpointsProtocol=https;AccountName=…',
        defaultValue: '',
      },
      {
        key: 'integrations.webhook_url',
        label: 'Webhook Endpoint URL',
        type: 'url',
        placeholder: 'https://example.com/hooks/pplcrm',
        defaultValue: '',
      },
      {
        key: 'integrations.webhook_api_key',
        label: 'Webhook API Key',
        type: 'text',
        placeholder: 'Not generated yet',
        defaultValue: '',
      },
      {
        key: 'integrations.webhook_api_secret',
        label: 'Webhook API Secret',
        type: 'password',
        placeholder: 'Not generated yet',
        defaultValue: '',
      },
      {
        key: 'integrations.fb_pixel_id',
        label: 'Facebook Pixel ID',
        type: 'text',
        placeholder: '123456789012345',
        defaultValue: '',
      },
      {
        key: 'integrations.ga_measurement_id',
        label: 'Google Analytics Measurement ID',
        type: 'text',
        placeholder: 'G-XXXXXXXXXX',
        defaultValue: '',
      },
      { key: 'integrations.sandbox_mode', label: 'Use Sandbox Mode', type: 'toggle', defaultValue: false },
    ],
  },
];
