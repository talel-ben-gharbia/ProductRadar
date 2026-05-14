<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create activity table for system activity tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE activity (
                id SERIAL PRIMARY KEY,
                actor_type VARCHAR(50) NOT NULL,
                actor_id INT DEFAULT NULL,
                verb VARCHAR(50) NOT NULL,
                subject_type VARCHAR(50) NOT NULL,
                subject_id INT NOT NULL,
                context JSONB DEFAULT NULL,
                metadata JSONB DEFAULT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        ');
        $this->addSql('CREATE INDEX idx_activity_actor ON activity (actor_type, actor_id)');
        $this->addSql('CREATE INDEX idx_activity_subject ON activity (subject_type, subject_id)');
        $this->addSql('CREATE INDEX idx_activity_verb ON activity (verb)');
        $this->addSql('CREATE INDEX idx_activity_created_at ON activity (created_at DESC)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS activity');
    }
}
