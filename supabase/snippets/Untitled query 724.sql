DELETE FROM contract_messages WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM milestones WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM disputes WHERE contract_id IN (SELECT id FROM contracts);
DELETE FROM contracts;