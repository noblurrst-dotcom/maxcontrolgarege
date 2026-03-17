import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Edit3, Trash2, Save, X, Loader2, Settings, Camera, ImageIcon, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Servico } from '../types'

export default function Servicos() {
  const { user } = useAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoPadrao, setPrecoPadrao] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoUrlExistente, setFotoUrlExistente] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) carregarServicos()
  }, [user])

  const carregarServicos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', user!.id)
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
    } finally {
      setLoading(false)
    }
  }

  const limparForm = () => {
    setNome('')
    setDescricao('')
    setPrecoPadrao('')
    setFoto(null)
    setFotoPreview(null)
    setFotoUrlExistente(null)
    setEditando(null)
    setShowForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const iniciarEdicao = (servico: Servico) => {
    setNome(servico.nome)
    setDescricao(servico.descricao || '')
    setPrecoPadrao(servico.preco_padrao > 0 ? servico.preco_padrao.toString() : '')
    setFoto(null)
    setFotoPreview(null)
    setFotoUrlExistente(servico.foto_url || null)
    setEditando(servico.id)
    setShowForm(true)
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 5MB')
      return
    }
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const uploadFoto = async (file: File): Promise<string | null> => {
    if (!user) return null
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('servicos-fotos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      console.error('Erro upload (servicos-fotos):', {
        message: error.message,
        name: (error as any).name,
        statusCode: (error as any).statusCode,
        error,
      })
      toast.error(error.message || 'Erro ao enviar foto (verifique permissões do Storage)')
      return null
    }

    const { data } = supabase.storage.from('servicos-fotos').getPublicUrl(path)
    return data.publicUrl
  }

  const removerFotoStorage = async (url: string) => {
    try {
      const path = url.split('/servicos-fotos/')[1]
      if (path) {
        await supabase.storage.from('servicos-fotos').remove([path])
      }
    } catch (err) {
      console.error('Erro ao remover foto:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nome.trim()) {
      toast.error('Informe o nome do serviço')
      return
    }

    setSalvando(true)
    try {
      let foto_url = fotoUrlExistente

      if (foto) {
        if (fotoUrlExistente) {
          await removerFotoStorage(fotoUrlExistente)
        }
        foto_url = await uploadFoto(foto)
        if (!foto_url && foto) {
          toast.error('Erro ao enviar foto. Tente novamente.')
          setSalvando(false)
          return
        }
      }

      const dados = {
        user_id: user.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco_padrao: parseFloat(precoPadrao) || 0,
        foto_url,
      }

      if (editando) {
        const { error } = await supabase
          .from('servicos')
          .update(dados)
          .eq('id', editando)
        if (error) throw error
        toast.success('Serviço atualizado!')
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert(dados)
        if (error) throw error
        toast.success('Serviço criado!')
      }

      limparForm()
      carregarServicos()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar serviço')
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (servico: Servico) => {
    if (!confirm(`Excluir o serviço "${servico.nome}"?`)) return
    try {
      if (servico.foto_url) {
        await removerFotoStorage(servico.foto_url)
      }
      const { error } = await supabase.from('servicos').delete().eq('id', servico.id)
      if (error) throw error
      toast.success('Serviço excluído')
      setServicos((prev) => prev.filter((s) => s.id !== servico.id))
    } catch {
      toast.error('Erro ao excluir serviço')
    }
  }

  const fotoAtual = fotoPreview || fotoUrlExistente

  return (
    <div className="pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Serviços</h1>
          <p className="text-sm text-gray-500 mt-1">
            {servicos.length} serviço{servicos.length !== 1 ? 's' : ''} cadastrado{servicos.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <Plus size={18} />
            Novo Serviço
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg text-gray-800">
              {editando ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>
            <button
              type="button"
              onClick={limparForm}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Upload de Foto */}
          <div className="flex flex-col items-center mb-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer overflow-hidden transition-colors group bg-gray-50"
            >
              {fotoAtual ? (
                <>
                  <img
                    src={fotoAtual}
                    alt="Foto do serviço"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-blue-500 transition-colors">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-xs font-medium">Adicionar foto</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
            <p className="text-xs text-gray-400 mt-2">JPG, PNG — máx. 5MB</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Nome do serviço *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Polimento cristalizado"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoPadrao}
                  onChange={(e) => setPrecoPadrao(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição do serviço..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={limparForm}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              {salvando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {editando ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Serviços */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : servicos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold text-lg">Nenhum serviço cadastrado</p>
          <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
            Cadastre seus serviços com foto e valor para montar seu menu profissional
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus size={18} />
            Cadastrar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicos.map((servico) => (
            <div
              key={servico.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Foto do Serviço */}
              <div className="relative h-40 bg-gradient-to-br from-blue-50 to-indigo-100">
                {servico.foto_url ? (
                  <img
                    src={servico.foto_url}
                    alt={servico.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-blue-200" />
                  </div>
                )}

                {/* Ações no hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => iniciarEdicao(servico)}
                    className="p-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg hover:bg-white transition-colors shadow-sm"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(servico)}
                    className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg hover:bg-white transition-colors shadow-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Badge de valor */}
                {servico.preco_padrao > 0 && (
                  <div className="absolute bottom-2 right-2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1">
                    <DollarSign size={14} />
                    R$ {servico.preco_padrao.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-lg">{servico.nome}</h3>
                {servico.descricao && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{servico.descricao}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
