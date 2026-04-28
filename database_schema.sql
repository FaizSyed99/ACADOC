-- =============================================================================
-- ACADOC AI - DATABASE SCHEMA FOR 3RD YEAR MBBS
-- Technical Plan v1.2: Task 2 - Database Schema Updates
-- Using SurrealDB syntax
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: subject_prompts
-- Purpose: Store mapping between subject+intent and system prompts
-- Technical Plan: §3 (Textbook Grounding), §8 (Agent Architecture)
-- -----------------------------------------------------------------------------
DEFINE TABLE subject_prompts SCHEMAFULL;

DEFINE FIELD subject ON subject_prompts TYPE string 
    ASSERT $value IN ["PSM", "ENT", "Ophthalmology", "Forensic"];
DEFINE FIELD intent ON subject_prompts TYPE string 
    ASSERT $value IN ["revise", "test", "notes"];
DEFINE FIELD system_prompt ON subject_prompts TYPE string;
DEFINE FIELD textbook ON subject_prompts TYPE string;
DEFINE FIELD created_at ON subject_prompts TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON subject_prompts TYPE datetime DEFAULT time::now();

-- Index for fast lookups by subject+intent combination
DEFINE INDEX idx_subject_intent ON subject_prompts FIELDS subject, intent UNIQUE;

-- Seed data for 12 prompt variants (4 subjects × 3 intents)
CREATE subject_prompts SET 
    subject = "PSM", 
    intent = "revise", 
    system_prompt = "You are a 3rd Year MBBS Community Medicine tutor specializing in K. Park's Preventive and Social Medicine. Structure answers in LAQ format: Definition → Classification → Pathophysiology → Clinical Features → Management/Prevention → Diagram suggestion. Cite K. Park textbook sections.",
    textbook = "K. Park";

CREATE subject_prompts SET 
    subject = "PSM", 
    intent = "test", 
    system_prompt = "You are a Community Medicine exam tutor for quick revision. Provide concise, high-yield answers for MCQs and short notes. Focus on definitions, classifications, key numbers, formulas, national programs.",
    textbook = "K. Park";

CREATE subject_prompts SET 
    subject = "PSM", 
    intent = "notes", 
    system_prompt = "You are a PSM note-making assistant for structured revision. Create organized bullet points with key facts, statistics, and national program details.",
    textbook = "K. Park";

CREATE subject_prompts SET 
    subject = "ENT", 
    intent = "revise", 
    system_prompt = "You are a 3rd Year MBBS ENT tutor specializing in PL Dhingra's Diseases of Ear, Nose and Throat. Structure answers in LAQ format with clinical focus on tuning fork tests, otoscopy findings, and surgical steps.",
    textbook = "PL Dhingra";

CREATE subject_prompts SET 
    subject = "ENT", 
    intent = "test", 
    system_prompt = "You are an ENT exam tutor for rapid revision. Provide concise answers focusing on clinical signs, classifications, surgical steps, and instrument names.",
    textbook = "PL Dhingra";

CREATE subject_prompts SET 
    subject = "ENT", 
    intent = "notes", 
    system_prompt = "You are an ENT note-making assistant. Create structured notes with anatomy recap, classifications, clinical features, investigations, and management.",
    textbook = "PL Dhingra";

CREATE subject_prompts SET 
    subject = "Ophthalmology", 
    intent = "revise", 
    system_prompt = "You are a 3rd Year MBBS Ophthalmology tutor specializing in AK Khurana's Comprehensive Ophthalmology. Structure answers with clinical staging, visual acuity, fundus findings, and surgical procedures.",
    textbook = "AK Khurana";

CREATE subject_prompts SET 
    subject = "Ophthalmology", 
    intent = "test", 
    system_prompt = "You are an Ophthalmology exam tutor for quick revision. Provide concise answers focusing on clinical staging, drug names, surgical procedures, and instrument names.",
    textbook = "AK Khurana";

CREATE subject_prompts SET 
    subject = "Ophthalmology", 
    intent = "notes", 
    system_prompt = "You are an Ophthalmology note-making assistant. Create structured notes with definitions, classifications/staging, clinical features, investigations, and management.",
    textbook = "AK Khurana";

CREATE subject_prompts SET 
    subject = "Forensic", 
    intent = "revise", 
    system_prompt = "You are a 3rd Year MBBS Forensic Medicine tutor specializing in KS Narayan Reddy's Essentials of Forensic Medicine. Structure answers in LAQ format matching LAQ.pdf: Definition → Types → Pathophysiology → Clinical/Legal Features → Causes → Management → IPC/CrPC sections.",
    textbook = "KS Narayan Reddy";

CREATE subject_prompts SET 
    subject = "Forensic", 
    intent = "test", 
    system_prompt = "You are a Forensic Medicine exam tutor for rapid revision. Provide concise answers focusing on IPC/CrPC sections, post-mortem findings, time since death, and poison characteristics.",
    textbook = "KS Narayan Reddy";

CREATE subject_prompts SET 
    subject = "Forensic", 
    intent = "notes", 
    system_prompt = "You are a Forensic Medicine note-making assistant. Create structured notes with definitions, types, post-mortem findings, medico-legal aspects, and cause of death trees.",
    textbook = "KS Narayan Reddy";


-- -----------------------------------------------------------------------------
-- TABLE: user_sessions
-- Purpose: Store conversation sessions with context memory
-- Technical Plan: §8 (Conversation Memory & Summarization), §8 (Token Conservation)
-- -----------------------------------------------------------------------------
DEFINE TABLE user_sessions SCHEMAFULL;

DEFINE FIELD user_id ON user_sessions TYPE string;
DEFINE FIELD session_id ON user_sessions TYPE string;
DEFINE FIELD subject ON user_sessions TYPE string 
    ASSERT $value IN ["PSM", "ENT", "Ophthalmology", "Forensic"];
DEFINE FIELD intent ON user_sessions TYPE string 
    ASSERT $value IN ["revise", "test", "notes"];
DEFINE FIELD conversation_summary ON user_sessions TYPE string;
DEFINE FIELD token_count ON user_sessions TYPE int DEFAULT 0;
DEFINE FIELD turn_count ON user_sessions TYPE int DEFAULT 0;
DEFINE FIELD is_active ON user_sessions TYPE bool DEFAULT true;
DEFINE FIELD created_at ON user_sessions TYPE datetime DEFAULT time::now();
DEFINE FIELD last_activity_at ON user_sessions TYPE datetime DEFAULT time::now();

-- Indexes for efficient session management
DEFINE INDEX idx_user_sessions ON user_sessions FIELDS user_id, session_id UNIQUE;
DEFINE INDEX idx_user_active ON user_sessions FIELDS user_id, is_active WHERE is_active = true;
DEFINE INDEX idx_last_activity ON user_sessions FIELDS last_activity_at;

-- Session cleanup event (runs periodically to archive old sessions)
DEFINE EVENT ev_archive_old_sessions ON user_sessions WHEN {
    time::now() - last_activity_at > d"7d" AND is_active = true
} THEN {
    UPDATE user_sessions SET is_active = false WHERE id = $after.id
};


-- -----------------------------------------------------------------------------
-- TABLE: user_activity
-- Purpose: Analytics tracking for monitoring and improvement
-- Technical Plan: §9 (Validation Layer Analytics), §10 (Iterative Improvement)
-- -----------------------------------------------------------------------------
DEFINE TABLE user_activity SCHEMAFULL;

DEFINE FIELD activity_id ON user_activity TYPE string;
DEFINE FIELD user_id ON user_activity TYPE string;
DEFINE FIELD session_id ON user_activity TYPE string;
DEFINE FIELD subject ON user_activity TYPE string;
DEFINE FIELD intent ON user_activity TYPE string;
DEFINE FIELD query ON user_activity TYPE string;
DEFINE FIELD query_length ON user_activity TYPE int;
DEFINE FIELD tokens_used ON user_activity TYPE int;
DEFINE FIELD validation_confidence ON user_activity TYPE float;
DEFINE FIELD fallback_triggered ON user_activity TYPE bool DEFAULT false;
DEFINE FIELD fallback_reason ON user_activity TYPE option<string>;
DEFINE FIELD response_length ON user_activity TYPE int;
DEFINE FIELD timestamp ON user_activity TYPE datetime DEFAULT time::now();

-- Indexes for analytics queries
DEFINE INDEX idx_activity_user ON user_activity FIELDS user_id;
DEFINE INDEX idx_activity_subject ON user_activity FIELDS subject;
DEFINE INDEX idx_activity_timestamp ON user_activity FIELDS timestamp;
DEFINE INDEX idx_activity_fallback ON user_activity FIELDS fallback_triggered WHERE fallback_triggered = true;

-- Analytics views (for common queries)

-- View: Daily active users by subject
DEFINE VIEW dau_by_subject AS 
    SELECT 
        subject, 
        time::date(timestamp) as date, 
        count(distinct user_id) as dau 
    FROM user_activity 
    GROUP BY subject, time::date(timestamp);

-- View: Fallback rate by subject
DEFINE VIEW fallback_rate_by_subject AS 
    SELECT 
        subject, 
        count() as total_queries, 
        count(fallback_triggered) as fallback_count,
        math::mean(validation_confidence) as avg_confidence
    FROM user_activity 
    GROUP BY subject;

-- View: Token usage trends
DEFINE VIEW token_usage_trends AS 
    SELECT 
        time::hour(timestamp) as hour,
        subject,
        math::mean(tokens_used) as avg_tokens,
        math::max(tokens_used) as max_tokens,
        count() as query_count
    FROM user_activity 
    GROUP BY time::hour(timestamp), subject;


-- -----------------------------------------------------------------------------
-- TABLE: vector_metadata (Optional - for future subject-filtered retrieval)
-- Purpose: Store metadata for vector store filtering
-- Technical Plan: Task 3 - Update Vector Store Queries
-- -----------------------------------------------------------------------------
DEFINE TABLE vector_metadata SCHEMAFULL;

DEFINE FIELD chunk_id ON vector_metadata TYPE string;
DEFINE FIELD subject ON vector_metadata TYPE string 
    ASSERT $value IN ["PSM", "ENT", "Ophthalmology", "Forensic"];
DEFINE FIELD textbook ON vector_metadata TYPE string;
DEFINE FIELD chapter ON vector_metadata TYPE string;
DEFINE FIELD topic ON vector_metadata TYPE string;
DEFINE FIELD page_number ON vector_metadata TYPE option<int>;
DEFINE FIELD content_hash ON vector_metadata TYPE string;
DEFINE FIELD created_at ON vector_metadata TYPE datetime DEFAULT time::now();

-- Index for subject-filtered retrieval
DEFINE INDEX idx_vector_subject ON vector_metadata FIELDS subject, chunk_id;
DEFINE INDEX idx_vector_topic ON vector_metadata FIELDS subject, topic;


-- -----------------------------------------------------------------------------
-- FUNCTIONS & PROCEDURES
-- Technical Plan: Supporting utilities for session management and analytics
-- -----------------------------------------------------------------------------

-- Function: Get or create session
DEFINE FUNCTION fn::get_or_create_session($user_id: string, $subject: string, $intent: string) {
    -- Try to find active session
    LET $active_session = SELECT * FROM user_sessions 
        WHERE user_id = $user_id 
        AND subject = $subject 
        AND is_active = true 
        ORDER BY last_activity_at DESC 
        LIMIT 1;
    
    -- If no active session, create new one
    IF count($active_session) == 0 {
        RETURN CREATE user_sessions CONTENT {
            user_id: $user_id,
            session_id: rand::uuid(),
            subject: $subject,
            intent: $intent,
            conversation_summary: "",
            token_count: 0,
            turn_count: 0,
            is_active: true
        };
    }
    
    RETURN $active_session[0];
};

-- Function: Update session with new turn
DEFINE FUNCTION fn::update_session_turn(
    $session_id: string, 
    $summary: string, 
    $tokens: int
) {
    UPDATE user_sessions 
    SET 
        conversation_summary = $summary,
        token_count = token_count + $tokens,
        turn_count = turn_count + 1,
        last_activity_at = time::now()
    WHERE session_id = $session_id;
};

-- Function: Log user activity
DEFINE FUNCTION fn::log_activity(
    $user_id: string,
    $session_id: string,
    $subject: string,
    $intent: string,
    $query: string,
    $tokens_used: int,
    $confidence: float,
    $fallback: bool,
    $fallback_reason: option<string>
) {
    CREATE user_activity CONTENT {
        activity_id: rand::uuid(),
        user_id: $user_id,
        session_id: $session_id,
        subject: $subject,
        intent: $intent,
        query: $query,
        query_length: string::len($query),
        tokens_used: $tokens_used,
        validation_confidence: $confidence,
        fallback_triggered: $fallback,
        fallback_reason: $fallback_reason,
        response_length: 0,
        timestamp: time::now()
    };
};

-- Function: Check token limit
DEFINE FUNCTION fn::check_token_limit($token_count: int) {
    -- Soft limit: 4000 tokens (warn user)
    -- Hard limit: 6000 tokens (force new session)
    IF $token_count >= 6000 {
        RETURN { within_limit: false, action: "new_session", message: "Session limit reached" };
    } ELSE IF $token_count >= 4000 {
        RETURN { within_limit: true, action: "warning", message: "Approaching token limit" };
    } ELSE {
        RETURN { within_limit: true, action: "ok", message: "Within limits" };
    }
};

-- Procedure: Archive old sessions (can be called periodically)
DEFINE PROCEDURE sp::archive_old_sessions($days_inactive: int = 7) {
    UPDATE user_sessions 
    SET is_active = false 
    WHERE last_activity_at < time::now() - d"{ $days_inactive }d" 
    AND is_active = true;
};

-- Procedure: Cleanup old activity logs (keep last 30 days)
DEFINE PROCEDURE sp::cleanup_old_activity($days_to_keep: int = 30) {
    DELETE FROM user_activity 
    WHERE timestamp < time::now() - d"{ $days_to_keep }d";
};


-- -----------------------------------------------------------------------------
-- PERMISSIONS
-- -----------------------------------------------------------------------------

-- Default permissions (adjust based on your auth setup)
DEFINE SCOPE user_scope SESSION 24h;

-- Grant read/write access to authenticated users
FOR user_scope {
    DEFINE GRANT ON user_sessions TO $auth;
    DEFINE GRANT ON user_activity TO $auth;
    DEFINE GRANT ON vector_metadata TO $auth;
    
    -- Read-only access to prompts
    DEFINE GRANT SELECT ON subject_prompts TO $auth;
};

-- Public read access for health checks
DEFINE GRANT SELECT ON TABLE user_activity TO public WHERE false;
