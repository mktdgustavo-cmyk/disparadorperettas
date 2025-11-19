import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Save, TestTube, Upload, X, Image, File } from 'lucide-react';
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    mensagem: '',
    data: '',
    hora: '',
    mediaUrl: '', // URL da mídia após upload
    mediaType: '', // image, video, audio, document
    mediaCaption: '', // Legenda da mídia
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

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
          mediaUrl: data.media_url || '',
          mediaType: data.media_type || '',
          mediaCaption: data.media_caption || '',
        });

        if (data.media_url) {
          setMediaPreview(data.media_url);
        }
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

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 16MB.",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);

    // Detectar tipo de mídia
    let mediaType = '';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else mediaType = 'document';

    setFormData(prev => ({ ...prev, mediaType }));

    // Preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview('');
    }
  };

  const uploadMediaToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('media-disparos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('media-disparos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setFormData(prev => ({
      ...prev,
      mediaUrl: '',
      mediaType: '',
      mediaCaption: '',
    }));
  };

  const enviarWebhook = async (tipo: 'teste' | 'producao', disparoId: string) => {
    const timestamp = new Date(`${formData.data}T${formData.hora}:00`).toISOString();
    
    const payload: any = {
      tipo,
      disparo_id: disparoId,
      nome: formData.nome,
      mensagem: formData.mensagem,
      data: formData.data,
      hora: formData.hora,
      timestamp,
      tem_media: !!formData.mediaUrl, // ✅ Flag para n8n decidir o caminho
      ...(tipo === 'teste' && { grupo_teste: GRUPO_TESTE })
    };

    // ✅ Adicionar dados de mídia se existir
    if (formData.mediaUrl) {
      payload.media = {
        url: formData.mediaUrl,
        type: formData.mediaType,
        caption: formData.mediaCaption || formData.mensagem,
      };
    }

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
      // Upload da mídia se houver
      let mediaUrl = formData.mediaUrl;
      if (mediaFile && !mediaUrl) {
        setUploadingMedia(true);
        mediaUrl = await uploadMediaToSupabase(mediaFile);
        setFormData(prev => ({ ...prev, mediaUrl }));
        setUploadingMedia(false);
      }

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
            status: 'rascunho',
            media_url: mediaUrl || null,
            media_type: formData.mediaType || null,
            media_caption: formData.mediaCaption || null,
          })
          .select()
          .single();

        if (error) throw error;
        disparoId = data.id;
      }

      // Atualizar formData com a URL da mídia
      if (mediaUrl) {
        setFormData(prev => ({ ...prev, mediaUrl }));
      }

      // Envia para o webhook como teste
      const success = await enviarWebhook('teste', disparoId!);

      if (success) {
        toast({
          title: "✅ Teste enviado!",
          description: `Mensagem${mediaUrl ? ' com mídia' : ''} enviada para o grupo de teste.`,
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
      setUploadingMedia(false);
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
      // Upload da mídia se houver
      let mediaUrl = formData.mediaUrl;
      if (mediaFile && !mediaUrl) {
        setUploadingMedia(true);
        mediaUrl = await uploadMediaToSupabase(mediaFile);
        setUploadingMedia(false);
      }

      const dataAgendamento = formData.data || new Date().toISOString().split('T')[0];
      const horaAgendamento = formData.hora || '12:00';

      if (editingId) {
        const { error } = await supabase
          .from('disparos')
          .update({
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            media_url: mediaUrl || null,
            media_type: formData.mediaType || null,
            media_caption: formData.mediaCaption || null,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "✅ Rascunho atualizado",
          description: "Suas alterações foram salvas.",
        });
      } else {
        const { error } = await supabase
          .from('disparos')
          .insert({
            user_id: user.id,
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            status: 'rascunho',
            media_url: mediaUrl || null,
            media_type: formData.mediaType || null,
            media_caption: formData.mediaCaption || null,
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
      setUploadingMedia(false);
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
      // Upload da mídia se houver
      let mediaUrl = formData.mediaUrl;
      if (mediaFile && !mediaUrl) {
        setUploadingMedia(true);
        mediaUrl = await uploadMediaToSupabase(mediaFile);
        setUploadingMedia(false);
      }

      let disparoId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('disparos')
          .update({
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: formData.data,
            hora_agendamento: formData.hora,
            status: 'agendado',
            media_url: mediaUrl || null,
            media_type: formData.mediaType || null,
            media_caption: formData.mediaCaption || null,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('disparos')
          .insert({
            user_id: user.id,
            nome: formData.nome,
            mensagem: formData.mensagem,
            data_agendamento: formData.data,
            hora_agendamento: formData.hora,
            status: 'agendado',
            media_url: mediaUrl || null,
            media_type: formData.mediaType || null,
            media_caption: formData.mediaCaption || null,
          })
          .select()
          .single();

        if (error) throw error;
        disparoId = data.id;
      }

      // Atualizar formData com a URL da mídia
      if (mediaUrl) {
        setFormData(prev => ({ ...prev, mediaUrl }));
      }

      await enviarWebhook('producao', disparoId!);

      toast({
        title: "🎉 Disparo agendado!",
        description: `Seu disparo${mediaUrl ? ' com mídia' : ''} foi agendado com sucesso!`,
      });
      onBack();
    } catch (error) {
      console.error('Erro ao agendar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o disparo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingMedia(false);
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

          {/* ✅ NOVO: Seção de Mídia */}
          <div className="border-t pt-4">
            <Label>Mídia (Opcional)</Label>
            <p className="text-sm text-gray-500 mb-3">
              Adicione uma imagem, vídeo, áudio ou documento à sua mensagem
            </p>

            {!mediaFile && !mediaPreview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="media-upload"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  onChange={handleMediaSelect}
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Clique para selecionar um arquivo
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Máximo 16MB • Imagem, vídeo, áudio ou documento
                  </p>
                </label>
              </div>
            )}

            {(mediaFile || mediaPreview) && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {mediaPreview && formData.mediaType === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-blue-100 rounded flex items-center justify-center">
                        {formData.mediaType === 'image' && <Image className="w-8 h-8 text-blue-600" />}
                        {formData.mediaType !== 'image' && <File className="w-8 h-8 text-blue-600" />}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {mediaFile?.name || 'Mídia carregada'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {formData.mediaType || 'arquivo'}
                        {mediaFile && ` • ${(mediaFile.size / 1024).toFixed(1)}KB`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveMedia}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Legenda da mídia */}
                {formData.mediaType && (
                  <div className="mt-3">
                    <Label htmlFor="mediaCaption" className="text-xs">
                      Legenda (opcional)
                    </Label>
                    <Input
                      id="mediaCaption"
                      placeholder="Adicione uma legenda para a mídia..."
                      value={formData.mediaCaption}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediaCaption: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}
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
          disabled={testLoading || uploadingMedia || !formData.mensagem}
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <TestTube className="w-4 h-4 mr-2" />
          {uploadingMedia ? 'Enviando mídia...' : testLoading ? 'Enviando teste...' : 'Enviar Teste'}
        </Button>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleSalvarRascunho}
            disabled={loading || uploadingMedia}
          >
            <Save className="w-4 h-4 mr-2" />
            {uploadingMedia ? 'Salvando mídia...' : 'Salvar Rascunho'}
          </Button>
          
          <Button 
            onClick={handleAgendar}
            disabled={loading || uploadingMedia}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {uploadingMedia ? 'Preparando mídia...' : loading ? 'Agendando...' : 'Agendar Disparo'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DisparoFormSimple;
