import { BarChart2 } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <BarChart2 size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Dashboard Superadmin</h2>
        <p className="text-sm text-gray-400 mt-1">Em construção — entrega 1.3</p>
      </div>
    </div>
  )
}
