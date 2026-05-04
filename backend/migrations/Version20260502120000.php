<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add B2B contract, workflow, ownership, and trust score breakdown schema updates';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF to_regclass('public.subscription') IS NOT NULL AND to_regclass('public.subscription_b2c') IS NULL THEN
        ALTER TABLE subscription RENAME TO subscription_b2c;
    END IF;
END $$;
SQL);

        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF to_regclass('public.product_listing') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'product_listing'
              AND column_name = 'updatet_at'
        ) AND NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'product_listing'
              AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE product_listing RENAME COLUMN updatet_at TO updated_at;
        END IF;
    END IF;
END $$;
SQL);

        $this->addSql("ALTER TABLE product_listing ADD COLUMN IF NOT EXISTS trust_score_breakdown JSONB DEFAULT NULL");
        $this->addSql("ALTER TABLE b2b_company ADD COLUMN IF NOT EXISTS owner_user_id INTEGER DEFAULT NULL");
        $this->addSql("ALTER TABLE b2b_company ADD COLUMN IF NOT EXISTS seller_id INTEGER DEFAULT NULL");
        $this->addSql("ALTER TABLE b2b_company ADD COLUMN IF NOT EXISTS usage_json JSONB DEFAULT '{}'::jsonb");
        $this->addSql("ALTER TABLE b2b_market ADD COLUMN IF NOT EXISTS owner_user_id INTEGER DEFAULT NULL");
        $this->addSql("ALTER TABLE b2b_market ADD COLUMN IF NOT EXISTS usage_json JSONB DEFAULT '{}'::jsonb");
        $this->addSql("ALTER TABLE notification ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT NULL");
        $this->addSql("ALTER TABLE notification ADD COLUMN IF NOT EXISTS market_id INTEGER DEFAULT NULL");
        $this->addSql("ALTER TABLE notification ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT NULL");
        $this->addSql("ALTER TABLE price_history DROP COLUMN IF EXISTS seller");

        $this->addSql("UPDATE b2b_company SET owner_user_id = id WHERE owner_user_id IS NULL");
        $this->addSql("UPDATE b2b_market SET owner_user_id = id WHERE owner_user_id IS NULL");

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_subscription (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    duration_months INT NOT NULL,
    start_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    end_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    activated_by_admin_id INT DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    activated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_watchlist (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    item_type VARCHAR(20) NOT NULL,
    product_id INT DEFAULT NULL,
    category_id INT DEFAULT NULL,
    seller_id INT DEFAULT NULL,
    brand VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_search_log (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    query TEXT NOT NULL,
    results_count INT DEFAULT NULL,
    zero_results BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_ads_request (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    request_type VARCHAR(20) NOT NULL,
    product_id INT DEFAULT NULL,
    category_id INT DEFAULT NULL,
    duration_days INT DEFAULT NULL,
    budget_proposal DOUBLE PRECISION DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_ads_campaign (
    id SERIAL NOT NULL,
    ads_request_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    agreed_price DOUBLE PRECISION DEFAULT NULL,
    starts_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    ends_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    active BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_sponsored_article (
    id SERIAL NOT NULL,
    ads_request_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT NULL,
    url TEXT DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    published_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_report (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    report_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    file_path TEXT DEFAULT NULL,
    period_start TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    period_end TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    generated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_scraping_request (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT DEFAULT NULL,
    is_duplicate BOOLEAN DEFAULT NULL,
    duplicate_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_product_brand ON product (brand)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_product_category_id ON product (category_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_product_listing_product_id ON product_listing (product_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_product_listing_seller_id ON product_listing (seller_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON price_history (product_listing_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_review_listing_id ON review (product_listing_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_notification_company_id ON notification (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_notification_market_id ON notification (market_id)');

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_company_owner_user_id ON b2b_company (owner_user_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_company_seller_id ON b2b_company (seller_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_market_owner_user_id ON b2b_market (owner_user_id)');

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_company_id ON b2b_subscription (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_market_id ON b2b_subscription (market_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_ads_request_company_id ON b2b_ads_request (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_ads_request_product_id ON b2b_ads_request (product_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_ads_request_category_id ON b2b_ads_request (category_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_ads_campaign_request_id ON b2b_ads_campaign (ads_request_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_sponsored_article_request_id ON b2b_sponsored_article (ads_request_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_report_company_id ON b2b_report (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_report_market_id ON b2b_report (market_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_scraping_request_company_id ON b2b_scraping_request (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_scraping_request_market_id ON b2b_scraping_request (market_id)');

        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_company_owner_user_id'
    ) THEN
        ALTER TABLE b2b_company
            ADD CONSTRAINT fk_b2b_company_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_company_seller_id'
    ) THEN
        ALTER TABLE b2b_company
            ADD CONSTRAINT fk_b2b_company_seller_id FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_market_owner_user_id'
    ) THEN
        ALTER TABLE b2b_market
            ADD CONSTRAINT fk_b2b_market_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_company_id'
    ) THEN
        ALTER TABLE notification
            ADD CONSTRAINT fk_notification_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_market_id'
    ) THEN
        ALTER TABLE notification
            ADD CONSTRAINT fk_notification_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);

        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_subscription_company_id'
    ) THEN
        ALTER TABLE b2b_subscription
            ADD CONSTRAINT fk_b2b_subscription_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_subscription_market_id'
    ) THEN
        ALTER TABLE b2b_subscription
            ADD CONSTRAINT fk_b2b_subscription_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_subscription_activated_by_admin_id'
    ) THEN
        ALTER TABLE b2b_subscription
            ADD CONSTRAINT fk_b2b_subscription_activated_by_admin_id FOREIGN KEY (activated_by_admin_id) REFERENCES admin (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_watchlist_company_id'
    ) THEN
        ALTER TABLE b2b_watchlist
            ADD CONSTRAINT fk_b2b_watchlist_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_watchlist_market_id'
    ) THEN
        ALTER TABLE b2b_watchlist
            ADD CONSTRAINT fk_b2b_watchlist_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_watchlist_product_id'
    ) THEN
        ALTER TABLE b2b_watchlist
            ADD CONSTRAINT fk_b2b_watchlist_product_id FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_watchlist_category_id'
    ) THEN
        ALTER TABLE b2b_watchlist
            ADD CONSTRAINT fk_b2b_watchlist_category_id FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_watchlist_seller_id'
    ) THEN
        ALTER TABLE b2b_watchlist
            ADD CONSTRAINT fk_b2b_watchlist_seller_id FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_search_log_company_id'
    ) THEN
        ALTER TABLE b2b_search_log
            ADD CONSTRAINT fk_b2b_search_log_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_search_log_market_id'
    ) THEN
        ALTER TABLE b2b_search_log
            ADD CONSTRAINT fk_b2b_search_log_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_ads_request_company_id'
    ) THEN
        ALTER TABLE b2b_ads_request
            ADD CONSTRAINT fk_b2b_ads_request_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_ads_request_product_id'
    ) THEN
        ALTER TABLE b2b_ads_request
            ADD CONSTRAINT fk_b2b_ads_request_product_id FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_ads_request_category_id'
    ) THEN
        ALTER TABLE b2b_ads_request
            ADD CONSTRAINT fk_b2b_ads_request_category_id FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_ads_campaign_ads_request_id'
    ) THEN
        ALTER TABLE b2b_ads_campaign
            ADD CONSTRAINT fk_b2b_ads_campaign_ads_request_id FOREIGN KEY (ads_request_id) REFERENCES b2b_ads_request (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_sponsored_article_ads_request_id'
    ) THEN
        ALTER TABLE b2b_sponsored_article
            ADD CONSTRAINT fk_b2b_sponsored_article_ads_request_id FOREIGN KEY (ads_request_id) REFERENCES b2b_ads_request (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_report_company_id'
    ) THEN
        ALTER TABLE b2b_report
            ADD CONSTRAINT fk_b2b_report_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_report_market_id'
    ) THEN
        ALTER TABLE b2b_report
            ADD CONSTRAINT fk_b2b_report_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_scraping_request_company_id'
    ) THEN
        ALTER TABLE b2b_scraping_request
            ADD CONSTRAINT fk_b2b_scraping_request_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_scraping_request_market_id'
    ) THEN
        ALTER TABLE b2b_scraping_request
            ADD CONSTRAINT fk_b2b_scraping_request_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS b2b_scraping_request');
        $this->addSql('DROP TABLE IF EXISTS b2b_report');
        $this->addSql('DROP TABLE IF EXISTS b2b_sponsored_article');
        $this->addSql('DROP TABLE IF EXISTS b2b_ads_campaign');
        $this->addSql('DROP TABLE IF EXISTS b2b_ads_request');
        $this->addSql('DROP TABLE IF EXISTS b2b_search_log');
        $this->addSql('DROP TABLE IF EXISTS b2b_watchlist');
        $this->addSql('DROP TABLE IF EXISTS b2b_subscription');

        $this->addSql('DROP INDEX IF EXISTS idx_b2b_company_owner_user_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_company_seller_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_owner_user_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_subscription_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_subscription_market_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_ads_request_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_ads_request_product_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_ads_request_category_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_ads_campaign_request_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_sponsored_article_request_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_report_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_report_market_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_scraping_request_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_scraping_request_market_id');
        $this->addSql('DROP INDEX IF EXISTS idx_product_brand');
        $this->addSql('DROP INDEX IF EXISTS idx_product_category_id');
        $this->addSql('DROP INDEX IF EXISTS idx_product_listing_product_id');
        $this->addSql('DROP INDEX IF EXISTS idx_product_listing_seller_id');
        $this->addSql('DROP INDEX IF EXISTS idx_price_history_listing_id');
        $this->addSql('DROP INDEX IF EXISTS idx_review_listing_id');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_notification_market_id');

        $this->addSql("ALTER TABLE notification DROP CONSTRAINT IF EXISTS fk_notification_company_id");
        $this->addSql("ALTER TABLE notification DROP CONSTRAINT IF EXISTS fk_notification_market_id");
        $this->addSql("ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS fk_b2b_company_owner_user_id");
        $this->addSql("ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS fk_b2b_company_seller_id");
        $this->addSql("ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2b_market_owner_user_id");
        $this->addSql("ALTER TABLE b2b_subscription DROP CONSTRAINT IF EXISTS fk_b2b_subscription_company_id");
        $this->addSql("ALTER TABLE b2b_subscription DROP CONSTRAINT IF EXISTS fk_b2b_subscription_market_id");
        $this->addSql("ALTER TABLE b2b_subscription DROP CONSTRAINT IF EXISTS fk_b2b_subscription_activated_by_admin_id");
        $this->addSql("ALTER TABLE b2b_watchlist DROP CONSTRAINT IF EXISTS fk_b2b_watchlist_company_id");
        $this->addSql("ALTER TABLE b2b_watchlist DROP CONSTRAINT IF EXISTS fk_b2b_watchlist_market_id");
        $this->addSql("ALTER TABLE b2b_watchlist DROP CONSTRAINT IF EXISTS fk_b2b_watchlist_product_id");
        $this->addSql("ALTER TABLE b2b_watchlist DROP CONSTRAINT IF EXISTS fk_b2b_watchlist_category_id");
        $this->addSql("ALTER TABLE b2b_watchlist DROP CONSTRAINT IF EXISTS fk_b2b_watchlist_seller_id");
        $this->addSql("ALTER TABLE b2b_search_log DROP CONSTRAINT IF EXISTS fk_b2b_search_log_company_id");
        $this->addSql("ALTER TABLE b2b_search_log DROP CONSTRAINT IF EXISTS fk_b2b_search_log_market_id");
        $this->addSql("ALTER TABLE b2b_ads_request DROP CONSTRAINT IF EXISTS fk_b2b_ads_request_company_id");
        $this->addSql("ALTER TABLE b2b_ads_request DROP CONSTRAINT IF EXISTS fk_b2b_ads_request_product_id");
        $this->addSql("ALTER TABLE b2b_ads_request DROP CONSTRAINT IF EXISTS fk_b2b_ads_request_category_id");
        $this->addSql("ALTER TABLE b2b_ads_campaign DROP CONSTRAINT IF EXISTS fk_b2b_ads_campaign_ads_request_id");
        $this->addSql("ALTER TABLE b2b_sponsored_article DROP CONSTRAINT IF EXISTS fk_b2b_sponsored_article_ads_request_id");
        $this->addSql("ALTER TABLE b2b_report DROP CONSTRAINT IF EXISTS fk_b2b_report_company_id");
        $this->addSql("ALTER TABLE b2b_report DROP CONSTRAINT IF EXISTS fk_b2b_report_market_id");
        $this->addSql("ALTER TABLE b2b_scraping_request DROP CONSTRAINT IF EXISTS fk_b2b_scraping_request_company_id");
        $this->addSql("ALTER TABLE b2b_scraping_request DROP CONSTRAINT IF EXISTS fk_b2b_scraping_request_market_id");

        $this->addSql('ALTER TABLE product_listing DROP COLUMN IF EXISTS trust_score_breakdown');
        $this->addSql('ALTER TABLE notification DROP COLUMN IF EXISTS company_id');
        $this->addSql('ALTER TABLE notification DROP COLUMN IF EXISTS market_id');
        $this->addSql('ALTER TABLE notification DROP COLUMN IF EXISTS severity');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS owner_user_id');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS seller_id');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS usage_json');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS owner_user_id');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS usage_json');
        $this->addSql('ALTER TABLE product_listing DROP COLUMN IF EXISTS updated_at');
        $this->addSql('ALTER TABLE price_history ADD COLUMN IF NOT EXISTS seller INTEGER DEFAULT NULL');

        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF to_regclass('public.subscription_b2c') IS NOT NULL AND to_regclass('public.subscription') IS NULL THEN
        ALTER TABLE subscription_b2c RENAME TO subscription;
    END IF;
END $$;
SQL);
    }
}
