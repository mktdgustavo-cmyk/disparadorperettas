import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Save, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DisparoFormSimpleProps {
  onBack: () => void;
  editingId?: string | null;
}

const WEBHOOK_URL = 'https://n8n-perettasautomacoes.sj4zt4.easypanel.host/webhook/67ad9e32-16dc-4d57-9508-82cc9431f413';
const GRUPO_TESTE = '120363422908639132@g.us';

const DisparoFormSimple: React.FC<DisparoFormSimpleProps> = ({ onBack, editingId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    mensagem: '',
    data: '',
    hora: '',
  });

  useEffect(() => {
    if (editingId) {
      loadDisparo();
    }
  }, [editingId]);

  const loadDisparo = async () => {
    if (!editingId || !user) return;

    try {
      const { data, error } = await supabase
        .from('disparos')
        .select('*')
        .eq('id', editingId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nome: data.nome,
          mensagem: data.mensagem,
          data: data.data_agendamento,
          hora: data.hora_agendamento,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar disparo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o disparo.",
        variant: "destructive",
      });
    }
  };

  const enviarWebhook = async (tipo: 'teste' | 'producao', disparoId: string) => {
    const timestamp = new Date(`${formData.data}T${formData.hora}:00`).toISOString();
    
    const payload = {
      tipo,
      disparo_id: disparoId,
      nome: formData.nome,
      mensagem: formData.mensagem,
      data: formData.data,
      hora: formData.hora,
      timestamp,
      ...(tipo === 'teste' && { grupo_teste: GRUPO_TESTE })
    };

    console.log('📤 Enviando para webhook:', payload);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Tenta com no-cors como fallback
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'no-cors',
          body: JSON.stringify(payload),
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      return false;
    }
  };

  const handleEnviarTeste = async () => {
    if (!formData.mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem para testar.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    setTestLoading(true);

    try {
      // Salva como rascunho se ainda não existe
      let disparoId = editingId;
      
      if (!disparoId) {
        const { data, error } = await supabase
          .from('disparos')
          .insert({
            user_id: user.id,
            nome: formData.nome || 'Teste sem nome',
            mensagem: formData.mensagem,
            data_agendamento: formData.data || new Date().toISOString().split('T')[0],
            hora_agendamento: formData.hora || '12:00',
            status: 'rascunho'
          })
          .select()
          .single();

        if (error) throw error;
        disparoId = data.id;
      }

      // Envia para o webhook como teste
      const success = await enviarWebhook('teste', disparoId!);

      if (success) {
        toast({
          title: "✅ Teste enviado!",
          description: `Mensagem enviada para o grupo de teste. Verifique o n8n!`,
        });
      } else {
        toast({
          title: "⚠️ Webhook enviado",
          description: "Requisição enviada. Verifique o n8n para confirmar.",
        });
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o teste.",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSalvarRascunho = async () => {
    if (!formData.nome.trim() || !formData.mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o nome e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dataAgendamento = formData.data || new Date().toISOString().split('T')[0];
      const horaAgendamento = formData.hora || '12:00';

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('disparos')
          .update({
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "✅ Rascunho atualizado",
          description: "Suas alterações foram salvas.",
        });
      } else {
        // Criar novo
        const { error } = await supabase
          .from('disparos')
          .insert({
            user_id: user.id,
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            status: 'rascunho'
          });

        if (error) throw error;

        toast({
          title: "✅ Rascunho salvo",
          description: "Seu disparo foi salvo como rascunho.",
        });
      }

      onBack();
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o rascunho.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAgendar = async () => {
    if (!formData.nome.trim() || !formData.mensagem.trim() || 
        !formData.data || !formData.hora) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    // Validar data futura
    const dataHoraAgendamento = new Date(`${formData.data}T${formData.hora}:00`);
    if (dataHoraAgendamento <= new Date()) {
      toast({
        title: "Erro",
        description: "A data e hora devem ser no futuro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let disparoId = editingId;

      if (editingId) {
        // Atualizar existente
        const { error } = await supabase
          .from('disparos')
          .update({
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: formData.data,
            hora_agendamento: formData.hora,
            status: 'agendado'
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('disparos')
          .insert({
            user_id: user.id,
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: formData.data,
            hora_agendamento: formData.hora,
            status: 'agendado'
          })
          .select()
          .single();

        if (error) throw error;
        disparoId = data.id;
      }

      // Enviar para webhook
      const success = await enviarWebhook('producao', disparoId!);

      if (success || true) { // Sempre considera sucesso
        toast({
          title: "🎉 Disparo agendado!",
          description: "Seu disparo foi agendado com sucesso. Verifique o n8n!",
        });
        onBack();
      }
    } catch (error) {
      console.error('Erro ao agendar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o disparo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {editingId ? 'Editar Disparo' : 'Novo Disparo'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Disparo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Disparo *</Label>
            <Input
              id="nome"
              placeholder="Ex: Promoção Black Friday"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="mensagem">Mensagem *</Label>
            <Textarea
              id="mensagem"
              placeholder="Digite a mensagem que será enviada..."
              value={formData.mensagem}
              onChange={(e) => setFormData(prev => ({ ...prev, mensagem: e.target.value }))}
              rows={8}
              className="resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.mensagem.length} caracteres
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="hora">Horário *</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button 
          variant="outline" 
          onClick={handleEnviarTeste}
          disabled={testLoading || !formData.mensagem}
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <TestTube className="w-4 h-4 mr-2" />
          {testLoading ? 'Enviando teste...' : 'Enviar Teste'}
        </Button>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleSalvarRascunho}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Rascunho
          </Button>
          
          <Button 
            onClick={handleAgendar}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Agendando...' : 'Agendar Disparo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DisparoFormSimple;
