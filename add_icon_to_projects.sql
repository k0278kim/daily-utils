-- Add icon column to projects table
alter table projects 
add column icon text default null;
