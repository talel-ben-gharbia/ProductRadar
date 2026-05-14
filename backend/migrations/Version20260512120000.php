<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Merge admin_activity_log into activity table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE activity ADD COLUMN admin_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD COLUMN action VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL');
        $this->addSql('ALTER TABLE activity ADD CONSTRAINT FK_ACTIVITY_ADMIN FOREIGN KEY (admin_id) REFERENCES admin (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX idx_activity_admin_id ON activity (admin_id)');

        // Migrate existing admin_activity_log rows into activity
        $this->addSql('INSERT INTO activity (actor_type, actor_id, verb, action, subject_type, subject_id, context, metadata, ip_address, created_at, admin_id)
                        SELECT \'ADMIN\', aal.admin_id, aal.action, aal.action, aal.entity_type, aal.entity_id, aal.before_json, aal.after_json, aal.ip_address, aal.created_at, aal.admin_id
                        FROM admin_activity_log aal');

        $this->addSql('DROP TABLE IF EXISTS admin_activity_log');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE admin_activity_log (
            id SERIAL PRIMARY KEY,
            admin_id INT DEFAULT NULL,
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT DEFAULT NULL,
            before_json JSON DEFAULT NULL,
            after_json JSON DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            ip_address VARCHAR(45) DEFAULT NULL
        )');
        $this->addSql('INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, before_json, after_json, created_at, ip_address)
                        SELECT admin_id, action, subject_type, subject_id, context, metadata, created_at, ip_address
                        FROM activity WHERE admin_id IS NOT NULL');
        $this->addSql('DELETE FROM activity WHERE admin_id IS NOT NULL');
        $this->addSql('ALTER TABLE activity DROP CONSTRAINT IF EXISTS FK_ACTIVITY_ADMIN');
        $this->addSql('DROP INDEX IF EXISTS idx_activity_admin_id');
        $this->addSql('ALTER TABLE activity DROP COLUMN admin_id');
        $this->addSql('ALTER TABLE activity DROP COLUMN action');
        $this->addSql('ALTER TABLE activity DROP COLUMN ip_address');
    }
}
