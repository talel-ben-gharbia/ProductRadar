<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Unify SubscriptionB2C and B2BSubscription into polymorphic subscription table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE subscription (
            id SERIAL PRIMARY KEY,
            owner_type VARCHAR(20) NOT NULL,
            owner_id INT NOT NULL,
            plan_type VARCHAR(20) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT true,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP DEFAULT NULL,
            duration_months INT DEFAULT NULL,
            alerts_limit INT DEFAULT NULL,
            favorites_limit INT DEFAULT NULL,
            price_history_access INT DEFAULT NULL,
            activated_by_admin_id INT DEFAULT NULL,
            activated_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT NULL
        )');
        $this->addSql('CREATE INDEX idx_subscription_owner ON subscription (owner_type, owner_id)');
        $this->addSql('CREATE INDEX idx_subscription_active ON subscription (active)');

        $this->addSql("INSERT INTO subscription (owner_type, owner_id, plan_type, active, start_date, end_date, alerts_limit, favorites_limit, price_history_access, created_at)
            SELECT 'USER', client_id, plan_type, active, start_date, end_date, alerts_limit, favorites_limit, price_history_access, start_date
            FROM subscription_b2c WHERE client_id IS NOT NULL");

        $this->addSql("INSERT INTO subscription (owner_type, owner_id, plan_type, active, start_date, end_date, duration_months, activated_by_admin_id, activated_at, created_at, updated_at)
            SELECT 'COMPANY', company_id, plan_type, active, start_date, end_date, duration_months, activated_by_admin_id, activated_at, created_at, updated_at
            FROM b2b_subscription WHERE company_id IS NOT NULL");
        $this->addSql("INSERT INTO subscription (owner_type, owner_id, plan_type, active, start_date, end_date, duration_months, activated_by_admin_id, activated_at, created_at, updated_at)
            SELECT 'MARKET', market_id, plan_type, active, start_date, end_date, duration_months, activated_by_admin_id, activated_at, created_at, updated_at
            FROM b2b_subscription WHERE market_id IS NOT NULL");

        $this->addSql('DROP TABLE b2b_subscription');
        $this->addSql('DROP TABLE subscription_b2c');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE b2b_subscription (
            id SERIAL PRIMARY KEY,
            owner_type VARCHAR(20) NOT NULL,
            plan_type VARCHAR(20) NOT NULL,
            duration_months INT NOT NULL,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            active BOOLEAN NOT NULL,
            company_id INT DEFAULT NULL,
            market_id INT DEFAULT NULL,
            activated_by_admin_id INT DEFAULT NULL,
            created_at TIMESTAMP NOT NULL,
            activated_at TIMESTAMP DEFAULT NULL,
            updated_at TIMESTAMP DEFAULT NULL
        )');
        $this->addSql('CREATE INDEX idx_b2b_subscription_owner_type ON b2b_subscription (owner_type)');
        $this->addSql('CREATE INDEX idx_b2b_subscription_active ON b2b_subscription (active)');

        $this->addSql("INSERT INTO b2b_subscription (owner_type, plan_type, duration_months, start_date, end_date, active, company_id, activated_by_admin_id, created_at, activated_at, updated_at)
            SELECT owner_type, plan_type, COALESCE(duration_months, 12), start_date, COALESCE(end_date, start_date + INTERVAL '12 months'), active,
                   CASE WHEN owner_type = 'COMPANY' THEN owner_id ELSE NULL END,
                   activated_by_admin_id, created_at, activated_at, updated_at
            FROM subscription WHERE owner_type IN ('COMPANY', 'MARKET')");

        $this->addSql('CREATE TABLE subscription_b2c (
            id SERIAL PRIMARY KEY,
            plan_type VARCHAR(255) NOT NULL,
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            active BOOLEAN NOT NULL,
            alerts_limit INT NOT NULL,
            favorites_limit INT NOT NULL,
            price_history_access INT NOT NULL,
            client_id INT DEFAULT NULL
        )');

        $this->addSql("INSERT INTO subscription_b2c (plan_type, start_date, end_date, active, alerts_limit, favorites_limit, price_history_access, client_id)
            SELECT plan_type, start_date, COALESCE(end_date, start_date + INTERVAL '100 years'), active,
                   COALESCE(alerts_limit, 0), COALESCE(favorites_limit, 0), COALESCE(price_history_access, 0), owner_id
            FROM subscription WHERE owner_type = 'USER'");

        $this->addSql('DROP TABLE subscription');
    }
}
