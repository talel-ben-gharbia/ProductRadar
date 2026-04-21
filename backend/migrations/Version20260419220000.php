<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add tables for Module 2 enhancements: ReviewResponse, ModerationRule, NotificationLog
 */
final class Version20260419220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add review_response, moderation_rule, and notification_log tables for Module 2 enhancements';
    }

    public function up(Schema $schema): void
    {
        // review_response table
        $this->addSql('CREATE TABLE review_response (
            id SERIAL PRIMARY KEY,
            review_id INT NOT NULL,
            seller_id INT,
            response_text TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'PENDING\',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            CONSTRAINT fk_review_response_review FOREIGN KEY (review_id) REFERENCES review (id) ON DELETE CASCADE,
            CONSTRAINT fk_review_response_seller FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL
        )');
        $this->addSql('CREATE INDEX idx_review_response_review ON review_response (review_id)');
        $this->addSql('CREATE INDEX idx_review_response_seller ON review_response (seller_id)');
        $this->addSql('CREATE INDEX idx_review_response_status ON review_response (status)');

        // moderation_rule table
        $this->addSql('CREATE TABLE moderation_rule (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            rule_type VARCHAR(100) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            config JSON NOT NULL DEFAULT \'{}\',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )');
        $this->addSql('CREATE INDEX idx_moderation_rule_is_active ON moderation_rule (is_active)');
        $this->addSql('CREATE INDEX idx_moderation_rule_type ON moderation_rule (rule_type)');

        // notification_log table
        $this->addSql('CREATE TABLE notification_log (
            id SERIAL PRIMARY KEY,
            notification_type VARCHAR(100) NOT NULL,
            recipient_id INT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            sent_at TIMESTAMP NOT NULL,
            read_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES "user" (id) ON DELETE CASCADE
        )');
        $this->addSql('CREATE INDEX idx_notification_recipient ON notification_log (recipient_id)');
        $this->addSql('CREATE INDEX idx_notification_read_at ON notification_log (read_at)');
        $this->addSql('CREATE INDEX idx_notification_sent_at ON notification_log (sent_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS review_response CASCADE');
        $this->addSql('DROP TABLE IF EXISTS moderation_rule CASCADE');
        $this->addSql('DROP TABLE IF EXISTS notification_log CASCADE');
    }
}
