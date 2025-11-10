-- Tabela de disparos simplificada
CREATE TABLE IF NOT EXISTS public.disparos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    data_agendamento DATE NOT NULL,
    hora_agendamento TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'enviado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_disparos_user_id ON public.disparos(user_id);
CREATE INDEX idx_disparos_status ON public.disparos(status);
CREATE INDEX idx_disparos_data ON public.disparos(data_agendamento, hora_agendamento);

-- RLS (Row Level Security)
ALTER TABLE public.disparos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios disparos"
    ON public.disparos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios disparos"
    ON public.disparos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios disparos"
    ON public.disparos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios disparos"
    ON public.disparos FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_disparos_updated_at
    BEFORE UPDATE ON public.disparos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
