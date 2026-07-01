-- Fix nav label: "Hải sản tươi" → "Hải sản tươi sống" to match the category page title
UPDATE cms_navigation_items
SET label = 'Hải sản tươi sống'
WHERE href = '/categories/fresh-seafood'
  AND label = 'Hải sản tươi';
