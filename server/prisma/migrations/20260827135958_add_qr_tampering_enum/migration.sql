-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SUCCESS', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RiskVerdict" AS ENUM ('PASS', 'WARN', 'CHALLENGE', 'BLOCK');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('FRAUD', 'IMPERSONATION', 'SPAM', 'HARASSMENT', 'QR_TAMPERING', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LivenessVerdict" AS ENUM ('PASS', 'FAIL', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QrVerdict" AS ENUM ('VERIFIED', 'UNVERIFIED', 'TAMPERED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_circle_contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_vpa" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safe_circle_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "complainant_id" TEXT NOT NULL,
    "target_vpa" TEXT NOT NULL,
    "target_user_id" TEXT,
    "category" "ComplaintCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_url" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liveness_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_code" TEXT NOT NULL,
    "client_score" INTEGER NOT NULL DEFAULT 0,
    "server_score" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "verdict" "LivenessVerdict" NOT NULL DEFAULT 'FAIL',
    "face_embedding_hash" TEXT,
    "transaction_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liveness_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_registry" (
    "id" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_type" TEXT NOT NULL DEFAULT 'RETAIL',
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "geo_lat" DOUBLE PRECISION NOT NULL,
    "geo_lng" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 100,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "jwt_signature" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "face_blob_id" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_blobs" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "encrypted_data" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "viewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_blobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MODERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim_bank_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL DEFAULT 'SBIN0000001',
    "account_number_masked" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'SAVINGS',
    "balance_paisa" BIGINT NOT NULL DEFAULT 1000000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim_upi_handles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_upi_handles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim_transactions" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_vpa" TEXT NOT NULL,
    "receiver_id" TEXT,
    "amount_paisa" BIGINT NOT NULL,
    "note" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "risk_verdict" "RiskVerdict" NOT NULL DEFAULT 'PASS',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_signals" JSONB NOT NULL DEFAULT '[]',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sim_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scan_logs" (
    "id" TEXT NOT NULL,
    "scanned_by" TEXT,
    "vpa" TEXT NOT NULL,
    "merchant_id" TEXT,
    "verdict" "QrVerdict" NOT NULL,
    "device_lat" DOUBLE PRECISION,
    "device_lng" DOUBLE PRECISION,
    "merchant_lat" DOUBLE PRECISION,
    "merchant_lng" DOUBLE PRECISION,
    "distance_m" DOUBLE PRECISION,
    "raw_payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_risk_score_idx" ON "users"("risk_score");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "risk_events_user_id_idx" ON "risk_events"("user_id");

-- CreateIndex
CREATE INDEX "risk_events_user_id_created_at_idx" ON "risk_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_events_event_type_idx" ON "risk_events"("event_type");

-- CreateIndex
CREATE INDEX "risk_events_source_idx" ON "risk_events"("source");

-- CreateIndex
CREATE INDEX "safe_circle_contacts_user_id_idx" ON "safe_circle_contacts"("user_id");

-- CreateIndex
CREATE INDEX "safe_circle_contacts_contact_vpa_idx" ON "safe_circle_contacts"("contact_vpa");

-- CreateIndex
CREATE UNIQUE INDEX "safe_circle_contacts_user_id_contact_vpa_key" ON "safe_circle_contacts"("user_id", "contact_vpa");

-- CreateIndex
CREATE INDEX "complaints_complainant_id_idx" ON "complaints"("complainant_id");

-- CreateIndex
CREATE INDEX "complaints_target_vpa_idx" ON "complaints"("target_vpa");

-- CreateIndex
CREATE INDEX "complaints_target_vpa_status_idx" ON "complaints"("target_vpa", "status");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "liveness_sessions_user_id_idx" ON "liveness_sessions"("user_id");

-- CreateIndex
CREATE INDEX "liveness_sessions_transaction_id_idx" ON "liveness_sessions"("transaction_id");

-- CreateIndex
CREATE INDEX "liveness_sessions_verdict_idx" ON "liveness_sessions"("verdict");

-- CreateIndex
CREATE INDEX "liveness_sessions_expires_at_idx" ON "liveness_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_registry_vpa_key" ON "merchant_registry"("vpa");

-- CreateIndex
CREATE INDEX "merchant_registry_geo_lat_geo_lng_idx" ON "merchant_registry"("geo_lat", "geo_lng");

-- CreateIndex
CREATE INDEX "merchant_registry_is_verified_idx" ON "merchant_registry"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_transaction_id_key" ON "certificates"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_face_blob_id_key" ON "certificates"("face_blob_id");

-- CreateIndex
CREATE INDEX "certificates_payload_hash_idx" ON "certificates"("payload_hash");

-- CreateIndex
CREATE INDEX "certificates_issued_at_idx" ON "certificates"("issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "face_blobs_certificate_id_key" ON "face_blobs"("certificate_id");

-- CreateIndex
CREATE INDEX "face_blobs_is_viewed_idx" ON "face_blobs"("is_viewed");

-- CreateIndex
CREATE INDEX "face_blobs_expires_at_idx" ON "face_blobs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sim_bank_accounts_account_number_masked_key" ON "sim_bank_accounts"("account_number_masked");

-- CreateIndex
CREATE INDEX "sim_bank_accounts_user_id_idx" ON "sim_bank_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sim_upi_handles_vpa_key" ON "sim_upi_handles"("vpa");

-- CreateIndex
CREATE INDEX "sim_upi_handles_user_id_idx" ON "sim_upi_handles"("user_id");

-- CreateIndex
CREATE INDEX "sim_upi_handles_vpa_idx" ON "sim_upi_handles"("vpa");

-- CreateIndex
CREATE UNIQUE INDEX "sim_transactions_idempotency_key_key" ON "sim_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "sim_transactions_sender_id_idx" ON "sim_transactions"("sender_id");

-- CreateIndex
CREATE INDEX "sim_transactions_receiver_id_idx" ON "sim_transactions"("receiver_id");

-- CreateIndex
CREATE INDEX "sim_transactions_receiver_vpa_idx" ON "sim_transactions"("receiver_vpa");

-- CreateIndex
CREATE INDEX "sim_transactions_status_idx" ON "sim_transactions"("status");

-- CreateIndex
CREATE INDEX "sim_transactions_created_at_idx" ON "sim_transactions"("created_at");

-- CreateIndex
CREATE INDEX "sim_transactions_risk_verdict_idx" ON "sim_transactions"("risk_verdict");

-- CreateIndex
CREATE INDEX "qr_scan_logs_verdict_idx" ON "qr_scan_logs"("verdict");

-- CreateIndex
CREATE INDEX "qr_scan_logs_created_at_idx" ON "qr_scan_logs"("created_at");

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "sim_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_circle_contacts" ADD CONSTRAINT "safe_circle_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_complainant_id_fkey" FOREIGN KEY ("complainant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "sim_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveness_sessions" ADD CONSTRAINT "liveness_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveness_sessions" ADD CONSTRAINT "liveness_sessions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "sim_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "sim_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_blobs" ADD CONSTRAINT "face_blobs_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_bank_accounts" ADD CONSTRAINT "sim_bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_upi_handles" ADD CONSTRAINT "sim_upi_handles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_transactions" ADD CONSTRAINT "sim_transactions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_transactions" ADD CONSTRAINT "sim_transactions_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
