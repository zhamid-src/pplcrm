--
-- PostgreSQL database dump
--

\restrict oPFHGUe6wVNuN0eNnQazqyJQjnNPomJSMJiQZMlpJpzgVIBdJCJVrckJoNfysZW

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: zee
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO zee;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: recipient_kind; Type: TYPE; Schema: public; Owner: zeehamid
--

CREATE TYPE public.recipient_kind AS ENUM (
    'to',
    'cc',
    'bcc'
);


ALTER TYPE public.recipient_kind OWNER TO zeehamid;

--
-- Name: notify_job_inserted(); Type: FUNCTION; Schema: public; Owner: zeehamid
--

CREATE FUNCTION public.notify_job_inserted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_notify('background_jobs_channel', '');
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.notify_job_inserted() OWNER TO zeehamid;

--
-- Name: notify_webhook_event_inserted(); Type: FUNCTION; Schema: public; Owner: zeehamid
--

CREATE FUNCTION public.notify_webhook_event_inserted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_notify('webhook_events_channel', '');
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.notify_webhook_event_inserted() OWNER TO zeehamid;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: zeehamid
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.set_updated_at() OWNER TO zeehamid;

--
-- Name: sync_email_has_attachments(); Type: FUNCTION; Schema: public; Owner: zeehamid
--

CREATE FUNCTION public.sync_email_has_attachments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE email_headers h
  SET has_attachments = EXISTS (
    SELECT 1 FROM email_attachments a
    WHERE a.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND a.email_id  = COALESCE(NEW.email_id,  OLD.email_id)
  )
  WHERE h.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND h.email_id  = COALESCE(NEW.email_id,  OLD.email_id);
  RETURN NULL;
END$$;


ALTER FUNCTION public.sync_email_has_attachments() OWNER TO zeehamid;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: authusers; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.authusers (
    id bigint NOT NULL,
    tenant_id bigint,
    verified boolean DEFAULT false,
    role text,
    first_name text,
    last_name text,
    email text NOT NULL,
    password text NOT NULL,
    password_reset_code text,
    password_reset_code_created_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint,
    updatedby_id bigint,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_code text,
    two_factor_expires_at timestamp with time zone,
    deletion_scheduled_at timestamp with time zone,
    previous_email text,
    previous_role text,
    CONSTRAINT chk_authusers_role CHECK (((role IS NULL) OR (role = ANY (ARRAY['owner'::text, 'admin'::text, 'user'::text, 'viewer'::text]))))
);


ALTER TABLE public.authusers OWNER TO zeehamid;

--
-- Name: authusers_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.authusers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.authusers_id_seq OWNER TO zeehamid;

--
-- Name: authusers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.authusers_id_seq OWNED BY public.authusers.id;


--
-- Name: background_jobs; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.background_jobs (
    id bigint NOT NULL,
    tenant_id bigint,
    queue text DEFAULT 'default'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payload jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    error text,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_background_jobs_status CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.background_jobs OWNER TO zeehamid;

--
-- Name: background_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.background_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.background_jobs_id_seq OWNER TO zeehamid;

--
-- Name: background_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.background_jobs_id_seq OWNED BY public.background_jobs.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.campaigns (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    admin_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    notes text,
    "json" jsonb,
    startdate date,
    enddate date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updatedby_id bigint
);


ALTER TABLE public.campaigns OWNER TO zeehamid;

--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.campaigns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO zeehamid;

--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.companies (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    website text,
    email text,
    phone text,
    industry text,
    notes text,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_id bigint,
    search_vector tsvector GENERATED ALWAYS AS (((((setweight(to_tsvector('simple'::regconfig, COALESCE(name, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(email, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(website, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(phone, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(industry, ''::text)), 'C'::"char"))) STORED
);


ALTER TABLE public.companies OWNER TO zeehamid;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO zeehamid;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: data_exports; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.data_exports (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    entity text NOT NULL,
    file_name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    row_count integer DEFAULT 0,
    storage_key text,
    columns jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_exports OWNER TO zeehamid;

--
-- Name: data_exports_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.data_exports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_exports_id_seq OWNER TO zeehamid;

--
-- Name: data_exports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.data_exports_id_seq OWNED BY public.data_exports.id;


--
-- Name: data_imports; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.data_imports (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    file_name text NOT NULL,
    source text DEFAULT 'persons'::text NOT NULL,
    tag_name text,
    tag_id bigint,
    row_count integer DEFAULT 0 NOT NULL,
    inserted_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    households_created integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    error_message text
);


ALTER TABLE public.data_imports OWNER TO zeehamid;

--
-- Name: data_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.data_imports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_imports_id_seq OWNER TO zeehamid;

--
-- Name: data_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.data_imports_id_seq OWNED BY public.data_imports.id;


--
-- Name: donation_periods; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.donation_periods (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    limit_amount integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    CONSTRAINT donation_periods_dates_check CHECK (((end_date IS NULL) OR (end_date > start_date))),
    CONSTRAINT donation_periods_limit_check CHECK ((limit_amount > 0))
);


ALTER TABLE public.donation_periods OWNER TO zeehamid;

--
-- Name: donation_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.donation_periods_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_periods_id_seq OWNER TO zeehamid;

--
-- Name: donation_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.donation_periods_id_seq OWNED BY public.donation_periods.id;


--
-- Name: donation_pledges; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.donation_pledges (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    person_id bigint,
    stripe_subscription_id text,
    stripe_customer_id text,
    monthly_amount integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    next_billing_date date,
    first_name text,
    last_name text,
    email text,
    state text,
    country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    CONSTRAINT donation_pledges_status_check CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'unpaid'::text])))
);


ALTER TABLE public.donation_pledges OWNER TO zeehamid;

--
-- Name: donation_pledges_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.donation_pledges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_pledges_id_seq OWNER TO zeehamid;

--
-- Name: donation_pledges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.donation_pledges_id_seq OWNED BY public.donation_pledges.id;


--
-- Name: donations; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.donations (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    person_id bigint,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    stripe_session_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    first_name text,
    last_name text,
    email text,
    street text,
    apt text,
    city text,
    state text,
    zip text,
    country text,
    pledge_id bigint
);


ALTER TABLE public.donations OWNER TO zeehamid;

--
-- Name: donations_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.donations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donations_id_seq OWNER TO zeehamid;

--
-- Name: donations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.donations_id_seq OWNED BY public.donations.id;


--
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_attachments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    size_bytes bigint NOT NULL,
    cid text,
    is_inline boolean DEFAULT false NOT NULL,
    pos integer DEFAULT 0 NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    file_id bigint
);


ALTER TABLE public.email_attachments OWNER TO zeehamid;

--
-- Name: email_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_attachments_id_seq OWNER TO zeehamid;

--
-- Name: email_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_attachments_id_seq OWNED BY public.email_attachments.id;


--
-- Name: email_bodies; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_bodies (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    body_html text NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_bodies OWNER TO zeehamid;

--
-- Name: email_bodies_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_bodies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_bodies_id_seq OWNER TO zeehamid;

--
-- Name: email_bodies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_bodies_id_seq OWNED BY public.email_bodies.id;


--
-- Name: email_comments; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_comments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    author_id bigint NOT NULL,
    comment text NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_comments OWNER TO zeehamid;

--
-- Name: email_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_comments_id_seq OWNER TO zeehamid;

--
-- Name: email_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_comments_id_seq OWNED BY public.email_comments.id;


--
-- Name: email_drafts; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_drafts (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    thread_id text,
    to_list jsonb,
    cc_list jsonb,
    bcc_list jsonb,
    subject text,
    body_html text,
    body_delta jsonb,
    meta jsonb,
    is_locked boolean DEFAULT false NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_drafts OWNER TO zeehamid;

--
-- Name: email_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_drafts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_drafts_id_seq OWNER TO zeehamid;

--
-- Name: email_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_drafts_id_seq OWNED BY public.email_drafts.id;


--
-- Name: email_folders; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_folders (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0,
    is_default boolean DEFAULT false,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_folders OWNER TO zeehamid;

--
-- Name: email_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_folders_id_seq OWNER TO zeehamid;

--
-- Name: email_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_folders_id_seq OWNED BY public.email_folders.id;


--
-- Name: email_headers; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_headers (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    headers_json jsonb,
    raw_headers text,
    date_sent timestamp without time zone,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_headers OWNER TO zeehamid;

--
-- Name: email_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_headers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_headers_id_seq OWNER TO zeehamid;

--
-- Name: email_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_headers_id_seq OWNED BY public.email_headers.id;


--
-- Name: email_read_states; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_read_states (
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    email_id bigint NOT NULL,
    is_read boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_read_states OWNER TO zeehamid;

--
-- Name: email_recipients; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_recipients (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    kind text NOT NULL,
    name text,
    email text NOT NULL,
    pos integer DEFAULT 0 NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_recipients_kind_check CHECK ((kind = ANY (ARRAY['to'::text, 'cc'::text, 'bcc'::text])))
);


ALTER TABLE public.email_recipients OWNER TO zeehamid;

--
-- Name: email_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_recipients_id_seq OWNER TO zeehamid;

--
-- Name: email_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_recipients_id_seq OWNED BY public.email_recipients.id;


--
-- Name: email_trash; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.email_trash (
    tenant_id bigint NOT NULL,
    email_id bigint NOT NULL,
    from_folder_id bigint NOT NULL,
    trashed_at timestamp without time zone DEFAULT now() NOT NULL,
    createdby_id bigint,
    updatedby_id bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    id bigint NOT NULL
);


ALTER TABLE public.email_trash OWNER TO zeehamid;

--
-- Name: email_trash_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.email_trash_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_trash_id_seq OWNER TO zeehamid;

--
-- Name: email_trash_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.email_trash_id_seq OWNED BY public.email_trash.id;


--
-- Name: emails; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.emails (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    folder_id bigint NOT NULL,
    from_email text,
    to_email text,
    subject text,
    body text,
    preview text,
    assigned_to bigint,
    is_favourite boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    status text DEFAULT 'open'::text,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.emails OWNER TO zeehamid;

--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.emails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emails_id_seq OWNER TO zeehamid;

--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.emails_id_seq OWNED BY public.emails.id;


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.event_registrations (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    person_id bigint NOT NULL,
    ticket_type_id bigint,
    status text DEFAULT 'registered'::text NOT NULL,
    checked_in_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    CONSTRAINT event_registrations_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'attended'::text, 'no_show'::text, 'cancelled'::text])))
);


ALTER TABLE public.event_registrations OWNER TO zeehamid;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.event_registrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_registrations_id_seq OWNER TO zeehamid;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.event_registrations_id_seq OWNED BY public.event_registrations.id;


--
-- Name: event_ticket_types; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.event_ticket_types (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    price_cents integer DEFAULT 0 NOT NULL,
    capacity integer,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    CONSTRAINT event_ticket_types_capacity_check CHECK (((capacity IS NULL) OR (capacity > 0))),
    CONSTRAINT event_ticket_types_price_check CHECK ((price_cents >= 0))
);


ALTER TABLE public.event_ticket_types OWNER TO zeehamid;

--
-- Name: event_ticket_types_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.event_ticket_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_ticket_types_id_seq OWNER TO zeehamid;

--
-- Name: event_ticket_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.event_ticket_types_id_seq OWNED BY public.event_ticket_types.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    location_address text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    capacity integer,
    contact_email text,
    contact_phone text,
    slug text NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    send_reminder boolean DEFAULT true NOT NULL,
    send_registration_confirmation boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('english'::regconfig, COALESCE(name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(location_address, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'C'::"char"))) STORED,
    fields jsonb DEFAULT '["first_name", "last_name", "email", "mobile", "notes"]'::jsonb NOT NULL,
    CONSTRAINT events_capacity_check CHECK (((capacity IS NULL) OR (capacity > 0))),
    CONSTRAINT events_end_after_start_check CHECK ((end_time > start_time))
);


ALTER TABLE public.events OWNER TO zeehamid;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO zeehamid;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.files (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    filename text NOT NULL,
    mime_type text,
    size_bytes bigint,
    storage_key text NOT NULL,
    sha256_hex text,
    uploaded_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.files OWNER TO zeehamid;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO zeehamid;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: google_oauth_tokens; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.google_oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    user_id text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    google_email text,
    delta_link text,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sync_error text,
    last_sync_error_at timestamp with time zone
);


ALTER TABLE public.google_oauth_tokens OWNER TO zeehamid;

--
-- Name: households; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.households (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    file_id bigint,
    home_phone text,
    apt text,
    street_num text,
    street1 text,
    street2 text,
    city text,
    state text,
    zip text,
    country text,
    notes text,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address_fp_street text,
    address_fp_full text,
    is_placeholder boolean DEFAULT false NOT NULL,
    updatedby_id bigint,
    lat double precision,
    lng double precision,
    formatted_address text,
    type text,
    district text,
    precinct text,
    ward text,
    geocoding_status text DEFAULT 'pending'::text,
    search_vector tsvector GENERATED ALWAYS AS ((((((((((setweight(to_tsvector('simple'::regconfig, COALESCE(street1, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(city, ''::text)), 'A'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(address_fp_full, ''::text)), 'A'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(zip, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(state, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(home_phone, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(street_num, ''::text)), 'C'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(apt, ''::text)), 'C'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(street2, ''::text)), 'C'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(country, ''::text)), 'C'::"char"))) STORED
);


ALTER TABLE public.households OWNER TO zeehamid;

--
-- Name: households_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.households_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.households_id_seq OWNER TO zeehamid;

--
-- Name: households_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.households_id_seq OWNED BY public.households.id;


--
-- Name: kysely_migration; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.kysely_migration (
    name character varying(255) NOT NULL,
    "timestamp" character varying(255) NOT NULL
);


ALTER TABLE public.kysely_migration OWNER TO zeehamid;

--
-- Name: kysely_migration_lock; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.kysely_migration_lock (
    id character varying(255) NOT NULL,
    is_locked integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.kysely_migration_lock OWNER TO zeehamid;

--
-- Name: lists; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.lists (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    object text NOT NULL,
    is_dynamic boolean DEFAULT false,
    definition jsonb,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_refreshed_at timestamp with time zone,
    status text DEFAULT 'idle'::text NOT NULL,
    CONSTRAINT chk_lists_status CHECK ((status = ANY (ARRAY['idle'::text, 'refreshing'::text, 'failed'::text]))),
    CONSTRAINT lists_object_check CHECK ((object = ANY (ARRAY['people'::text, 'households'::text])))
);


ALTER TABLE public.lists OWNER TO zeehamid;

--
-- Name: lists_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.lists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lists_id_seq OWNER TO zeehamid;

--
-- Name: lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.lists_id_seq OWNED BY public.lists.id;


--
-- Name: map_campaigns_users; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_campaigns_users (
    tenant_id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_campaigns_users OWNER TO zeehamid;

--
-- Name: map_households_tags; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_households_tags (
    tenant_id bigint NOT NULL,
    household_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_households_tags OWNER TO zeehamid;

--
-- Name: map_lists_households; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_lists_households (
    tenant_id bigint NOT NULL,
    list_id bigint NOT NULL,
    household_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_lists_households OWNER TO zeehamid;

--
-- Name: map_lists_persons; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_lists_persons (
    tenant_id bigint NOT NULL,
    list_id bigint NOT NULL,
    person_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_lists_persons OWNER TO zeehamid;

--
-- Name: map_peoples_tags; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_peoples_tags (
    tenant_id bigint NOT NULL,
    person_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    deletable boolean DEFAULT true,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_peoples_tags OWNER TO zeehamid;

--
-- Name: map_teams_lists; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_teams_lists (
    tenant_id bigint NOT NULL,
    team_id bigint NOT NULL,
    list_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_teams_lists OWNER TO zeehamid;

--
-- Name: map_teams_persons; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.map_teams_persons (
    tenant_id bigint NOT NULL,
    team_id bigint NOT NULL,
    person_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_teams_persons OWNER TO zeehamid;

--
-- Name: ms_oauth_tokens; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.ms_oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    user_id text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ms_email text,
    delta_link text,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sync_error text,
    last_sync_error_at timestamp with time zone
);


ALTER TABLE public.ms_oauth_tokens OWNER TO zeehamid;

--
-- Name: newsletter_events; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.newsletter_events (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    newsletter_id bigint NOT NULL,
    email text NOT NULL,
    event_type text NOT NULL,
    sg_event_id text NOT NULL,
    sg_message_id text,
    url text,
    ip text,
    user_agent text,
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.newsletter_events OWNER TO zeehamid;

--
-- Name: newsletter_events_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.newsletter_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_events_id_seq OWNER TO zeehamid;

--
-- Name: newsletter_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.newsletter_events_id_seq OWNED BY public.newsletter_events.id;


--
-- Name: newsletters; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.newsletters (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    subject text,
    preview_text text,
    audience_description text,
    target_lists jsonb,
    segments jsonb,
    total_recipients integer DEFAULT 0 NOT NULL,
    delivered_count integer DEFAULT 0 NOT NULL,
    bounce_count integer DEFAULT 0 NOT NULL,
    open_rate numeric DEFAULT 0 NOT NULL,
    click_rate numeric DEFAULT 0 NOT NULL,
    unique_opens integer DEFAULT 0 NOT NULL,
    unique_clicks integer DEFAULT 0 NOT NULL,
    unsubscribe_count integer DEFAULT 0 NOT NULL,
    spam_complaint_count integer DEFAULT 0 NOT NULL,
    reply_count integer DEFAULT 0 NOT NULL,
    send_date timestamp with time zone,
    last_engagement_at timestamp with time zone,
    summary text,
    html_content text,
    plain_text_content text,
    top_links jsonb,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_newsletters_click_rate_range CHECK (((click_rate >= (0)::numeric) AND (click_rate <= (100)::numeric))),
    CONSTRAINT chk_newsletters_open_rate_range CHECK (((open_rate >= (0)::numeric) AND (open_rate <= (100)::numeric)))
);


ALTER TABLE public.newsletters OWNER TO zeehamid;

--
-- Name: newsletters_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.newsletters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletters_id_seq OWNER TO zeehamid;

--
-- Name: newsletters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.newsletters_id_seq OWNED BY public.newsletters.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO zeehamid;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO zeehamid;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: passkeys; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.passkeys (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    credential_id text NOT NULL,
    public_key text NOT NULL,
    counter bigint DEFAULT 0 NOT NULL,
    device_type text NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    transports text[],
    aaguid text,
    friendly_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.passkeys OWNER TO zeehamid;

--
-- Name: passkeys_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

ALTER TABLE public.passkeys ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.passkeys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: person_connections; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.person_connections (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    from_person_id bigint NOT NULL,
    to_person_id bigint NOT NULL,
    relation_type text NOT NULL,
    custom_label text,
    is_mutual boolean DEFAULT false NOT NULL,
    notes text,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pc_custom_label_required CHECK (((relation_type <> 'custom'::text) OR ((custom_label IS NOT NULL) AND (custom_label <> ''::text)))),
    CONSTRAINT pc_no_self_loop CHECK ((from_person_id <> to_person_id)),
    CONSTRAINT pc_relation_type_check CHECK ((relation_type = ANY (ARRAY['referred_by'::text, 'referred_to'::text, 'close_friend'::text, 'family_member'::text, 'spouse'::text, 'colleague'::text, 'org_affiliation'::text, 'introduced_by'::text, 'introduced_to'::text, 'custom'::text])))
);


ALTER TABLE public.person_connections OWNER TO zeehamid;

--
-- Name: person_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.person_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_connections_id_seq OWNER TO zeehamid;

--
-- Name: person_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.person_connections_id_seq OWNED BY public.person_connections.id;


--
-- Name: persons; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.persons (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    household_id bigint NOT NULL,
    file_id bigint,
    first_name text,
    middle_names text,
    last_name text,
    home_phone text,
    mobile text,
    email text,
    email2 text,
    notes text,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updatedby_id bigint,
    company_id bigint,
    linkedin text,
    twitter text,
    facebook text,
    instagram text,
    assigned_to bigint,
    preferred_contact text,
    search_vector tsvector GENERATED ALWAYS AS ((((((setweight(to_tsvector('simple'::regconfig, COALESCE(first_name, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(last_name, ''::text)), 'A'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(email, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(email2, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(mobile, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(home_phone, ''::text)), 'C'::"char"))) STORED
);


ALTER TABLE public.persons OWNER TO zeehamid;

--
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.persons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.persons_id_seq OWNER TO zeehamid;

--
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- Name: potential_duplicates; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.potential_duplicates (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    group_key text NOT NULL,
    person_id bigint,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    household_id bigint,
    company_id bigint
);


ALTER TABLE public.potential_duplicates OWNER TO zeehamid;

--
-- Name: potential_duplicates_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.potential_duplicates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.potential_duplicates_id_seq OWNER TO zeehamid;

--
-- Name: potential_duplicates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.potential_duplicates_id_seq OWNED BY public.potential_duplicates.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.profiles (
    id bigint NOT NULL,
    tenant_id bigint,
    auth_id bigint,
    middle_names text,
    last_name text,
    home_phone text,
    mobile text,
    email2 text,
    apt text,
    street_num text,
    street1 text,
    street2 text,
    city text,
    state text,
    zip text,
    country text,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    createdby_id bigint,
    updatedby_id bigint,
    avatar_file_id bigint
);


ALTER TABLE public.profiles OWNER TO zeehamid;

--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_id_seq OWNER TO zeehamid;

--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.sessions (
    id bigint NOT NULL,
    session_id text NOT NULL,
    refresh_token text,
    user_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_accessed timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    status text DEFAULT 'active'::text,
    other_properties jsonb,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO zeehamid;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO zeehamid;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: sessions_user_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.sessions_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_user_id_seq OWNER TO zeehamid;

--
-- Name: sessions_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.sessions_user_id_seq OWNED BY public.sessions.user_id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    createdby_id bigint,
    updatedby_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO zeehamid;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO zeehamid;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    deletable boolean DEFAULT true,
    color character varying(7),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'tag'::text NOT NULL
);


ALTER TABLE public.tags OWNER TO zeehamid;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO zeehamid;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.task_attachments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    task_id bigint NOT NULL,
    filename text NOT NULL,
    content_type text,
    size_bytes bigint,
    url text,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.task_attachments OWNER TO zeehamid;

--
-- Name: task_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.task_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_attachments_id_seq OWNER TO zeehamid;

--
-- Name: task_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.task_attachments_id_seq OWNED BY public.task_attachments.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.task_comments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    task_id bigint NOT NULL,
    author_id bigint NOT NULL,
    comment text NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.task_comments OWNER TO zeehamid;

--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.task_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_comments_id_seq OWNER TO zeehamid;

--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: task_subtasks; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.task_subtasks (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    task_id bigint NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'todo'::text,
    "position" integer DEFAULT 0,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.task_subtasks OWNER TO zeehamid;

--
-- Name: task_subtasks_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.task_subtasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_subtasks_id_seq OWNER TO zeehamid;

--
-- Name: task_subtasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.task_subtasks_id_seq OWNED BY public.task_subtasks.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.tasks (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    details text,
    due_at timestamp with time zone,
    status text DEFAULT 'todo'::text,
    priority text,
    assigned_to bigint,
    completed_at timestamp with time zone,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team_id bigint,
    file_id bigint,
    CONSTRAINT chk_tasks_status CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'blocked'::text, 'done'::text, 'canceled'::text, 'archived'::text])))
);


ALTER TABLE public.tasks OWNER TO zeehamid;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO zeehamid;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.teams (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    team_captain_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team_lead_user_id bigint
);


ALTER TABLE public.teams OWNER TO zeehamid;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO zeehamid;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.tenants (
    id bigint NOT NULL,
    admin_id bigint,
    createdby_id bigint,
    name text NOT NULL,
    mobile text,
    email text,
    email2 text,
    apt text,
    street_num text,
    street1 text,
    street2 text,
    city text,
    state text,
    zip text,
    country text,
    billing_street_num text,
    billing_street1 text,
    billing_street2 text,
    billing_city text,
    billing_state text,
    billing_zip text,
    billing_country text,
    notes text,
    "json" jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    placeholder_household_id bigint,
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_plan text DEFAULT 'free'::text NOT NULL,
    subscription_status text,
    subscription_ends_at timestamp with time zone,
    deletion_scheduled_at timestamp with time zone,
    suspended_at timestamp with time zone,
    paused_at timestamp with time zone
);


ALTER TABLE public.tenants OWNER TO zeehamid;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO zeehamid;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.user_activity (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    activity text NOT NULL,
    entity text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_id text
);


ALTER TABLE public.user_activity OWNER TO zeehamid;

--
-- Name: user_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.user_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activity_id_seq OWNER TO zeehamid;

--
-- Name: user_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.user_activity_id_seq OWNED BY public.user_activity.id;


--
-- Name: volunteer_events; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.volunteer_events (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    location_address text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    capacity integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_email text,
    contact_phone text,
    is_private boolean DEFAULT false NOT NULL,
    send_reminder boolean DEFAULT true NOT NULL,
    slug text NOT NULL,
    send_signup_confirmation boolean DEFAULT true NOT NULL,
    send_volunteer_alert boolean DEFAULT true NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS ((((setweight(to_tsvector('simple'::regconfig, COALESCE(name, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(location_address, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(contact_email, ''::text)), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, COALESCE(description, ''::text)), 'C'::"char"))) STORED,
    fields jsonb DEFAULT '["first_name", "last_name", "email", "mobile", "notes"]'::jsonb NOT NULL
);


ALTER TABLE public.volunteer_events OWNER TO zeehamid;

--
-- Name: volunteer_events_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.volunteer_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.volunteer_events_id_seq OWNER TO zeehamid;

--
-- Name: volunteer_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.volunteer_events_id_seq OWNED BY public.volunteer_events.id;


--
-- Name: volunteer_shifts; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.volunteer_shifts (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    event_id bigint NOT NULL,
    person_id bigint NOT NULL,
    status text DEFAULT 'signed_up'::text NOT NULL,
    hours_worked numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_volunteer_shifts_status CHECK ((status = ANY (ARRAY['signed_up'::text, 'attended'::text, 'no_show'::text, 'cancelled'::text])))
);


ALTER TABLE public.volunteer_shifts OWNER TO zeehamid;

--
-- Name: volunteer_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.volunteer_shifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.volunteer_shifts_id_seq OWNER TO zeehamid;

--
-- Name: volunteer_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.volunteer_shifts_id_seq OWNED BY public.volunteer_shifts.id;


--
-- Name: web_forms; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.web_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    redirect_url text,
    target_tags jsonb,
    target_lists jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fields jsonb,
    send_confirmation boolean DEFAULT true NOT NULL,
    send_alert boolean DEFAULT true NOT NULL,
    form_type text DEFAULT 'standard'::text NOT NULL,
    CONSTRAINT chk_web_forms_status CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


ALTER TABLE public.web_forms OWNER TO zeehamid;

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.webhook_events (
    id bigint NOT NULL,
    tenant_id bigint,
    stripe_event_id text NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    error text,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


ALTER TABLE public.webhook_events OWNER TO zeehamid;

--
-- Name: webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.webhook_events_id_seq OWNER TO zeehamid;

--
-- Name: webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.webhook_events_id_seq OWNED BY public.webhook_events.id;


--
-- Name: workflow_enrollments; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.workflow_enrollments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    workflow_id bigint NOT NULL,
    person_id bigint NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_step_number integer DEFAULT 0 NOT NULL,
    next_run_at timestamp with time zone,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_enrollments OWNER TO zeehamid;

--
-- Name: workflow_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.workflow_enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_enrollments_id_seq OWNER TO zeehamid;

--
-- Name: workflow_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.workflow_enrollments_id_seq OWNED BY public.workflow_enrollments.id;


--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.workflow_steps (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    workflow_id bigint NOT NULL,
    step_number integer NOT NULL,
    delay_days integer NOT NULL,
    subject text NOT NULL,
    preview_text text,
    html_content text,
    plain_text_content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delay_unit text DEFAULT 'days'::text NOT NULL
);


ALTER TABLE public.workflow_steps OWNER TO zeehamid;

--
-- Name: workflow_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.workflow_steps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_steps_id_seq OWNER TO zeehamid;

--
-- Name: workflow_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.workflow_steps_id_seq OWNED BY public.workflow_steps.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.workflows (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    createdby_id bigint NOT NULL,
    updatedby_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trigger_event_id text
);


ALTER TABLE public.workflows OWNER TO zeehamid;

--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

CREATE SEQUENCE public.workflows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflows_id_seq OWNER TO zeehamid;

--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: zeehamid
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: zapier_subscriptions; Type: TABLE; Schema: public; Owner: zeehamid
--

CREATE TABLE public.zapier_subscriptions (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    event_type text NOT NULL,
    webhook_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.zapier_subscriptions OWNER TO zeehamid;

--
-- Name: zapier_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: zeehamid
--

ALTER TABLE public.zapier_subscriptions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zapier_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: authusers id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.authusers ALTER COLUMN id SET DEFAULT nextval('public.authusers_id_seq'::regclass);


--
-- Name: background_jobs id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.background_jobs ALTER COLUMN id SET DEFAULT nextval('public.background_jobs_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: data_exports id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_exports ALTER COLUMN id SET DEFAULT nextval('public.data_exports_id_seq'::regclass);


--
-- Name: data_imports id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports ALTER COLUMN id SET DEFAULT nextval('public.data_imports_id_seq'::regclass);


--
-- Name: donation_periods id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_periods ALTER COLUMN id SET DEFAULT nextval('public.donation_periods_id_seq'::regclass);


--
-- Name: donation_pledges id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_pledges ALTER COLUMN id SET DEFAULT nextval('public.donation_pledges_id_seq'::regclass);


--
-- Name: donations id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations ALTER COLUMN id SET DEFAULT nextval('public.donations_id_seq'::regclass);


--
-- Name: email_attachments id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_attachments ALTER COLUMN id SET DEFAULT nextval('public.email_attachments_id_seq'::regclass);


--
-- Name: email_bodies id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_bodies ALTER COLUMN id SET DEFAULT nextval('public.email_bodies_id_seq'::regclass);


--
-- Name: email_comments id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_comments ALTER COLUMN id SET DEFAULT nextval('public.email_comments_id_seq'::regclass);


--
-- Name: email_drafts id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_drafts ALTER COLUMN id SET DEFAULT nextval('public.email_drafts_id_seq'::regclass);


--
-- Name: email_folders id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_folders ALTER COLUMN id SET DEFAULT nextval('public.email_folders_id_seq'::regclass);


--
-- Name: email_headers id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_headers ALTER COLUMN id SET DEFAULT nextval('public.email_headers_id_seq'::regclass);


--
-- Name: email_recipients id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_recipients ALTER COLUMN id SET DEFAULT nextval('public.email_recipients_id_seq'::regclass);


--
-- Name: email_trash id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash ALTER COLUMN id SET DEFAULT nextval('public.email_trash_id_seq'::regclass);


--
-- Name: emails id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.emails ALTER COLUMN id SET DEFAULT nextval('public.emails_id_seq'::regclass);


--
-- Name: event_registrations id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations ALTER COLUMN id SET DEFAULT nextval('public.event_registrations_id_seq'::regclass);


--
-- Name: event_ticket_types id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_ticket_types ALTER COLUMN id SET DEFAULT nextval('public.event_ticket_types_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: households id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households ALTER COLUMN id SET DEFAULT nextval('public.households_id_seq'::regclass);


--
-- Name: lists id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists ALTER COLUMN id SET DEFAULT nextval('public.lists_id_seq'::regclass);


--
-- Name: newsletter_events id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletter_events ALTER COLUMN id SET DEFAULT nextval('public.newsletter_events_id_seq'::regclass);


--
-- Name: newsletters id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletters ALTER COLUMN id SET DEFAULT nextval('public.newsletters_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: person_connections id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.person_connections ALTER COLUMN id SET DEFAULT nextval('public.person_connections_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: potential_duplicates id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates ALTER COLUMN id SET DEFAULT nextval('public.potential_duplicates_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: sessions user_id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions ALTER COLUMN user_id SET DEFAULT nextval('public.sessions_user_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: task_attachments id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN id SET DEFAULT nextval('public.task_attachments_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: task_subtasks id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_subtasks ALTER COLUMN id SET DEFAULT nextval('public.task_subtasks_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: user_activity id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity ALTER COLUMN id SET DEFAULT nextval('public.user_activity_id_seq'::regclass);


--
-- Name: volunteer_events id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events ALTER COLUMN id SET DEFAULT nextval('public.volunteer_events_id_seq'::regclass);


--
-- Name: volunteer_shifts id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts ALTER COLUMN id SET DEFAULT nextval('public.volunteer_shifts_id_seq'::regclass);


--
-- Name: webhook_events id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.webhook_events ALTER COLUMN id SET DEFAULT nextval('public.webhook_events_id_seq'::regclass);


--
-- Name: workflow_enrollments id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_enrollments ALTER COLUMN id SET DEFAULT nextval('public.workflow_enrollments_id_seq'::regclass);


--
-- Name: workflow_steps id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_steps ALTER COLUMN id SET DEFAULT nextval('public.workflow_steps_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Name: authusers authusers_email_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.authusers
    ADD CONSTRAINT authusers_email_key UNIQUE (email);


--
-- Name: authusers authusers_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.authusers
    ADD CONSTRAINT authusers_pkey PRIMARY KEY (id);


--
-- Name: background_jobs background_jobs_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.background_jobs
    ADD CONSTRAINT background_jobs_pk PRIMARY KEY (id);


--
-- Name: campaigns campaigns_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_id_key UNIQUE (id);


--
-- Name: campaigns campaigns_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: companies companies_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_id_key UNIQUE (id);


--
-- Name: companies companies_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pk PRIMARY KEY (id, tenant_id);


--
-- Name: data_exports data_exports_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_id_key UNIQUE (id);


--
-- Name: data_exports data_exports_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_pk PRIMARY KEY (id, tenant_id);


--
-- Name: data_imports data_imports_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_id_key UNIQUE (id);


--
-- Name: data_imports data_imports_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_pk PRIMARY KEY (id, tenant_id);


--
-- Name: donation_periods donation_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_periods
    ADD CONSTRAINT donation_periods_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: donation_pledges donation_pledges_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_pledges
    ADD CONSTRAINT donation_pledges_id_key UNIQUE (id);


--
-- Name: donation_pledges donation_pledges_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_pledges
    ADD CONSTRAINT donation_pledges_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: donation_pledges donation_pledges_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_pledges
    ADD CONSTRAINT donation_pledges_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: donations donations_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_id_key UNIQUE (id);


--
-- Name: donations donations_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pk PRIMARY KEY (id, tenant_id);


--
-- Name: donations donations_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_stripe_session_id_key UNIQUE (stripe_session_id);


--
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- Name: email_bodies email_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_bodies
    ADD CONSTRAINT email_bodies_pkey PRIMARY KEY (id);


--
-- Name: email_comments email_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_comments
    ADD CONSTRAINT email_comments_pkey PRIMARY KEY (id);


--
-- Name: email_drafts email_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_drafts
    ADD CONSTRAINT email_drafts_pkey PRIMARY KEY (id);


--
-- Name: email_folders email_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_folders
    ADD CONSTRAINT email_folders_pkey PRIMARY KEY (id);


--
-- Name: email_headers email_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_headers
    ADD CONSTRAINT email_headers_pkey PRIMARY KEY (id);


--
-- Name: email_read_states email_read_states_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_read_states
    ADD CONSTRAINT email_read_states_pk PRIMARY KEY (tenant_id, user_id, email_id);


--
-- Name: email_recipients email_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_recipients
    ADD CONSTRAINT email_recipients_pkey PRIMARY KEY (id);


--
-- Name: email_trash email_trash_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash
    ADD CONSTRAINT email_trash_pkey PRIMARY KEY (id);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: event_registrations event_registrations_unique; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_unique UNIQUE (tenant_id, event_id, person_id);


--
-- Name: event_ticket_types event_ticket_types_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_ticket_types
    ADD CONSTRAINT event_ticket_types_id_key UNIQUE (id);


--
-- Name: event_ticket_types event_ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_ticket_types
    ADD CONSTRAINT event_ticket_types_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: google_oauth_tokens google_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.google_oauth_tokens
    ADD CONSTRAINT google_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: google_oauth_tokens google_oauth_tokens_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.google_oauth_tokens
    ADD CONSTRAINT google_oauth_tokens_tenant_id_key UNIQUE (tenant_id);


--
-- Name: households households_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_id_key UNIQUE (id);


--
-- Name: households households_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: kysely_migration_lock kysely_migration_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.kysely_migration_lock
    ADD CONSTRAINT kysely_migration_lock_pkey PRIMARY KEY (id);


--
-- Name: kysely_migration kysely_migration_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.kysely_migration
    ADD CONSTRAINT kysely_migration_pkey PRIMARY KEY (name);


--
-- Name: lists lists_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_id_key UNIQUE (id);


--
-- Name: lists lists_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: map_campaigns_users map_campaigns_users_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_campaigns_users
    ADD CONSTRAINT map_campaigns_users_pk PRIMARY KEY (tenant_id, campaign_id, user_id);


--
-- Name: map_households_tags map_households_tags_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_households_tags
    ADD CONSTRAINT map_households_tags_pk PRIMARY KEY (tenant_id, household_id, tag_id);


--
-- Name: map_lists_households map_lists_households_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT map_lists_households_pk PRIMARY KEY (tenant_id, list_id, household_id);


--
-- Name: map_lists_persons map_lists_persons_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT map_lists_persons_pk PRIMARY KEY (tenant_id, list_id, person_id);


--
-- Name: map_peoples_tags map_peoples_tags_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_peoples_tags
    ADD CONSTRAINT map_peoples_tags_pk PRIMARY KEY (tenant_id, person_id, tag_id);


--
-- Name: map_teams_lists map_teams_lists_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT map_teams_lists_pk PRIMARY KEY (tenant_id, team_id, list_id);


--
-- Name: map_teams_persons map_teams_persons_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT map_teams_persons_pk PRIMARY KEY (tenant_id, team_id, person_id);


--
-- Name: ms_oauth_tokens ms_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.ms_oauth_tokens
    ADD CONSTRAINT ms_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: ms_oauth_tokens ms_oauth_tokens_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.ms_oauth_tokens
    ADD CONSTRAINT ms_oauth_tokens_tenant_id_key UNIQUE (tenant_id);


--
-- Name: newsletter_events newsletter_events_id_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletter_events
    ADD CONSTRAINT newsletter_events_id_pk PRIMARY KEY (id);


--
-- Name: newsletter_events newsletter_events_sg_event_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletter_events
    ADD CONSTRAINT newsletter_events_sg_event_id_key UNIQUE (sg_event_id);


--
-- Name: newsletters newsletters_id_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_id_pk PRIMARY KEY (id);


--
-- Name: notifications notifications_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_id_key UNIQUE (id);


--
-- Name: notifications notifications_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pk PRIMARY KEY (id, tenant_id);


--
-- Name: passkeys passkeys_credential_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.passkeys
    ADD CONSTRAINT passkeys_credential_id_key UNIQUE (credential_id);


--
-- Name: passkeys passkeys_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.passkeys
    ADD CONSTRAINT passkeys_pkey PRIMARY KEY (id);


--
-- Name: person_connections person_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.person_connections
    ADD CONSTRAINT person_connections_pkey PRIMARY KEY (id, tenant_id);


--
-- Name: persons persons_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_id_key UNIQUE (id);


--
-- Name: persons persons_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: potential_duplicates potential_duplicates_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates
    ADD CONSTRAINT potential_duplicates_pk PRIMARY KEY (id);


--
-- Name: profiles profiles_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_key UNIQUE (id);


--
-- Name: sessions sessions_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_id_key UNIQUE (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- Name: sessions sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tags tags_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_id_key UNIQUE (id);


--
-- Name: tags tags_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: tags tags_tenant_name_type_unique; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_tenant_name_type_unique UNIQUE (tenant_id, name, type);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_subtasks task_subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_subtasks
    ADD CONSTRAINT task_subtasks_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_id_key UNIQUE (id);


--
-- Name: tasks tasks_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: teams teams_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_id_key UNIQUE (id);


--
-- Name: teams teams_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pk PRIMARY KEY (id, tenant_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: email_bodies unique_email_bodies_email_id; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_bodies
    ADD CONSTRAINT unique_email_bodies_email_id UNIQUE (email_id);


--
-- Name: email_headers unique_email_headers_email_id; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_headers
    ADD CONSTRAINT unique_email_headers_email_id UNIQUE (email_id);


--
-- Name: settings uq_settings_tenant_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT uq_settings_tenant_key UNIQUE (tenant_id, key);


--
-- Name: user_activity user_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_id_key UNIQUE (id);


--
-- Name: user_activity user_activity_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pk PRIMARY KEY (id, tenant_id);


--
-- Name: volunteer_events volunteer_events_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT volunteer_events_id_key UNIQUE (id);


--
-- Name: volunteer_events volunteer_events_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT volunteer_events_pk PRIMARY KEY (id, tenant_id);


--
-- Name: volunteer_events volunteer_events_slug_unique; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT volunteer_events_slug_unique UNIQUE (slug);


--
-- Name: volunteer_shifts volunteer_shifts_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT volunteer_shifts_id_key UNIQUE (id);


--
-- Name: volunteer_shifts volunteer_shifts_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT volunteer_shifts_pk PRIMARY KEY (id, tenant_id);


--
-- Name: web_forms web_forms_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT web_forms_id_key UNIQUE (id);


--
-- Name: web_forms web_forms_id_tenantid; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT web_forms_id_tenantid PRIMARY KEY (id, tenant_id);


--
-- Name: webhook_events webhook_events_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pk PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_stripe_event_id_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_stripe_event_id_key UNIQUE (stripe_event_id);


--
-- Name: workflow_enrollments workflow_enrollments_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_enrollments
    ADD CONSTRAINT workflow_enrollments_pk PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pk PRIMARY KEY (id);


--
-- Name: workflows workflows_pk; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pk PRIMARY KEY (id);


--
-- Name: zapier_subscriptions zapier_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.zapier_subscriptions
    ADD CONSTRAINT zapier_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: zapier_subscriptions zapier_subscriptions_tenant_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.zapier_subscriptions
    ADD CONSTRAINT zapier_subscriptions_tenant_id_event_type_key UNIQUE (tenant_id, event_type);


--
-- Name: authusers_email_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX authusers_email_index ON public.authusers USING btree (email);


--
-- Name: campaigns_map_tenant_campaign_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX campaigns_map_tenant_campaign_index ON public.map_campaigns_users USING btree (tenant_id, campaign_id);


--
-- Name: campaigns_map_tenant_user_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX campaigns_map_tenant_user_index ON public.map_campaigns_users USING btree (tenant_id, user_id);


--
-- Name: campaigns_tenant_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX campaigns_tenant_index ON public.campaigns USING btree (tenant_id);


--
-- Name: event_registrations_event_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX event_registrations_event_idx ON public.event_registrations USING btree (tenant_id, event_id);


--
-- Name: event_registrations_person_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX event_registrations_person_idx ON public.event_registrations USING btree (tenant_id, person_id);


--
-- Name: events_search_vector_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX events_search_vector_idx ON public.events USING gin (search_vector);


--
-- Name: events_tenant_slug_unique; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX events_tenant_slug_unique ON public.events USING btree (tenant_id, slug);


--
-- Name: google_oauth_tokens_tenant_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX google_oauth_tokens_tenant_idx ON public.google_oauth_tokens USING btree (tenant_id);


--
-- Name: households_tag_map_tenant_person_tag_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX households_tag_map_tenant_person_tag_index ON public.map_households_tags USING btree (tenant_id, household_id, tag_id);


--
-- Name: idx_background_jobs_queue_status; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_background_jobs_queue_status ON public.background_jobs USING btree (queue, status, run_at);


--
-- Name: idx_background_jobs_status_run_at; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_background_jobs_status_run_at ON public.background_jobs USING btree (status, run_at);


--
-- Name: idx_background_jobs_tenant_status; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_background_jobs_tenant_status ON public.background_jobs USING btree (tenant_id, status) WHERE (tenant_id IS NOT NULL);


--
-- Name: idx_companies_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_file_id ON public.companies USING btree (file_id);


--
-- Name: idx_companies_fts; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_fts ON public.companies USING gin (search_vector);


--
-- Name: idx_companies_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_tenant ON public.companies USING btree (tenant_id);


--
-- Name: idx_companies_tenant_email; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_tenant_email ON public.companies USING btree (tenant_id, email);


--
-- Name: idx_companies_tenant_industry; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_tenant_industry ON public.companies USING btree (tenant_id, industry);


--
-- Name: idx_companies_trgm_email; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_trgm_email ON public.companies USING gin (email public.gin_trgm_ops);


--
-- Name: idx_companies_trgm_industry; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_trgm_industry ON public.companies USING gin (industry public.gin_trgm_ops);


--
-- Name: idx_companies_trgm_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_companies_trgm_name ON public.companies USING gin (name public.gin_trgm_ops);


--
-- Name: idx_data_exports_tenant_created; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_data_exports_tenant_created ON public.data_exports USING btree (tenant_id, created_at);


--
-- Name: idx_data_exports_tenant_pending; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_data_exports_tenant_pending ON public.data_exports USING btree (tenant_id, created_at) WHERE (status = 'pending'::text);


--
-- Name: idx_data_imports_tag; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_data_imports_tag ON public.data_imports USING btree (tag_id);


--
-- Name: idx_data_imports_tenant_processed; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_data_imports_tenant_processed ON public.data_imports USING btree (tenant_id, processed_at);


--
-- Name: idx_donations_person; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_donations_person ON public.donations USING btree (tenant_id, person_id);


--
-- Name: idx_donations_stripe_session; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_donations_stripe_session ON public.donations USING btree (stripe_session_id);


--
-- Name: idx_donations_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_donations_tenant ON public.donations USING btree (tenant_id);


--
-- Name: idx_email_attachments_email_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_attachments_email_id ON public.email_attachments USING btree (email_id);


--
-- Name: idx_email_attachments_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_attachments_file_id ON public.email_attachments USING btree (file_id);


--
-- Name: idx_email_bodies_email_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_bodies_email_id ON public.email_bodies USING btree (email_id);


--
-- Name: idx_email_drafts_user_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_drafts_user_id ON public.email_drafts USING btree (tenant_id, user_id);


--
-- Name: idx_email_headers_email_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_headers_email_id ON public.email_headers USING btree (email_id);


--
-- Name: idx_email_read_states_email; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_read_states_email ON public.email_read_states USING btree (tenant_id, email_id);


--
-- Name: idx_email_read_states_user; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_read_states_user ON public.email_read_states USING btree (tenant_id, user_id);


--
-- Name: idx_email_recipients_email_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_recipients_email_id ON public.email_recipients USING btree (email_id);


--
-- Name: idx_email_recipients_kind; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_email_recipients_kind ON public.email_recipients USING btree (email_id, kind, pos);


--
-- Name: idx_email_trash_tenant_email_unique; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX idx_email_trash_tenant_email_unique ON public.email_trash USING btree (tenant_id, email_id);


--
-- Name: idx_emails_tenant_active; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_emails_tenant_active ON public.emails USING btree (tenant_id, folder_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_emails_tenant_assigned; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_emails_tenant_assigned ON public.emails USING btree (tenant_id, assigned_to);


--
-- Name: idx_emails_tenant_folder; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_emails_tenant_folder ON public.emails USING btree (tenant_id, folder_id);


--
-- Name: idx_emails_tenant_status; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_emails_tenant_status ON public.emails USING btree (tenant_id, status);


--
-- Name: idx_files_sha256; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_files_sha256 ON public.files USING btree (sha256_hex) WHERE (sha256_hex IS NOT NULL);


--
-- Name: idx_files_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_files_tenant ON public.files USING btree (tenant_id);


--
-- Name: idx_households_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_file_id ON public.households USING btree (file_id);


--
-- Name: idx_households_fp_full; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_fp_full ON public.households USING btree (address_fp_full);


--
-- Name: idx_households_fp_street; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_fp_street ON public.households USING btree (address_fp_street);


--
-- Name: idx_households_fts; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_fts ON public.households USING gin (search_vector);


--
-- Name: idx_households_tenant_campaign; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_tenant_campaign ON public.households USING btree (tenant_id, campaign_id);


--
-- Name: idx_households_tenant_geocoding; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_tenant_geocoding ON public.households USING btree (tenant_id, geocoding_status);


--
-- Name: idx_households_tenant_is_placeholder; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_tenant_is_placeholder ON public.households USING btree (tenant_id, is_placeholder);


--
-- Name: idx_households_tenant_type; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_tenant_type ON public.households USING btree (tenant_id, type);


--
-- Name: idx_households_trgm_city; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_trgm_city ON public.households USING gin (city public.gin_trgm_ops);


--
-- Name: idx_households_trgm_state; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_trgm_state ON public.households USING gin (state public.gin_trgm_ops);


--
-- Name: idx_households_trgm_street1; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_trgm_street1 ON public.households USING gin (street1 public.gin_trgm_ops);


--
-- Name: idx_households_trgm_zip; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_households_trgm_zip ON public.households USING gin (zip public.gin_trgm_ops);


--
-- Name: idx_lists_tenant_is_dynamic; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_lists_tenant_is_dynamic ON public.lists USING btree (tenant_id, is_dynamic);


--
-- Name: idx_lists_tenant_object; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_lists_tenant_object ON public.lists USING btree (tenant_id, object);


--
-- Name: idx_lists_tenant_status; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_lists_tenant_status ON public.lists USING btree (tenant_id, status);


--
-- Name: idx_lists_trgm_description; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_lists_trgm_description ON public.lists USING gin (description public.gin_trgm_ops);


--
-- Name: idx_lists_trgm_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_lists_trgm_name ON public.lists USING gin (name public.gin_trgm_ops);


--
-- Name: idx_map_lists_households; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_map_lists_households ON public.map_lists_households USING btree (tenant_id, list_id, household_id);


--
-- Name: idx_map_lists_persons; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_map_lists_persons ON public.map_lists_persons USING btree (tenant_id, list_id, person_id);


--
-- Name: idx_map_teams_lists_team; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_map_teams_lists_team ON public.map_teams_lists USING btree (tenant_id, team_id);


--
-- Name: idx_map_teams_persons_person; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_map_teams_persons_person ON public.map_teams_persons USING btree (tenant_id, person_id);


--
-- Name: idx_map_teams_persons_team; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_map_teams_persons_team ON public.map_teams_persons USING btree (tenant_id, team_id);


--
-- Name: idx_newsletter_events_newsletter_event; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_newsletter_events_newsletter_event ON public.newsletter_events USING btree (newsletter_id, event_type);


--
-- Name: idx_newsletter_events_tenant_newsletter; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_newsletter_events_tenant_newsletter ON public.newsletter_events USING btree (tenant_id, newsletter_id);


--
-- Name: idx_newsletter_events_type; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_newsletter_events_type ON public.newsletter_events USING btree (tenant_id, newsletter_id, event_type);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (tenant_id, user_id, read);


--
-- Name: idx_notifications_tenant_user; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_notifications_tenant_user ON public.notifications USING btree (tenant_id, user_id);


--
-- Name: idx_persons_company_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_company_id ON public.persons USING btree (company_id);


--
-- Name: idx_persons_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_file_id ON public.persons USING btree (file_id);


--
-- Name: idx_persons_fts; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_fts ON public.persons USING gin (search_vector);


--
-- Name: idx_persons_tenant_assigned; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_tenant_assigned ON public.persons USING btree (tenant_id, assigned_to);


--
-- Name: idx_persons_tenant_company; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_tenant_company ON public.persons USING btree (tenant_id, company_id);


--
-- Name: idx_persons_tenant_email_btree; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_tenant_email_btree ON public.persons USING btree (tenant_id, email);


--
-- Name: idx_persons_tenant_email_unique; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX idx_persons_tenant_email_unique ON public.persons USING btree (tenant_id, lower(email)) WHERE ((email IS NOT NULL) AND (TRIM(BOTH FROM email) <> ''::text));


--
-- Name: idx_persons_trgm_email; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_trgm_email ON public.persons USING gin (email public.gin_trgm_ops);


--
-- Name: idx_persons_trgm_first_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_trgm_first_name ON public.persons USING gin (first_name public.gin_trgm_ops);


--
-- Name: idx_persons_trgm_last_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_trgm_last_name ON public.persons USING gin (last_name public.gin_trgm_ops);


--
-- Name: idx_persons_trgm_mobile; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_persons_trgm_mobile ON public.persons USING gin (mobile public.gin_trgm_ops);


--
-- Name: idx_potential_duplicates_company_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_potential_duplicates_company_id ON public.potential_duplicates USING btree (company_id) WHERE (company_id IS NOT NULL);


--
-- Name: idx_potential_duplicates_household_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_potential_duplicates_household_id ON public.potential_duplicates USING btree (household_id) WHERE (household_id IS NOT NULL);


--
-- Name: idx_potential_duplicates_person_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_potential_duplicates_person_id ON public.potential_duplicates USING btree (person_id);


--
-- Name: idx_potential_duplicates_tenant_group; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_potential_duplicates_tenant_group ON public.potential_duplicates USING btree (tenant_id, group_key);


--
-- Name: idx_potential_duplicates_unique_group_company; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX idx_potential_duplicates_unique_group_company ON public.potential_duplicates USING btree (group_key, company_id) WHERE (company_id IS NOT NULL);


--
-- Name: idx_potential_duplicates_unique_group_household; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX idx_potential_duplicates_unique_group_household ON public.potential_duplicates USING btree (group_key, household_id) WHERE (household_id IS NOT NULL);


--
-- Name: idx_potential_duplicates_unique_group_person; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX idx_potential_duplicates_unique_group_person ON public.potential_duplicates USING btree (group_key, person_id);


--
-- Name: idx_profiles_avatar_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_profiles_avatar_file_id ON public.profiles USING btree (avatar_file_id);


--
-- Name: idx_tags_tenant_type; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tags_tenant_type ON public.tags USING btree (tenant_id, type);


--
-- Name: idx_tags_trgm_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tags_trgm_name ON public.tags USING gin (name public.gin_trgm_ops);


--
-- Name: idx_task_attachments_task_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments USING btree (task_id);


--
-- Name: idx_task_comments_task_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_task_comments_task_id ON public.task_comments USING btree (task_id);


--
-- Name: idx_task_subtasks_task_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_task_subtasks_task_id ON public.task_subtasks USING btree (task_id);


--
-- Name: idx_tasks_file_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tasks_file_id ON public.tasks USING btree (file_id);


--
-- Name: idx_tasks_team_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tasks_team_id ON public.tasks USING btree (team_id);


--
-- Name: idx_tasks_tenant_assigned; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tasks_tenant_assigned ON public.tasks USING btree (tenant_id, assigned_to);


--
-- Name: idx_tasks_tenant_due; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tasks_tenant_due ON public.tasks USING btree (tenant_id, due_at);


--
-- Name: idx_tasks_tenant_status; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_tasks_tenant_status ON public.tasks USING btree (tenant_id, status);


--
-- Name: idx_teams_lead_user; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_teams_lead_user ON public.teams USING btree (team_lead_user_id);


--
-- Name: idx_teams_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_teams_tenant ON public.teams USING btree (tenant_id);


--
-- Name: idx_teams_tenant_captain; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_teams_tenant_captain ON public.teams USING btree (tenant_id, team_captain_id);


--
-- Name: idx_user_activity_activity; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_user_activity_activity ON public.user_activity USING btree (activity);


--
-- Name: idx_user_activity_entity_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_user_activity_entity_id ON public.user_activity USING btree (tenant_id, entity, entity_id);


--
-- Name: idx_user_activity_tenant_entity; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_user_activity_tenant_entity ON public.user_activity USING btree (tenant_id, entity, entity_id);


--
-- Name: idx_user_activity_tenant_user; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_user_activity_tenant_user ON public.user_activity USING btree (tenant_id, user_id);


--
-- Name: idx_user_activity_user; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_user_activity_user ON public.user_activity USING btree (tenant_id, user_id);


--
-- Name: idx_volunteer_events_dates; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_dates ON public.volunteer_events USING btree (tenant_id, start_time, end_time);


--
-- Name: idx_volunteer_events_fts; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_fts ON public.volunteer_events USING gin (search_vector);


--
-- Name: idx_volunteer_events_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_tenant ON public.volunteer_events USING btree (tenant_id);


--
-- Name: idx_volunteer_events_tenant_end; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_tenant_end ON public.volunteer_events USING btree (tenant_id, end_time);


--
-- Name: idx_volunteer_events_tenant_start; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_tenant_start ON public.volunteer_events USING btree (tenant_id, start_time);


--
-- Name: idx_volunteer_events_trgm_location; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_trgm_location ON public.volunteer_events USING gin (location_address public.gin_trgm_ops);


--
-- Name: idx_volunteer_events_trgm_name; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_events_trgm_name ON public.volunteer_events USING gin (name public.gin_trgm_ops);


--
-- Name: idx_volunteer_shifts_event; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_shifts_event ON public.volunteer_shifts USING btree (tenant_id, event_id);


--
-- Name: idx_volunteer_shifts_person; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_shifts_person ON public.volunteer_shifts USING btree (tenant_id, person_id);


--
-- Name: idx_volunteer_shifts_tenant; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_volunteer_shifts_tenant ON public.volunteer_shifts USING btree (tenant_id);


--
-- Name: idx_webhook_events_status_run_at; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_webhook_events_status_run_at ON public.webhook_events USING btree (status, run_at);


--
-- Name: idx_workflow_enrollments_next_run; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflow_enrollments_next_run ON public.workflow_enrollments USING btree (status, next_run_at);


--
-- Name: idx_workflow_enrollments_tenant_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflow_enrollments_tenant_id ON public.workflow_enrollments USING btree (tenant_id);


--
-- Name: idx_workflow_enrollments_workflow_person; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflow_enrollments_workflow_person ON public.workflow_enrollments USING btree (workflow_id, person_id);


--
-- Name: idx_workflow_steps_tenant_workflow; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflow_steps_tenant_workflow ON public.workflow_steps USING btree (tenant_id, workflow_id, step_number);


--
-- Name: idx_workflows_tenant_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflows_tenant_id ON public.workflows USING btree (tenant_id);


--
-- Name: idx_workflows_trigger_event_id; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX idx_workflows_trigger_event_id ON public.workflows USING btree (trigger_event_id);


--
-- Name: ms_oauth_tokens_tenant_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX ms_oauth_tokens_tenant_idx ON public.ms_oauth_tokens USING btree (tenant_id);


--
-- Name: newsletters_tenant_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX newsletters_tenant_idx ON public.newsletters USING btree (tenant_id);


--
-- Name: passkeys_credential_id_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX passkeys_credential_id_idx ON public.passkeys USING btree (credential_id);


--
-- Name: passkeys_user_id_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX passkeys_user_id_idx ON public.passkeys USING btree (user_id);


--
-- Name: pc_from_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX pc_from_idx ON public.person_connections USING btree (tenant_id, from_person_id);


--
-- Name: pc_to_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX pc_to_idx ON public.person_connections USING btree (tenant_id, to_person_id);


--
-- Name: pc_unique_edge; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE UNIQUE INDEX pc_unique_edge ON public.person_connections USING btree (tenant_id, from_person_id, to_person_id, relation_type);


--
-- Name: peoples_tag_map_tenant_person_tag_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX peoples_tag_map_tenant_person_tag_index ON public.map_peoples_tags USING btree (tenant_id, person_id, tag_id);


--
-- Name: persons_tenant_campaign_household_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX persons_tenant_campaign_household_index ON public.persons USING btree (tenant_id, campaign_id, household_id);


--
-- Name: sessions_refresh_token_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX sessions_refresh_token_index ON public.sessions USING btree (refresh_token);


--
-- Name: sessions_session_id_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX sessions_session_id_index ON public.sessions USING btree (session_id);


--
-- Name: sessions_user_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX sessions_user_index ON public.sessions USING btree (user_id);


--
-- Name: tasks_tenant_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX tasks_tenant_index ON public.tasks USING btree (tenant_id);


--
-- Name: web_forms_tenant_index; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX web_forms_tenant_index ON public.web_forms USING btree (tenant_id);


--
-- Name: zapier_subscriptions_tenant_id_idx; Type: INDEX; Schema: public; Owner: zeehamid
--

CREATE INDEX zapier_subscriptions_tenant_id_idx ON public.zapier_subscriptions USING btree (tenant_id);


--
-- Name: authusers trg_authusers_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_authusers_updated_at BEFORE UPDATE ON public.authusers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: campaigns trg_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: companies trg_companies_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_bodies trg_email_bodies_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_email_bodies_updated_at BEFORE UPDATE ON public.email_bodies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_comments trg_email_comments_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_email_comments_updated_at BEFORE UPDATE ON public.email_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_drafts trg_email_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_email_drafts_updated_at BEFORE UPDATE ON public.email_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_headers trg_email_headers_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_email_headers_updated_at BEFORE UPDATE ON public.email_headers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: emails trg_emails_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: households trg_households_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lists trg_lists_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: newsletters trg_newsletters_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_newsletters_updated_at BEFORE UPDATE ON public.newsletters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notifications trg_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: persons trg_persons_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: settings trg_settings_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tags trg_tags_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_attachments trg_task_attachments_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_task_attachments_updated_at BEFORE UPDATE ON public.task_attachments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_comments trg_task_comments_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_task_comments_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_subtasks trg_task_subtasks_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_task_subtasks_updated_at BEFORE UPDATE ON public.task_subtasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teams trg_teams_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: volunteer_events trg_volunteer_events_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_volunteer_events_updated_at BEFORE UPDATE ON public.volunteer_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: volunteer_shifts trg_volunteer_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_volunteer_shifts_updated_at BEFORE UPDATE ON public.volunteer_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: web_forms trg_web_forms_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_web_forms_updated_at BEFORE UPDATE ON public.web_forms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: workflows trg_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trg_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: background_jobs trigger_notify_job_inserted; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trigger_notify_job_inserted AFTER INSERT ON public.background_jobs FOR EACH ROW EXECUTE FUNCTION public.notify_job_inserted();


--
-- Name: webhook_events trigger_notify_webhook_event_inserted; Type: TRIGGER; Schema: public; Owner: zeehamid
--

CREATE TRIGGER trigger_notify_webhook_event_inserted AFTER INSERT ON public.webhook_events FOR EACH ROW EXECUTE FUNCTION public.notify_webhook_event_inserted();


--
-- Name: email_comments email_comments_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_comments
    ADD CONSTRAINT email_comments_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_trash email_trash_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash
    ADD CONSTRAINT email_trash_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: tenants fk_admin_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT fk_admin_id FOREIGN KEY (admin_id) REFERENCES public.authusers(id);


--
-- Name: campaigns fk_admin_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_admin_id FOREIGN KEY (admin_id) REFERENCES public.authusers(id);


--
-- Name: authusers fk_authusers_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.authusers
    ADD CONSTRAINT fk_authusers_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: authusers fk_authusers_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.authusers
    ADD CONSTRAINT fk_authusers_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: background_jobs fk_background_jobs_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.background_jobs
    ADD CONSTRAINT fk_background_jobs_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: households fk_campaign_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT fk_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: persons fk_campaign_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: map_campaigns_users fk_campaign_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_campaigns_users
    ADD CONSTRAINT fk_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaigns fk_campaigns_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_campaigns_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: campaigns fk_campaigns_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_campaigns_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: companies fk_companies_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: companies fk_companies_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: companies fk_companies_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: tenants fk_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT fk_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: campaigns fk_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: households fk_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT fk_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: persons fk_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: data_exports fk_data_exports_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT fk_data_exports_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: data_exports fk_data_exports_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT fk_data_exports_user FOREIGN KEY (user_id) REFERENCES public.authusers(id);


--
-- Name: data_imports fk_data_imports_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT fk_data_imports_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: data_imports fk_data_imports_tag; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT fk_data_imports_tag FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE SET NULL;


--
-- Name: data_imports fk_data_imports_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT fk_data_imports_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: data_imports fk_data_imports_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT fk_data_imports_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: donation_pledges fk_donation_pledges_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donation_pledges
    ADD CONSTRAINT fk_donation_pledges_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_pledge; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_pledge FOREIGN KEY (pledge_id) REFERENCES public.donation_pledges(id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: email_attachments fk_email_attachments_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT fk_email_attachments_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_attachments fk_email_attachments_file; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT fk_email_attachments_file FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL;


--
-- Name: email_bodies fk_email_bodies_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_bodies
    ADD CONSTRAINT fk_email_bodies_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_comments fk_email_comments_author; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_comments
    ADD CONSTRAINT fk_email_comments_author FOREIGN KEY (author_id) REFERENCES public.authusers(id);


--
-- Name: email_comments fk_email_comments_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_comments
    ADD CONSTRAINT fk_email_comments_email FOREIGN KEY (email_id) REFERENCES public.emails(id);


--
-- Name: email_drafts fk_email_drafts_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_drafts
    ADD CONSTRAINT fk_email_drafts_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: email_drafts fk_email_drafts_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_drafts
    ADD CONSTRAINT fk_email_drafts_user FOREIGN KEY (user_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: email_headers fk_email_headers_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_headers
    ADD CONSTRAINT fk_email_headers_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_read_states fk_email_read_states_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_read_states
    ADD CONSTRAINT fk_email_read_states_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_read_states fk_email_read_states_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_read_states
    ADD CONSTRAINT fk_email_read_states_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: email_read_states fk_email_read_states_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_read_states
    ADD CONSTRAINT fk_email_read_states_user FOREIGN KEY (user_id) REFERENCES public.authusers(id);


--
-- Name: email_recipients fk_email_recipients_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_recipients
    ADD CONSTRAINT fk_email_recipients_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_trash fk_email_trash_email; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash
    ADD CONSTRAINT fk_email_trash_email FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_trash fk_email_trash_folder; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash
    ADD CONSTRAINT fk_email_trash_folder FOREIGN KEY (from_folder_id) REFERENCES public.email_folders(id) ON DELETE CASCADE;


--
-- Name: email_trash fk_email_trash_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.email_trash
    ADD CONSTRAINT fk_email_trash_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: emails fk_emails_assigned; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT fk_emails_assigned FOREIGN KEY (assigned_to) REFERENCES public.authusers(id);


--
-- Name: emails fk_emails_folder; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT fk_emails_folder FOREIGN KEY (folder_id) REFERENCES public.email_folders(id);


--
-- Name: event_registrations fk_event_registrations_event; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT fk_event_registrations_event FOREIGN KEY (event_id, tenant_id) REFERENCES public.events(id, tenant_id) ON DELETE CASCADE;


--
-- Name: event_registrations fk_event_registrations_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT fk_event_registrations_person FOREIGN KEY (person_id, tenant_id) REFERENCES public.persons(id, tenant_id) ON DELETE CASCADE;


--
-- Name: event_registrations fk_event_registrations_ticket_type; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT fk_event_registrations_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id) ON DELETE SET NULL;


--
-- Name: event_ticket_types fk_event_ticket_types_event; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.event_ticket_types
    ADD CONSTRAINT fk_event_ticket_types_event FOREIGN KEY (event_id, tenant_id) REFERENCES public.events(id, tenant_id) ON DELETE CASCADE;


--
-- Name: volunteer_events fk_events_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT fk_events_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: volunteer_events fk_events_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT fk_events_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: volunteer_events fk_events_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_events
    ADD CONSTRAINT fk_events_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: files fk_files_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT fk_files_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: files fk_files_uploaded_by; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT fk_files_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.authusers(id) ON DELETE SET NULL;


--
-- Name: households fk_househods_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT fk_househods_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: persons fk_household_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_household_id FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: households fk_households_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT fk_households_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: lists fk_lists_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT fk_lists_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: lists fk_lists_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT fk_lists_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: lists fk_lists_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT fk_lists_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: map_campaigns_users fk_map_campaigns_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_campaigns_users
    ADD CONSTRAINT fk_map_campaigns_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_households_tags fk_map_household_tags_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_households_tags
    ADD CONSTRAINT fk_map_household_tags_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_lists_households fk_map_lists_households_household; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT fk_map_lists_households_household FOREIGN KEY (household_id) REFERENCES public.households(id);


--
-- Name: map_lists_households fk_map_lists_households_list; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT fk_map_lists_households_list FOREIGN KEY (list_id) REFERENCES public.lists(id);


--
-- Name: map_lists_households fk_map_lists_households_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT fk_map_lists_households_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_lists_persons fk_map_lists_persons_list; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT fk_map_lists_persons_list FOREIGN KEY (list_id) REFERENCES public.lists(id);


--
-- Name: map_lists_persons fk_map_lists_persons_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT fk_map_lists_persons_person FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: map_lists_persons fk_map_lists_persons_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT fk_map_lists_persons_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_peoples_tags fk_map_peoples_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_peoples_tags
    ADD CONSTRAINT fk_map_peoples_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_teams_lists fk_map_teams_lists_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT fk_map_teams_lists_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: map_teams_lists fk_map_teams_lists_list; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT fk_map_teams_lists_list FOREIGN KEY (list_id) REFERENCES public.lists(id);


--
-- Name: map_teams_lists fk_map_teams_lists_team; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT fk_map_teams_lists_team FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: map_teams_lists fk_map_teams_lists_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT fk_map_teams_lists_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_teams_lists fk_map_teams_lists_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT fk_map_teams_lists_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: map_teams_persons fk_map_teams_persons_created; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT fk_map_teams_persons_created FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: map_teams_persons fk_map_teams_persons_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT fk_map_teams_persons_person FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: map_teams_persons fk_map_teams_persons_team; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT fk_map_teams_persons_team FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: map_teams_persons fk_map_teams_persons_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT fk_map_teams_persons_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: map_teams_persons fk_map_teams_persons_updated; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT fk_map_teams_persons_updated FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: newsletter_events fk_newsletter_events_newsletter_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletter_events
    ADD CONSTRAINT fk_newsletter_events_newsletter_id FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id) ON DELETE CASCADE;


--
-- Name: newsletter_events fk_newsletter_events_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletter_events
    ADD CONSTRAINT fk_newsletter_events_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: newsletters fk_newsletters_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT fk_newsletters_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: newsletters fk_newsletters_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT fk_newsletters_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: newsletters fk_newsletters_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT fk_newsletters_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: notifications fk_notifications_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: persons fk_persons_assigned_to; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_persons_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.authusers(id) ON DELETE SET NULL;


--
-- Name: persons fk_persons_company; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_persons_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: persons fk_persons_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_persons_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: persons fk_persons_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT fk_persons_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: potential_duplicates fk_potential_duplicates_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates
    ADD CONSTRAINT fk_potential_duplicates_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: potential_duplicates fk_potential_duplicates_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates
    ADD CONSTRAINT fk_potential_duplicates_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: profiles fk_profiles_auth_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_auth_id FOREIGN KEY (auth_id) REFERENCES public.authusers(id);


--
-- Name: profiles fk_profiles_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: profiles fk_profiles_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: profiles fk_profiles_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: settings fk_settings_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT fk_settings_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: volunteer_shifts fk_shifts_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT fk_shifts_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: volunteer_shifts fk_shifts_event; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT fk_shifts_event FOREIGN KEY (event_id) REFERENCES public.volunteer_events(id) ON DELETE CASCADE;


--
-- Name: volunteer_shifts fk_shifts_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT fk_shifts_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: volunteer_shifts fk_shifts_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT fk_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: volunteer_shifts fk_shifts_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.volunteer_shifts
    ADD CONSTRAINT fk_shifts_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: tags fk_tags_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT fk_tags_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: task_attachments fk_task_attachments_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT fk_task_attachments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: task_comments fk_task_comments_author; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT fk_task_comments_author FOREIGN KEY (author_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: task_comments fk_task_comments_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT fk_task_comments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: task_subtasks fk_task_subtasks_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_subtasks
    ADD CONSTRAINT fk_task_subtasks_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tasks fk_tasks_assigned_to; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.authusers(id);


--
-- Name: tasks fk_tasks_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: tasks fk_tasks_team_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_team_id FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: tasks fk_tasks_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tasks fk_tasks_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: teams fk_teams_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: teams fk_teams_team_captain; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_team_captain FOREIGN KEY (team_captain_id) REFERENCES public.persons(id) ON DELETE SET NULL;


--
-- Name: teams fk_teams_team_lead_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_team_lead_user FOREIGN KEY (team_lead_user_id) REFERENCES public.authusers(id);


--
-- Name: teams fk_teams_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: teams fk_teams_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: user_activity fk_user_activity_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT fk_user_activity_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: user_activity fk_user_activity_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT fk_user_activity_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: user_activity fk_user_activity_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT fk_user_activity_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: user_activity fk_user_activity_user; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT fk_user_activity_user FOREIGN KEY (user_id) REFERENCES public.authusers(id);


--
-- Name: map_campaigns_users fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_campaigns_users
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.authusers(id);


--
-- Name: web_forms fk_web_forms_createdby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT fk_web_forms_createdby_id FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: web_forms fk_web_forms_tenant_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT fk_web_forms_tenant_id FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: web_forms fk_web_forms_updatedby_id; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.web_forms
    ADD CONSTRAINT fk_web_forms_updatedby_id FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: webhook_events fk_webhook_events_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT fk_webhook_events_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflow_enrollments fk_workflow_enrollments_person; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_enrollments
    ADD CONSTRAINT fk_workflow_enrollments_person FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: workflow_enrollments fk_workflow_enrollments_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_enrollments
    ADD CONSTRAINT fk_workflow_enrollments_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflow_enrollments fk_workflow_enrollments_workflow; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_enrollments
    ADD CONSTRAINT fk_workflow_enrollments_workflow FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_steps fk_workflow_steps_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT fk_workflow_steps_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflow_steps fk_workflow_steps_workflow; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT fk_workflow_steps_workflow FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows fk_workflows_createdby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT fk_workflows_createdby FOREIGN KEY (createdby_id) REFERENCES public.authusers(id);


--
-- Name: workflows fk_workflows_tenant; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT fk_workflows_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflows fk_workflows_updatedby; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT fk_workflows_updatedby FOREIGN KEY (updatedby_id) REFERENCES public.authusers(id);


--
-- Name: map_households_tags map_households_tags_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_households_tags
    ADD CONSTRAINT map_households_tags_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: map_households_tags map_households_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_households_tags
    ADD CONSTRAINT map_households_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: map_lists_households map_lists_households_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT map_lists_households_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: map_lists_households map_lists_households_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_households
    ADD CONSTRAINT map_lists_households_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: map_lists_persons map_lists_persons_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT map_lists_persons_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: map_lists_persons map_lists_persons_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_lists_persons
    ADD CONSTRAINT map_lists_persons_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: map_peoples_tags map_peoples_tags_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_peoples_tags
    ADD CONSTRAINT map_peoples_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: map_peoples_tags map_peoples_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_peoples_tags
    ADD CONSTRAINT map_peoples_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: map_teams_lists map_teams_lists_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT map_teams_lists_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: map_teams_lists map_teams_lists_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_lists
    ADD CONSTRAINT map_teams_lists_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: map_teams_persons map_teams_persons_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT map_teams_persons_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;


--
-- Name: map_teams_persons map_teams_persons_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.map_teams_persons
    ADD CONSTRAINT map_teams_persons_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: passkeys passkeys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.passkeys
    ADD CONSTRAINT passkeys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: person_connections pc_from_person_fk; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.person_connections
    ADD CONSTRAINT pc_from_person_fk FOREIGN KEY (from_person_id, tenant_id) REFERENCES public.persons(id, tenant_id) ON DELETE CASCADE;


--
-- Name: person_connections pc_to_person_fk; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.person_connections
    ADD CONSTRAINT pc_to_person_fk FOREIGN KEY (to_person_id, tenant_id) REFERENCES public.persons(id, tenant_id) ON DELETE CASCADE;


--
-- Name: potential_duplicates potential_duplicates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates
    ADD CONSTRAINT potential_duplicates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: potential_duplicates potential_duplicates_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.potential_duplicates
    ADD CONSTRAINT potential_duplicates_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_auth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_avatar_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_avatar_file_id_fkey FOREIGN KEY (avatar_file_id) REFERENCES public.files(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.authusers(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_subtasks task_subtasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.task_subtasks
    ADD CONSTRAINT task_subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_placeholder_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_placeholder_household_id_fkey FOREIGN KEY (placeholder_household_id) REFERENCES public.households(id) ON DELETE SET NULL;


--
-- Name: zapier_subscriptions zapier_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: zeehamid
--

ALTER TABLE ONLY public.zapier_subscriptions
    ADD CONSTRAINT zapier_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: zee
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict oPFHGUe6wVNuN0eNnQazqyJQjnNPomJSMJiQZMlpJpzgVIBdJCJVrckJoNfysZW

