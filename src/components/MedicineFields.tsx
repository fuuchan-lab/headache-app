import { TABLET_OPTIONS, type Medicine } from '../settings.ts'

interface Props {
  medicines: Medicine[]
  name: string
  tablets: number
  onName: (name: string) => void
  onTablets: (tablets: number) => void
}

const OTHER = '__other__'

/** 薬の選択（設定した薬 or 自由入力）と錠数のドロップダウン。服薬の記録・編集で共通 */
export function MedicineFields({ medicines, name, tablets, onName, onTablets }: Props) {
  const isCustom = !medicines.some((m) => m.name === name)

  return (
    <>
      <div className="two">
        <label className="field grow">
          薬
          <select
            value={isCustom ? OTHER : name}
            onChange={(e) => onName(e.target.value === OTHER ? '' : e.target.value)}
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
            <option value={OTHER}>その他（入力する）</option>
          </select>
        </label>
        <label className="field">
          錠数
          <select value={tablets} onChange={(e) => onTablets(Number(e.target.value))}>
            {TABLET_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}錠
              </option>
            ))}
          </select>
        </label>
      </div>
      {isCustom && (
        <input
          type="text"
          placeholder="薬の名前を入力"
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      )}
    </>
  )
}
