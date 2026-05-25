interface Props {
  pros: string[]
  cons: string[]
}

export default function ProConList({ pros, cons }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Pros */}
      <div className="bg-green-50 rounded-xl p-5">
        <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-4 text-sm uppercase tracking-wide">
          <span className="text-lg">✅</span> PROS
        </h3>
        <ul className="space-y-3">
          {pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 w-4 h-4 rounded-full bg-green-200 flex items-center justify-center shrink-0">
                <span className="text-green-700 text-[10px] font-bold">{i + 1}</span>
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{pro}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons */}
      <div className="bg-red-50 rounded-xl p-5">
        <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-4 text-sm uppercase tracking-wide">
          <span className="text-lg">❌</span> CONS
        </h3>
        <ul className="space-y-3">
          {cons.map((con, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 w-4 h-4 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                <span className="text-red-700 text-[10px] font-bold">{i + 1}</span>
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{con}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
