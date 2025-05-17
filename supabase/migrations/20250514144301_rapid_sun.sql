/*
  # Add type column to units table

  1. Changes
    - Add type column to units table to store the unit type (e.g., "4", "LOCAL", "COCHERA")
*/

ALTER TABLE units ADD COLUMN IF NOT EXISTS type TEXT;