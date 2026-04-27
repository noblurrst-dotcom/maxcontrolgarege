interface Ponto { x: number; y: number }

interface DiagramaDefeitosProps {
  marcacoes: Ponto[]
  onChange: (marcacoes: Ponto[]) => void
}

export default function DiagramaDefeitos({ marcacoes, onChange }: DiagramaDefeitosProps) {
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    const raio = 0.04
    const existente = marcacoes.findIndex(
      p => Math.abs(p.x - x) < raio && Math.abs(p.y - y) < raio
    )
    if (existente >= 0) {
      onChange(marcacoes.filter((_, i) => i !== existente))
    } else {
      onChange([...marcacoes, { x, y }])
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <p className="text-[10px] text-gray-400 text-center py-1">
        Clique no diagrama para marcar defeitos • Clique novamente para remover
      </p>
      <svg
        viewBox="0 0 300 160"
        className="w-full cursor-crosshair"
        onClick={handleClick}
      >
        <rect width="300" height="160" fill="#f9f9f9" />

        <rect x="110" y="15" width="80" height="130" rx="12" ry="12"
          fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />

        <rect x="120" y="18" width="60" height="28" rx="4" ry="4"
          fill="#c8dff0" stroke="#888" strokeWidth="1" />

        <rect x="120" y="114" width="60" height="28" rx="4" ry="4"
          fill="#c8dff0" stroke="#888" strokeWidth="1" />

        <rect x="125" y="50" width="50" height="60" rx="2" ry="2"
          fill="#d5d5d5" stroke="#999" strokeWidth="0.5" />

        <ellipse cx="100" cy="40" rx="10" ry="13" fill="#555" />
        <ellipse cx="200" cy="40" rx="10" ry="13" fill="#555" />
        <ellipse cx="100" cy="120" rx="10" ry="13" fill="#555" />
        <ellipse cx="200" cy="120" rx="10" ry="13" fill="#555" />

        <ellipse cx="100" cy="40" rx="6" ry="9" fill="#888" />
        <ellipse cx="200" cy="40" rx="6" ry="9" fill="#888" />
        <ellipse cx="100" cy="120" rx="6" ry="9" fill="#888" />
        <ellipse cx="200" cy="120" rx="6" ry="9" fill="#888" />

        <text x="150" y="9" textAnchor="middle" fontSize="8" fill="#999">FRENTE</text>
        <text x="150" y="158" textAnchor="middle" fontSize="8" fill="#999">TRASEIRA</text>
        <text x="8" y="83" textAnchor="middle" fontSize="7" fill="#999"
          transform="rotate(-90, 8, 83)">ESQUERDA</text>
        <text x="292" y="83" textAnchor="middle" fontSize="7" fill="#999"
          transform="rotate(90, 292, 83)">DIREITA</text>

        {marcacoes.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x * 300}
              cy={p.y * 160}
              r="6"
              fill="rgba(239,68,68,0.3)"
              stroke="#ef4444"
              strokeWidth="1.5"
            />
            <text
              x={p.x * 300}
              y={p.y * 160 + 4}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#ef4444"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      {marcacoes.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">
            {marcacoes.length} defeito(s) marcado(s)
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-danger-400 hover:text-danger-600 font-medium"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  )
}
