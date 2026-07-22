-- 010_fix_tasks_assigned_to_fk.sql
-- Fix: assigned_to debe referenciar members(id), no profiles(id)
-- Porque las tareas se asignan a socios (members), no a usuarios de auth

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;
