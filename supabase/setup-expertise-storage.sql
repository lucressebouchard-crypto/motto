-- Créer les buckets pour les expertises
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Bucket pour les photos/vidéos d'expertise
INSERT INTO storage.buckets (id, name, public)
VALUES ('expertise-media', 'expertise-media', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les rapports PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('expertise-reports', 'expertise-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques pour expertise-media
CREATE POLICY IF NOT EXISTS "Mechanics can upload expertise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expertise-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Public can view expertise media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expertise-media');

CREATE POLICY IF NOT EXISTS "Mechanics can delete their expertise media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expertise-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politiques pour expertise-reports
CREATE POLICY IF NOT EXISTS "Mechanics can upload expertise reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expertise-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Buyers can view their expertise reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expertise-reports' AND
  -- L'acheteur peut voir les PDFs qui lui sont destinés (via la table expertises)
  EXISTS (
    SELECT 1 FROM expertises
    WHERE expertises.pdf_url LIKE '%' || storage.objects.name
    AND expertises.buyer_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Mechanics can view their expertise reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expertise-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Public can view expertise reports (read-only)"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expertise-reports');

CREATE POLICY IF NOT EXISTS "Mechanics can delete their expertise reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expertise-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

