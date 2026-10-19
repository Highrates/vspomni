-- Доп. плашка (badge) на каждый основной слайд Hero
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "badgeTitle" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "badgeSubtitle" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "badgeImageUrl" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "badgeHref" TEXT;

-- Скопировать текущую глобальную плашку на слайды без своей
UPDATE "HeroSlide" AS h
SET
  "badgeTitle" = s.title,
  "badgeSubtitle" = s.subtitle,
  "badgeImageUrl" = s."imageUrl",
  "badgeHref" = s.href
FROM "HeroSecondaryBanner" AS s
WHERE s.id = 'default'
  AND h."badgeImageUrl" IS NULL;
