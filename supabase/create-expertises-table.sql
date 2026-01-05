-- Table pour stocker les expertises
CREATE TABLE IF NOT EXISTS expertises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER,
  vehicle_plate TEXT,
  health_score INTEGER NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  inspection_data JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_expertises_mechanic_id ON expertises(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_expertises_buyer_id ON expertises(buyer_id);
CREATE INDEX IF NOT EXISTS idx_expertises_created_at ON expertises(created_at DESC);

-- RLS Policies
ALTER TABLE expertises ENABLE ROW LEVEL SECURITY;

-- Les mécaniciens peuvent voir leurs propres expertises
CREATE POLICY "Mechanics can view their own expertises"
  ON expertises FOR SELECT
  USING (auth.uid() = mechanic_id);

-- Les mécaniciens peuvent créer des expertises
CREATE POLICY "Mechanics can create expertises"
  ON expertises FOR INSERT
  WITH CHECK (auth.uid() = mechanic_id);

-- Les acheteurs peuvent voir les expertises qui leur sont destinées
CREATE POLICY "Buyers can view their expertises"
  ON expertises FOR SELECT
  USING (auth.uid() = buyer_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_expertises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expertises_updated_at
  BEFORE UPDATE ON expertises
  FOR EACH ROW
  EXECUTE FUNCTION update_expertises_updated_at();

-- Activer Realtime pour les expertises
ALTER PUBLICATION supabase_realtime ADD TABLE expertises;

