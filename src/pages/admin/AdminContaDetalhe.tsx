import { UserCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'

export default function AdminContaDetalhe() {
  const { userId } = useParams()
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <UserCircle size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Detalhe da Conta</h2>
        <p className="text-sm text-gray-400 mt-1">ID: {userId}</p>
        <p className="text-sm text-gray-400 mt-1">Em construção — entrega 2.2</p>
      </div>
    </div>
  )
}
