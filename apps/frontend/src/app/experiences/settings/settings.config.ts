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
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Tenant-wide notification defaults and escalation.',
    icon: 'bell',
    fields: [
      {
        key: 'notifications.mention_in_comment',
        label: 'Mentioned in Comment',
        type: 'toggle',
        helper: 'Alerts when someone mentions you in a thread',
        defaultValue: true,
      },
      {
        key: 'notifications.mention_in_comment_in_app',
        label: 'Mentioned in Comment (In-App)',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'notifications.task_assigned',
        label: 'Task Assigned',
        type: 'toggle',
        helper: 'Alerts when a task is assigned to you',
        defaultValue: true,
      },
      {
        key: 'notifications.task_assigned_in_app',
        label: 'Task Assigned (In-App)',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'notifications.task_due',
        label: 'Task Due Today / Overdue',
        type: 'toggle',
        helper: 'Daily reminder check of active tasks due',
        defaultValue: true,
      },
      {
        key: 'notifications.task_due_in_app',
        label: 'Task Due Today / Overdue (In-App)',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'notifications.person_assigned',
        label: 'Person Assigned',
        type: 'toggle',
        helper: 'Alerts when a contact ownership is assigned to you',
        defaultValue: true,
      },
      {
        key: 'notifications.person_assigned_in_app',
        label: 'Person Assigned (In-App)',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'notifications.export_ready',
        label: 'Export Ready',
        type: 'toggle',
        helper: 'Receive download link when CSV export finishes',
        defaultValue: true,
      },
      {
        key: 'notifications.export_ready_in_app',
        label: 'Export Ready (In-App)',
        type: 'toggle',
        defaultValue: true,
      },
      {
        key: 'notifications.import_summary',
        label: 'Import Summary',
        type: 'toggle',
        helper: 'Spreadsheet import completion stats report',
        defaultValue: true,
      },
      {
        key: 'notifications.import_summary_in_app',
        label: 'Import Summary (In-App)',
        type: 'toggle',
        defaultValue: true,
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
    id: 'sla',
    title: 'SLA Configuration',
    description:
      'Configure Service Level Agreements (SLAs) for tasks and emails, including working days, business hours, and status warning/critical thresholds.',
    icon: 'clock',
    fields: [
      {
        key: 'sla.tasks_hours',
        label: 'Task SLA Target (working hours)',
        type: 'number',
        defaultValue: 24,
        helper: 'Maximum working hours allowed to resolve or close a task before it is considered an SLA breach.',
      },
      {
        key: 'sla.emails_hours',
        label: 'Email SLA Target (working hours)',
        type: 'number',
        defaultValue: 24,
        helper:
          'Maximum working hours allowed to reply to an incoming inbox email before it is considered an SLA breach.',
      },
      {
        key: 'sla.email_warning_threshold',
        label: 'Email SLA Warning Threshold (breaches)',
        type: 'number',
        defaultValue: 1,
        helper: 'Number of active open email breaches that triggers a "Warning" (yellow) status on the dashboard.',
      },
      {
        key: 'sla.email_critical_threshold',
        label: 'Email SLA Critical Threshold (breaches)',
        type: 'number',
        defaultValue: 4,
        helper: 'Number of active open email breaches that triggers a "Critical" (red) status on the dashboard.',
      },
      {
        key: 'sla.task_warning_threshold',
        label: 'Task SLA Warning Threshold (breaches)',
        type: 'number',
        defaultValue: 1,
        helper: 'Number of active open task breaches that triggers a "Warning" (yellow) status on the dashboard.',
      },
      {
        key: 'sla.task_critical_threshold',
        label: 'Task SLA Critical Threshold (breaches)',
        type: 'number',
        defaultValue: 4,
        helper: 'Number of active open task breaches that triggers a "Critical" (red) status on the dashboard.',
      },
      {
        key: 'sla.working_days',
        label: 'Working Days (comma-separated: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun)',
        type: 'text',
        defaultValue: '1,2,3,4,5',
        helper: 'Days of the week counted towards the SLA response and resolution calculations.',
      },
      {
        key: 'sla.working_hours_start',
        label: 'Working Hours Start (HH:MM)',
        type: 'text',
        defaultValue: '09:00',
        helper: 'Beginning of the business day for working time tracking.',
      },
      {
        key: 'sla.working_hours_end',
        label: 'Working Hours End (HH:MM)',
        type: 'text',
        defaultValue: '17:00',
        helper: 'End of the business day for working time tracking.',
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
    ],
  },
];
