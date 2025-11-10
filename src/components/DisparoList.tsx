import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Calendar, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Disparo {
  id: string;
  nome: string;
  mensagem: string;
  data_agendamento: string;
  hora_agendamento: string;
  status: 'rascunho' | 'agendado' | 'enviado';
  created_at: string;
}

interface DisparoListProps {
  onCreateNew: () => void;
  onEdit: (id: string) => void;
}

const DisparoList: React.FC<DisparoListProps> = ({ onCreateNew, onEdit }) => {
  const { user } = useAuth();
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDisparos();
    }
  }, [user]);

  const loadDisparos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('disparos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDisparos(data || []);
    } catch (error) {
      console.error('Erro ao carregar disparos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os disparos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este disparo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('disparos')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "✅ Disparo excluído",
        description: "O disparo foi removido com sucesso.",
      });

      loadDisparos();
    } catch (error) {
      console.error('Erro ao excluir disparo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o disparo.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800' },
      agendado: { label: 'Agendado', className: 'bg-blue-100 text-blue-800' },
      enviado: { label: 'Enviado', className: 'bg-green-100 text-green-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rascunho;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando disparos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Disparos</h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus disparos programados de mensagens
          </p>
        </div>
        <Button 
          onClick={onCreateNew}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Disparo
        </Button>
      </div>

      {disparos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum disparo criado
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Comece criando seu primeiro disparo de mensagens
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Disparo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {disparos.map((disparo) => (
            <Card key={disparo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {disparo.nome}
                      </h3>
                      {getStatusBadge(disparo.status)}
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {disparo.mensagem}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(disparo.data_agendamento, disparo.hora_agendamento)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          Criado em {new Date(disparo.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {disparo.status !== 'enviado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(disparo.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(disparo.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {disparos.length > 0 && (
        <div className="flex justify-center pt-4">
          <div className="text-sm text-gray-500">
            Total de {disparos.length} disparo{disparos.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisparoList;
