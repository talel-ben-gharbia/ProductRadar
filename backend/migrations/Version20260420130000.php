<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260420130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop unused review_response, moderation_rule, and notification_log tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS review_response CASCADE');
        $this->addSql('DROP TABLE IF EXISTS moderation_rule CASCADE');
        $this->addSql('DROP TABLE IF EXISTS notification_log CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE review_response (
            id SERIAL PRIMARY KEY,
            review_id INT NOT NULL,
            seller_id INT,
            response_text TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'PENDING\',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )');
        $this->addSql('CREATE TABLE moderation_rule (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            rule_type VARCHAR(100) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            config JSON NOT NULL DEFAULT \'{}\',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )');
        $this->addSql('CREATE TABLE notification_log (
            id SERIAL PRIMARY KEY,
            notification_type VARCHAR(100) NOT NULL,
            recipient_id INT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            sent_at TIMESTAMP NOT NULL,
            read_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
    }
}
